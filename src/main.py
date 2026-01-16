"""FastAPI application."""

import json
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from src.config.logging import get_logger
from src.config.settings import get_settings
from src.dependencies import get_agent, init_checkpointer, cleanup_checkpointer
from src.services.agent import PolicyAgent
from src.schemas import ChatRequest, ChatResponse

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting Policy RAG API")
    init_checkpointer()
    yield
    cleanup_checkpointer()
    logger.info("🛑 Shutting down Policy RAG API")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    agent: PolicyAgent = Depends(get_agent),
) -> ChatResponse:
    """Chat endpoint for policy Q&A."""
    try:
        thread_id = request.thread_id or str(uuid4())
        answer = agent.invoke(request.question, thread_id=thread_id)
        return ChatResponse(answer=answer, thread_id=thread_id)
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")


@app.post("/chat/stream")
def chat_stream(
    request: ChatRequest,
    agent: PolicyAgent = Depends(get_agent),
):
    """Stream chat response using LangGraph messages mode."""
    thread_id = request.thread_id or str(uuid4())

    def generate():
        try:
            for content in agent.stream(request.question, thread_id=thread_id):
                yield f"data: {json.dumps({'content': content, 'thread_id': thread_id})}\n\n"
            yield f"data: {json.dumps({'done': True, 'thread_id': thread_id})}\n\n"
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
