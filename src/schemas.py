"""Request/response schemas."""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request."""
    question: str


class ChatResponse(BaseModel):
    """Chat response."""
    answer: str