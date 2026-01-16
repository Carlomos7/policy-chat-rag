"""FastAPI dependency injection."""

from functools import lru_cache

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver

from src.config.settings import get_settings, CheckpointType
from src.services.agent import PolicyAgent
from src.services.llm import LLMClient
from src.services.rag import RAGService
from src.services.vector_store import VectorStore

from src.config.logging import get_logger

logger = get_logger(__name__)

# Global checkpointer (managed by app lifespan)
_checkpointer = None
_postgres_context = None


def init_checkpointer():
    """Initialize checkpointer based on settings. Called during app startup."""
    global _checkpointer, _postgres_context
    settings = get_settings()
    
    if settings.checkpoint_type == CheckpointType.MEMORY:
        _checkpointer = InMemorySaver()
        logger.info("✅ InMemorySaver initialized")
    elif settings.checkpoint_type == CheckpointType.POSTGRES:
        if not settings.checkpoint_postgres_url:
            raise ValueError(
                "checkpoint_postgres_url must be set when using postgres checkpoint type"
            )
        # Enter the context manager and keep reference
        _postgres_context = PostgresSaver.from_conn_string(
            settings.checkpoint_postgres_url
        )
        _checkpointer = _postgres_context.__enter__()
        _checkpointer.setup()
        logger.info("✅ PostgresSaver initialized and tables created")
    else:
        raise ValueError(f"Invalid checkpoint type: {settings.checkpoint_type}")


def cleanup_checkpointer():
    """Cleanup checkpointer. Called during app shutdown."""
    global _checkpointer, _postgres_context
    if _postgres_context is not None:
        _postgres_context.__exit__(None, None, None)
        logger.info("✅ PostgresSaver connection closed")
    _checkpointer = None
    _postgres_context = None


def get_checkpointer():
    """Get the initialized checkpointer."""
    if _checkpointer is None:
        raise RuntimeError("Checkpointer not initialized. Call init_checkpointer() first.")
    return _checkpointer


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    """Get or create vector store instance."""
    settings = get_settings()
    return VectorStore(
        client_type=settings.chroma_client_type,
        collection_name=settings.chroma_collection_name,
        persist_path=settings.chroma_persist_path,
        host=settings.chroma_host,
        port=settings.chroma_port,
        chroma_cloud_api_key=settings.chroma_cloud_api_key,
        chroma_tenant_id=settings.chroma_tenant_id,
        chroma_database=settings.chroma_database,
    )


@lru_cache(maxsize=1)
def get_llm() -> LLMClient:
    """Get or create LLM client instance."""
    settings = get_settings()
    return LLMClient(
        provider=settings.llm_provider,
        model=settings.llm_model,
        **settings.get_llm_kwargs(),
    )


@lru_cache(maxsize=1)
def get_rag_service() -> RAGService:
    """Get or create RAG service instance."""
    return RAGService(
        llm=get_llm(),
        vector_store=get_vector_store(),
        top_k=5,
        threshold=1.2,
    )


def get_agent() -> PolicyAgent:
    """Get or create policy agent instance."""
    return PolicyAgent(
        llm=get_llm(),
        rag_service=get_rag_service(),
        checkpointer=get_checkpointer(),
    )
