import unittest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


class TestAiChatEndpoint(unittest.TestCase):
    def test_chat_response(self):
        """Test that /chat returns HTTP 200 with answer payload."""
        response = client.post("/chat", json={"message": "hello"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("answer", data)


if __name__ == "__main__":
    unittest.main()