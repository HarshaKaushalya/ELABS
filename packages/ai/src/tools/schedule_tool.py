from ..core.db import execute_query
from datetime import datetime, date

def get_upcoming_labs(user_email: str) -> str:
    """
    Get the upcoming laboratory sessions for a student based on their email.
    """
    # 1. Fetch user ID and group code
    user_query = """
        SELECT u.id, u.full_name, sp.group_code
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.email = :email
        LIMIT 1
    """
    user_rows = execute_query(user_query, {"email": user_email})
    if not user_rows:
        return f"Could not find any student account for email: {user_email}"
        
    user = user_rows[0]
    group_code = user.get("group_code")
    full_name = user.get("full_name")
    
    if not group_code:
        return f"Student **{full_name}** ({user_email}) is not assigned to any academic group code (e.g. Group A, Group B)."

    # 2. Query upcoming timetable slots matching their group or 'ALL'
    schedule_query = """
        SELECT ts.session_date, ts.time_slot, ts.module_code, ts.lab_label, ts.status, m.name as module_name
        FROM timetable_slots ts
        LEFT JOIN modules m ON ts.module_code = m.code
        WHERE (ts.group_code = :group_code OR ts.group_code = 'ALL')
          AND ts.session_date >= CURDATE()
        ORDER BY ts.session_date ASC, ts.time_slot ASC
        LIMIT 5
    """
    rows = execute_query(schedule_query, {"group_code": group_code})
    
    if not rows:
        return f"No upcoming laboratory sessions found for **{full_name}** (Group: `{group_code}`)."
        
    results = [f"Upcoming laboratory sessions for **{full_name}** (Group: `{group_code}`):"]
    for r in rows:
        date_str = r['session_date'].strftime('%Y-%m-%d') if isinstance(r['session_date'], (datetime, date)) else str(r['session_date'])
        results.append(
            f"- **{date_str}** | **{r['time_slot']}**:\n"
            f"  Module: `{r['module_code']}` - **{r['module_name'] or 'N/A'}**\n"
            f"  Lab Topic/Room: **{r['lab_label']}** | Status: **{r['status']}**"
        )
    return "\n".join(results)