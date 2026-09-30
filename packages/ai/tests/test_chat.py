from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_chat_placeholder() -> None:
    response = client.post("/chat", json={"message": "hello"})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data