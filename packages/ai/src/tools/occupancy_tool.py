from ..core.db import execute_query

def get_lab_occupancy(lab_name: str) -> str:
    """
    Get the real-time student occupancy count for a laboratory by its name.
    """
    # 1. Fetch lab details
    lab_query = """
        SELECT id, name, location, floor
        FROM labs
        WHERE name LIKE :like_term
        LIMIT 1
    """
    like_term = f"%{lab_name}%"
    lab_rows = execute_query(lab_query, {"like_term": like_term})
    
    if not lab_rows:
        return f"Could not find any laboratory matching '{lab_name}' in the database."
        
    lab = lab_rows[0]
    lab_id = lab["id"]
    lab_full_name = lab["name"]
    
    # 2. Count active attendees (exit_time is NULL)
    occupancy_query = """
        SELECT COUNT(1) as active_count
        FROM attendance_records
        WHERE lab_id = :lab_id AND exit_time IS NULL
    """
    count_rows = execute_query(occupancy_query, {"lab_id": lab_id})
    active_students = count_rows[0]["active_count"] if count_rows else 0
    
    # 3. Format and return results
    # We can assume a default capacity of 30 if none is defined, or describe standard capacity.
    default_capacity = 30
    occupancy_percentage = int((active_students / default_capacity) * 100)
    
    return (
        f"Real-time occupancy for **{lab_full_name}** ({lab['location'] or 'N/A'}, {lab['floor'] or 'N/A'}):\n"
        f"- Currently active students: **{active_students}**\n"
        f"- Estimated capacity: **{active_students}/{default_capacity}** (**{occupancy_percentage}%** occupancy)\n"
        f"*(Note: Occupancy count is monitored via YOLOv8 object detection on lab cameras)*"
    )
