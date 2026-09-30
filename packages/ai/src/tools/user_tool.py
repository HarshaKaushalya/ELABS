from ..core.db import execute_query
from datetime import datetime, date


def get_user_profile(user_email: str) -> str:
    """Get full profile of a user by their email."""
    query = """
        SELECT u.id, u.full_name, u.email, u.created_at, u.is_active,
               GROUP_CONCAT(DISTINCT r.name ORDER BY r.name SEPARATOR ', ') AS roles,
               sp.group_code, sp.index_no, sp.year_of_study
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.email = :email
        GROUP BY u.id
        LIMIT 1
    """
    rows = execute_query(query, {"email": user_email})
    if not rows:
        return f"No user found with email: {user_email}"

    u = rows[0]
    joined = u["created_at"].strftime("%Y-%m-%d") if u.get("created_at") else "Unknown"
    parts = [
        f"**User Profile: {u['full_name']}**",
        f"- Email: `{u['email']}`",
        f"- Role(s): **{u['roles'] or 'No roles assigned'}**",
        f"- Status: {'Active' if u['is_active'] else 'Inactive'}",
        f"- Joined: {joined}",
    ]
    if u.get("group_code"):
        parts.append(f"- Academic Group: **{u['group_code']}**")
    if u.get("index_no"):
        parts.append(f"- Index Number: **{u['index_no']}**")
    if u.get("year_of_study"):
        parts.append(f"- Year of Study: **{u['year_of_study']}**")
    return "\n".join(parts)


def get_user_notifications(user_email: str) -> str:
    """Get recent unread notifications for a user."""
    query = """
        SELECT n.title, n.body, n.type, n.created_at, n.is_read
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE u.email = :email
        ORDER BY n.created_at DESC
        LIMIT 10
    """
    rows = execute_query(query, {"email": user_email})
    if not rows:
        return f"No notifications found for {user_email}."

    unread = [r for r in rows if not r["is_read"]]
    parts = [f"**Notifications for {user_email}** ({len(unread)} unread):"]
    for r in rows:
        ts = r["created_at"].strftime("%b %d, %H:%M") if isinstance(r["created_at"], (datetime, date)) else str(r["created_at"])
        status = "🔵 Unread" if not r["is_read"] else "✓ Read"
        parts.append(f"- [{status}] **{r['title']}** ({r['type']}) — {ts}\n  {r['body']}")
    return "\n".join(parts)


def get_all_overdue_transactions() -> str:
    """Admin-only: Get all currently overdue borrow transactions."""
    query = """
        SELECT u.full_name, u.email,
               bt.id AS txn_id, bt.due_at, bt.purpose,
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
        LIMIT 20
    """
    rows = execute_query(query, {})
    if not rows:
        return "✅ No overdue transactions found. All equipment returned on time."

    parts = [f"**⚠️ Overdue Transactions ({len(rows)} found):**"]
    for r in rows:
        due_str = r["due_at"].strftime("%Y-%m-%d") if isinstance(r["due_at"], (datetime, date)) else str(r["due_at"])
        parts.append(
            f"\n- **{r['full_name'] or 'Unknown'}** (`{r['email'] or 'N/A'}`) — "
            f"**{r['days_overdue']} day(s) overdue**\n"
            f"  Items: {r['items']}\n"
            f"  Lab: {r['lab_name']} | Due: {due_str} | Purpose: {r['purpose'] or 'N/A'}"
        )
    return "\n".join(parts)


def search_student(name_or_email: str) -> str:
    """Admin-only: Search for a student by name or email."""
    query = """
        SELECT u.full_name, u.email, u.is_active,
               sp.group_code, sp.index_no, sp.year_of_study,
               GROUP_CONCAT(DISTINCT r.name SEPARATOR ', ') AS roles
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.full_name LIKE :search OR u.email LIKE :search
        GROUP BY u.id
        LIMIT 5
    """
    term = f"%{name_or_email}%"
    rows = execute_query(query, {"search": term})
    if not rows:
        return f"No student found matching '{name_or_email}'."

    parts = [f"**Search results for '{name_or_email}':**"]
    for r in rows:
        parts.append(
            f"\n- **{r['full_name']}** — `{r['email']}`\n"
            f"  Role: {r['roles'] or 'N/A'} | Group: {r['group_code'] or 'N/A'} | "
            f"Index: {r['index_no'] or 'N/A'} | Year: {r['year_of_study'] or 'N/A'} | "
            f"Status: {'Active' if r['is_active'] else 'Inactive'}"
        )
    return "\n".join(parts)


def get_attendance_summary(user_email: str) -> str:
    """Get attendance summary for a user."""
    query = """
        SELECT ls.title, ls.scheduled_at,
               a.scanned_at, a.scan_type, l.name AS lab_name
        FROM attendance a
        JOIN lab_sessions ls ON ls.id = a.session_id
        JOIN labs l ON l.id = ls.lab_id
        JOIN users u ON u.id = a.user_id
        WHERE u.email = :email
        ORDER BY a.scanned_at DESC
        LIMIT 10
    """
    rows = execute_query(query, {"email": user_email})
    if not rows:
        return f"No attendance records found for {user_email}."

    parts = [f"**Recent Attendance for {user_email}:**"]
    for r in rows:
        ts = r["scanned_at"].strftime("%b %d %Y, %H:%M") if isinstance(r["scanned_at"], (datetime, date)) else str(r["scanned_at"])
        parts.append(
            f"- **{r['title']}** at **{r['lab_name']}** — {r['scan_type'].title()} at {ts}"
        )
    return "\n".join(parts)
