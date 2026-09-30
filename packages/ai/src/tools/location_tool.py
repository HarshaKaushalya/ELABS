from ..core.db import execute_query

def locate_item(tag_or_name: str) -> str:
    """
    Get the physical location (Laboratory name, floor, and room location) of an inventory item.
    """
    query = """
        SELECT i.name, i.elabs_tag, l.name as lab_name, l.location as room_location, l.floor
        FROM inventory_items i
        JOIN labs l ON i.lab_id = l.id
        WHERE i.elabs_tag = :term OR i.name LIKE :like_term
        LIMIT 5
    """
    like_term = f"%{tag_or_name}%"
    rows = execute_query(query, {"term": tag_or_name, "like_term": like_term})
    
    if not rows:
        return f"Could not find location details for any item matching '{tag_or_name}'."
    
    results = []
    for r in rows:
        results.append(
            f"- **{r['name']}** (Tag: `{r['elabs_tag']}`):\n"
            f"  Location: **{r['lab_name']}** | Room: **{r['room_location'] or 'N/A'}** | Floor: **{r['floor'] or 'N/A'}**"
        )
    return "\n".join(results)

def locate_lab(lab_name: str) -> str:
    """
    Get the physical location and floor info of a specific laboratory.
    """
    query = """
        SELECT name, location, floor
        FROM labs
        WHERE name LIKE :like_term
        LIMIT 5
    """
    like_term = f"%{lab_name}%"
    rows = execute_query(query, {"like_term": like_term})
    
    if not rows:
        return f"Could not find any laboratory matching '{lab_name}'."
    
    results = []
    for r in rows:
        results.append(
            f"- **{r['name']}**:\n"
            f"  Location Room/Area: **{r['location'] or 'N/A'}** | Floor: **{r['floor'] or 'N/A'}**"
        )
    return "\n".join(results)