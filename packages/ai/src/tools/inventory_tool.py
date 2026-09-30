from ..core.db import execute_query

def get_item_status(tag_or_name: str) -> str:
    """
    Check the status of a laboratory equipment item by its ELABS tag or name.
    """
    query = """
        SELECT i.name, i.elabs_tag, i.status, l.name as lab_name, i.model, i.category
        FROM inventory_items i
        JOIN labs l ON i.lab_id = l.id
        WHERE i.elabs_tag = :term OR i.name LIKE :like_term
        LIMIT 5
    """
    like_term = f"%{tag_or_name}%"
    rows = execute_query(query, {"term": tag_or_name, "like_term": like_term})
    
    if not rows:
        return f"Could not find any equipment matching '{tag_or_name}' in the database."
    
    results = []
    for r in rows:
        results.append(
            f"- **{r['name']}** (Tag: `{r['elabs_tag']}`, Model: {r['model'] or 'N/A'}, Category: {r['category'] or 'N/A'}):\n"
            f"  Status: **{r['status']}** | Location: **{r['lab_name']}**"
        )
    return "\n".join(results)

def get_borrowed_items(user_email: str) -> str:
    """
    Get all active borrowed equipment items for a student using their email.
    """
    query = """
        SELECT i.name, i.elabs_tag, bt.due_at, l.name as lab_name
        FROM borrow_transactions bt
        JOIN users u ON bt.borrower_user_id = u.id
        JOIN borrow_transaction_items bti ON bt.id = bti.transaction_id
        JOIN inventory_items i ON bti.item_id = i.id
        JOIN labs l ON bt.lab_id = l.id
        WHERE u.email = :email AND bt.status = 'BORROWED' AND bt.returned_at IS NULL
    """
    rows = execute_query(query, {"email": user_email})
    
    if not rows:
        return f"No active borrowed equipment found for student: {user_email}."
    
    results = [f"Active borrowed equipment for **{user_email}**:"]
    for r in rows:
        due_str = r['due_at'].strftime('%Y-%m-%d %H:%M') if r['due_at'] else "No due date"
        results.append(
            f"- **{r['name']}** (Tag: `{r['elabs_tag']}`):\n"
            f"  Borrowed from: **{r['lab_name']}** | Due date: **{due_str}**"
        )
    return "\n".join(results)