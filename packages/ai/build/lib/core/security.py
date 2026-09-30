def api_key_required(api_key: str | None) -> bool:
    if api_key is None:
        return False
    return len(api_key.strip()) > 0