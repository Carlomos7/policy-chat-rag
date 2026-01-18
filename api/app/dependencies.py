"""FastAPI dependency injection."""

from functools import lru_cache

import boto3
from langchain_core.language_models.chat_models import BaseChatModel
from langgraph.checkpoint.memory import InMemorySaver

from app.config.logging import get_logger
from app.config.settings import get_settings, CheckpointType, LLMProvider
from app.services.agent import PolicyAgent
from app.services.vector_store import VectorStore

logger = get_logger(__name__)

# Global checkpointer
_checkpointer = None
_checkpointer_ctx = None


async def init_checkpointer():
    """Initialize checkpointer based on settings. Called during app startup."""
    global _checkpointer, _checkpointer_ctx
    settings = get_settings()

    if settings.checkpoint_type == CheckpointType.MEMORY:
        _checkpointer = InMemorySaver()
        logger.info("✅ InMemorySaver initialized")
    elif settings.checkpoint_type == CheckpointType.POSTGRES:
        if not settings.checkpoint_postgres_url:
            raise ValueError(
                "checkpoint_postgres_url must be set when using postgres checkpoint type"
            )
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        
        _checkpointer_ctx = AsyncPostgresSaver.from_conn_string(settings.checkpoint_postgres_url)
        _checkpointer = await _checkpointer_ctx.__aenter__()
        await _checkpointer.setup()
        logger.info("✅ AsyncPostgresSaver initialized")
    else:
        raise ValueError(f"Invalid checkpoint type: {settings.checkpoint_type}")


async def cleanup_checkpointer():
    """Cleanup checkpointer. Called during app shutdown."""
    global _checkpointer, _checkpointer_ctx
    if _checkpointer_ctx is not None:
        await _checkpointer_ctx.__aexit__(None, None, None)
        logger.info("✅ AsyncPostgresSaver closed")
    _checkpointer = None
    _checkpointer_ctx = None


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
def get_model() -> BaseChatModel:
    """Get or create LangChain chat model."""
    settings = get_settings()

    if settings.llm_provider == LLMProvider.BEDROCK:
        from langchain_aws import ChatBedrock

        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        model = ChatBedrock(
            model_id=settings.llm_model,
            client=client,
            model_kwargs={
                "temperature": settings.llm_temperature,
                "max_tokens": settings.llm_max_tokens,
            },
        )
    elif settings.llm_provider == LLMProvider.OPENAI:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            base_url=settings.llm_base_url or None,
            api_key=settings.llm_api_key or "not-needed",
        )
    else:
        raise ValueError(f"Unknown provider: {settings.llm_provider}")

    logger.info(f"✅ LLM initialized: {settings.llm_provider.value} / {settings.llm_model}")
    return model


def get_agent() -> PolicyAgent:
    """Get or create policy agent instance."""
    return PolicyAgent(
        model=get_model(),
        vector_store=get_vector_store(),
        checkpointer=get_checkpointer(),
    )
