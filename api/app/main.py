"""FastAPI application."""

import json
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config.logging import get_logger, setup_logging
from app.config.settings import get_settings
from app.dependencies import get_agent, init_checkpointer, cleanup_checkpointer
from app.services.agent import PolicyAgent
from app.schemas import ChatRequest, ChatResponse, ThreadResponse


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    setup_logging()
    logger.info("🚀 Starting Policy RAG API")
    await init_checkpointer()
    yield
    await cleanup_checkpointer()
    logger.info("🛑 Shutting down Policy RAG API")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.version,
        lifespan=lifespan,
    )

    # CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return application


app = create_app()
settings = get_settings()


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/threads", response_model=ThreadResponse)
def create_thread() -> ThreadResponse:
    """Create a new conversation thread."""
    thread_id = str(uuid4())
    logger.debug(f"Created new thread: {thread_id}")
    return ThreadResponse(thread_id=thread_id)


@app.post("/chat", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    agent: PolicyAgent = Depends(get_agent),
) -> ChatResponse:
    """Chat endpoint for policy Q&A."""
    try:
        result = agent.invoke(request.question, thread_id=request.thread_id)
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            thread_id=request.thread_id,
        )
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")


@app.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    agent: PolicyAgent = Depends(get_agent),
):
    """Stream chat response with sources."""
    thread_id = request.thread_id

    async def generate():
        # Stream content
        async for chunk in agent.astream(request.question, thread_id=thread_id):
            yield f"data: {json.dumps({'content': chunk, 'thread_id': thread_id})}\n\n"
        
        # Get sources after streaming completes (thread-safe)
        sources = agent.get_sources(thread_id)

        # Send sources as final chunk
        yield f"data: {json.dumps({'sources': sources, 'thread_id': thread_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
