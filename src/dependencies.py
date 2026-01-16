"""FastAPI dependency injection."""

from functools import lru_cache

from src.config.settings import get_settings
from src.services.agent import PolicyAgent
from src.services.llm import LLMClient
from src.services.rag import RAGService
from src.services.vector_store import VectorStore

from src.config.logging import get_logger

logger = get_logger(__name__)


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
    settings = get_settings()
    return RAGService(
        llm=get_llm(),
        vector_store=get_vector_store(),
        top_k=5,
        threshold=1.2,
    )


@lru_cache(maxsize=1)
def get_agent() -> PolicyAgent:
    """Get or create policy agent instance."""
    return PolicyAgent(
        llm=get_llm(),
        rag_service=get_rag_service(),
    )
