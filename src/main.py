"""FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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
    """Answer a question about policies.
    
    Args:
        request: Chat request with question.
        agent: Policy agent instance (injected).
        
    Returns:
        Chat response with answer.
    """
    try:
        answer = agent.invoke(request.question, thread_id=request.thread_id)
        return ChatResponse(answer=answer, thread_id=request.thread_id)
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        raise HTTPException(status_code=500, detail="Failed to process question")
