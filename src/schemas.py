"""Request/response schemas."""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Chat request."""
    question: str
    thread_id: str = Field(..., description="Thread ID from POST /threads")


class ChatResponse(BaseModel):
    """Chat response."""
    answer: str
    sources: list[str] = []
    thread_id: str


class ThreadResponse(BaseModel):
    """Thread creation response."""
    thread_id: str