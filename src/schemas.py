"""Request/response schemas."""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request."""
    question: str
    thread_id: str | None = None

class ChatResponse(BaseModel):
    """Chat response."""
    answer: str
    thread_id: str | None = None