from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: str | None = None
    document_id: str | None = None


class ChatResponse(BaseModel):
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        from ..core.rag import ask_question
        answer = ask_question(payload.message)
        return ChatResponse(answer=answer)
    except Exception as e:
        return ChatResponse(
            answer=f"I encountered an error while processing your question. Please ensure Ollama is running and models are available. Error: {str(e)}"
        )
