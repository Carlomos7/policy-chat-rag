"""LLM client service using LangChain."""

from langchain_core.language_models.chat_models import BaseChatModel
import boto3

from src.config.logging import get_logger
from src.config.settings import LLMProvider, settings

logger = get_logger(__name__)


class LLMClient:
    """LLM client supporting multiple providers."""

    def __init__(
        self,
        provider: LLMProvider = LLMProvider.BEDROCK,
        model: str = settings.bedrock_model_id,
        temperature: float = 0.1,
        max_tokens: int = 1000,
        **kwargs,
    ):
        """Initialize LLM client.

        Args:
            provider: LLM provider (BEDROCK or OPENAI).
            model: Model name/ID.
            temperature: Sampling temperature.
            max_tokens: Max tokens in response.
            **kwargs: Additional provider-specific arguments.
        """
        self.provider = provider
        self.model = model

        self.llm = self._create_llm(
            provider,
            model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        logger.info(f"✅ LLM initialized: {provider.value} / {model}")

    def _create_llm(
        self,
        provider: LLMProvider,
        model: str,
        **kwargs,
    ) -> BaseChatModel:
        """Create the appropriate LangChain model."""
        if provider == LLMProvider.BEDROCK:
            from langchain_aws import ChatBedrock

            bedrock = boto3.client(
                "bedrock-runtime",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            return ChatBedrock(model_id=model, client=bedrock, model_kwargs=kwargs)
        elif provider == LLMProvider.OPENAI:
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(model=model, **kwargs)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def get_llm(self) -> BaseChatModel:
        """Return the LangChain model (for use with create_agent)."""
        return self.llm

    def invoke(self, prompt: str) -> str:
        """Simple invoke for RAG generation.

        Args:
            prompt: The full prompt string.

        Returns:
            Response content.
        """
        response = self.llm.invoke(prompt)
        return response.content