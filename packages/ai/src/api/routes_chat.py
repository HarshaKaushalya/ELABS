from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: str | None = None
    document_id: str | None = None
    user_email: str | None = None
    history: list[dict] | None = None   # [{"role": "user"|"assistant", "content": "..."}]


class ChatResponse(BaseModel):
    answer: str


# ─── Non-streaming (mobile + fallback) ───────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        from ..core.rag import ask_question
        answer = ask_question(
            payload.message,
            payload.user_email,
            payload.document_id,
            payload.history,
        )
        return ChatResponse(answer=answer)
    except Exception as e:
        return ChatResponse(
            answer=f"I encountered an error while processing your question: {str(e)}"
        )


# ─── Streaming (web UI — SSE) ─────────────────────────────────────────────────

@router.post("/chat/stream")
def chat_stream(payload: ChatRequest):
    """
    Server-Sent Events endpoint. Streams tokens as:
      data: {"token": "word "}
      data: {"done": true}
    """
    from ..core.rag import ask_question_stream

    def event_generator():
        try:
            for token in ask_question_stream(
                payload.message,
                payload.user_email,
                payload.document_id,
                payload.history,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'Error: {str(e)}'})}\n\n"
        finally:
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
