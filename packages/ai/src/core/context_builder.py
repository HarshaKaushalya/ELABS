"""
context_builder.py
──────────────────
Builds a rich, role-aware database context string that is injected into
the LLM system prompt at every request. This gives the AI accurate,
real-time knowledge of the lab's state without any hallucination.
"""

from __future__ import annotations
import logging
from datetime import datetime, date
from ..core.db import execute_query

logger = logging.getLogger(__name__)


# ─── Role Resolution ──────────────────────────────────────────────────────────

def _get_user_info(email: str) -> dict | None:
    rows = execute_query("""
        SELECT u.id, u.full_name, u.email, u.is_active,
               GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ') AS roles,
               sp.group_code, sp.index_no, sp.year_of_study
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.email = :email
        GROUP BY u.id
        LIMIT 1
    """, {"email": email})
    return rows[0] if rows else None


def _is_staff(roles_str: str | None) -> bool:
    if not roles_str:
        return False
    staff_roles = {"SYSTEM_ADMIN", "MODULE_COORDINATOR", "LECTURER", "LAB_TECHNICIAN"}
    return bool(staff_roles.intersection(set(roles_str.split(", "))))


# ─── Section Builders ─────────────────────────────────────────────────────────

def _fmt_date(val) -> str:
    if val is None:
        return "No due date"
    if isinstance(val, (datetime, date)):
        return val.strftime("%b %d, %Y")
    return str(val)


def _build_inventory_summary() -> str:
    rows = execute_query("""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status='AVAILABLE' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN status='BORROWED' THEN 1 ELSE 0 END) AS borrowed,
            SUM(CASE WHEN status='MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance,
            SUM(CASE WHEN status='OUT_OF_SERVICE' THEN 1 ELSE 0 END) AS out_of_service
        FROM inventory_items
    """, {})
    if not rows:
        return "Inventory data unavailable."
    r = rows[0]
    return (
        f"INVENTORY SUMMARY: {r['total']} total items | "
        f"{r['available']} available | {r['borrowed']} borrowed | "
        f"{r['maintenance']} under maintenance | {r['out_of_service']} out of service"
    )


def _build_lab_summary() -> str:
    rows = execute_query("""
        SELECT l.name, l.location,
               COUNT(i.id) AS item_count,
               SUM(CASE WHEN i.status='AVAILABLE' THEN 1 ELSE 0 END) AS available
        FROM labs l
        LEFT JOIN inventory_items i ON i.lab_id = l.id
        GROUP BY l.id
        ORDER BY l.name
    """, {})
    if not rows:
        return "Lab data unavailable."
    lines = ["LABS:"]
    for r in rows:
        lines.append(f"  - {r['name']} ({r['location'] or 'No location'}): {r['item_count']} items, {r['available'] or 0} available")
    return "\n".join(lines)


def _build_overdue_summary() -> str:
    rows = execute_query("""
        SELECT COUNT(*) AS cnt,
               COALESCE(MAX(TIMESTAMPDIFF(DAY, bt.due_at, NOW())), 0) AS max_days
        FROM borrow_transactions bt
        WHERE bt.status = 'BORROWED'
          AND bt.due_at IS NOT NULL
          AND bt.due_at < NOW()
    """, {})
    if not rows or rows[0]["cnt"] == 0:
        return "OVERDUE: None currently."
    r = rows[0]
    return f"OVERDUE: {r['cnt']} transaction(s), worst case {r['max_days']} day(s) overdue."


def _build_overdue_detail() -> str:
    """Admin: full overdue list."""
    rows = execute_query("""
        SELECT u.full_name, u.email,
               bt.due_at, bt.purpose,
               l.name AS lab_name,
               TIMESTAMPDIFF(DAY, bt.due_at, NOW()) AS days_overdue,
               GROUP_CONCAT(i.name ORDER BY i.name SEPARATOR ', ') AS items
        FROM borrow_transactions bt
        JOIN labs l ON l.id = bt.lab_id
        LEFT JOIN users u ON u.id = bt.borrower_user_id
        JOIN borrow_transaction_items bti ON bti.transaction_id = bt.id
        JOIN inventory_items i ON i.id = bti.item_id
        WHERE bt.status = 'BORROWED'
          AND bt.due_at IS NOT NULL
          AND bt.due_at < NOW()
        GROUP BY bt.id
        ORDER BY bt.due_at ASC
        LIMIT 15
    """, {})
    if not rows:
        return "OVERDUE DETAIL: None."
    lines = [f"OVERDUE TRANSACTIONS ({len(rows)}):"]
    for r in rows:
        lines.append(
            f"  - {r['full_name'] or 'Unknown'} ({r['email'] or 'N/A'}) | "
            f"{r['days_overdue']}d overdue | Items: {r['items']} | Lab: {r['lab_name']}"
        )
    return "\n".join(lines)


def _build_user_borrows(user_id: int, full_name: str) -> str:
    rows = execute_query("""
        SELECT i.name AS item_name, i.elabs_tag,
               bt.due_at, bt.purpose, l.name AS lab_name,
               CASE WHEN bt.due_at < NOW() THEN 1 ELSE 0 END AS is_overdue
        FROM borrow_transactions bt
        JOIN labs l ON l.id = bt.lab_id
        JOIN borrow_transaction_items bti ON bti.transaction_id = bt.id
        JOIN inventory_items i ON i.id = bti.item_id
        WHERE bt.borrower_user_id = :uid
          AND bt.status = 'BORROWED'
        ORDER BY bt.due_at ASC
    """, {"uid": user_id})
    if not rows:
        return f"ACTIVE BORROWS for {full_name}: None."
    lines = [f"ACTIVE BORROWS for {full_name} ({len(rows)} item(s)):"]
    for r in rows:
        overdue_flag = " ⚠️ OVERDUE" if r["is_overdue"] else ""
        lines.append(
            f"  - {r['item_name']} (Tag: {r['elabs_tag']}) | "
            f"Lab: {r['lab_name']} | Due: {_fmt_date(r['due_at'])}{overdue_flag}"
        )
    return "\n".join(lines)


def _build_user_schedule(group_code: str, full_name: str) -> str:
    rows = execute_query("""
        SELECT ts.session_date, ts.time_slot, ts.module_code,
               ts.lab_label, ts.status, m.name AS module_name
        FROM timetable_slots ts
        LEFT JOIN modules m ON m.code = ts.module_code
        WHERE (ts.group_code = :gc OR ts.group_code = 'ALL')
          AND ts.session_date >= CURDATE()
        ORDER BY ts.session_date ASC, ts.time_slot ASC
        LIMIT 7
    """, {"gc": group_code})
    if not rows:
        return f"UPCOMING SESSIONS for {full_name}: None scheduled."
    lines = [f"UPCOMING LAB SESSIONS for {full_name} (Group: {group_code}):"]
    for r in rows:
        d = _fmt_date(r["session_date"])
        lines.append(
            f"  - {d} {r['time_slot']} | {r['module_code']} {r['module_name'] or ''} | "
            f"Lab: {r['lab_label']} | Status: {r['status']}"
        )
    return "\n".join(lines)


def _build_occupancy() -> str:
    rows = execute_query("""
        SELECT l.name,
               COUNT(a.id) AS headcount
        FROM labs l
        LEFT JOIN attendance_records a ON a.lab_id = l.id
            AND a.exit_time IS NULL
        GROUP BY l.id
        ORDER BY l.name
    """, {})
    if not rows:
        return "OCCUPANCY: Data unavailable."
    lines = ["CURRENT LAB OCCUPANCY (today's entries):"]
    for r in rows:
        lines.append(f"  - {r['name']}: {r['headcount']} student(s)")
    return "\n".join(lines)


def _build_recent_activity() -> str:
    """Admin: recent 10 inventory activity."""
    rows = execute_query("""
        SELECT i.name, i.elabs_tag, i.status, i.updated_at, l.name AS lab_name
        FROM inventory_items i
        JOIN labs l ON l.id = i.lab_id
        ORDER BY i.updated_at DESC
        LIMIT 10
    """, {})
    if not rows:
        return "RECENT ACTIVITY: None."
    lines = ["RECENTLY UPDATED ITEMS:"]
    for r in rows:
        ts = r["updated_at"].strftime("%b %d %H:%M") if isinstance(r["updated_at"], (datetime, date)) else str(r["updated_at"])
        lines.append(f"  - {r['name']} ({r['elabs_tag']}) → {r['status']} @ {r['lab_name']} [{ts}]")
    return "\n".join(lines)


def _build_user_notifications(user_id: int) -> str:
    rows = execute_query("""
        SELECT title, body, type, is_read, created_at
        FROM notifications
        WHERE user_id = :uid
        ORDER BY created_at DESC
        LIMIT 5
    """, {"uid": user_id})
    if not rows:
        return "NOTIFICATIONS: None."
    unread = sum(1 for r in rows if not r["is_read"])
    lines = [f"NOTIFICATIONS ({unread} unread):"]
    for r in rows:
        status = "●" if not r["is_read"] else "○"
        ts = _fmt_date(r["created_at"])
        lines.append(f"  {status} [{r['type']}] {r['title']} — {ts}")
    return "\n".join(lines)


# ─── Main Public Function ──────────────────────────────────────────────────────

def build_context(user_email: str | None) -> tuple[str, bool]:
    """
    Returns (context_string, is_staff).
    Fetches all relevant live data from DB and formats it for the system prompt.
    """
    sections: list[str] = []
    staff = False

    try:
        # Always include global inventory + overdue summary
        sections.append(_build_inventory_summary())
        sections.append(_build_overdue_summary())

        if user_email:
            user = _get_user_info(user_email)
            if user:
                staff = _is_staff(user.get("roles"))
                uid = user["id"]
                name = user["full_name"]

                sections.append(
                    f"CURRENT USER: {name} | Email: {user_email} | "
                    f"Role(s): {user.get('roles') or 'Unknown'} | "
                    f"Group: {user.get('group_code') or 'N/A'}"
                )

                # User-specific data
                sections.append(_build_user_borrows(uid, name))
                
                if user.get("group_code"):
                    sections.append(_build_user_schedule(user["group_code"], name))

                # Admin/Staff extras (Heavy context)
                if staff:
                    sections.append(_build_lab_summary())
                    sections.append(_build_occupancy())
                    sections.append(_build_overdue_detail())
                    sections.append(_build_recent_activity())

    except Exception as e:
        logger.warning(f"Context builder error: {e}")
        sections.append(f"(Some database context could not be loaded: {e})")

    context = "\n\n".join(sections)
    return context, staff
