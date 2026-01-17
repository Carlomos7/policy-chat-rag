"""LLM client service using LangChain."""

from langchain_core.language_models.chat_models import BaseChatModel
import boto3

from src.config.logging import get_logger
from src.config.settings import LLMProvider
from src.config.settings import get_settings

logger = get_logger(__name__)


class LLMClient:
    """LLM client supporting multiple providers."""

    def __init__(
        self,
        provider: LLMProvider = LLMProvider.BEDROCK,
        model: str = None,
        temperature: float = 0.1,
        rag_max_tokens: int = 400,
        agent_max_tokens: int = 600,
        **kwargs,
    ):
        """Initialize LLM client.

        Args:
            provider: LLM provider (BEDROCK or OPENAI).
            model: Model name/ID.
            temperature: Sampling temperature.
            rag_max_tokens: Max tokens for RAG generation (focused answers).
            agent_max_tokens: Max tokens for agent responses (with formatting).
            **kwargs: Additional provider-specific arguments.
        """
        self.provider = provider
        self.model = model
        self.temperature = temperature
        self.rag_max_tokens = rag_max_tokens
        self.agent_max_tokens = agent_max_tokens
        self._provider_kwargs = kwargs

        # Create agent LLM
        self.llm = self._create_llm(
            provider,
            model,
            temperature=temperature,
            max_tokens=agent_max_tokens,
            **kwargs,
        )
        logger.info(f"✅ LLM initialized: {provider.value} / {model} (agent: {agent_max_tokens}, rag: {rag_max_tokens})")

    def _create_llm(
        self,
        provider: LLMProvider,
        model: str,
        **kwargs,
    ) -> BaseChatModel:
        """Create the appropriate LangChain model."""
        settings = get_settings()
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

        Uses rag_max_tokens for focused, policy-specific answers.

        Args:
            prompt: The full prompt string.

        Returns:
            Response content.
        """
        rag_llm = self._create_llm(
            self.provider,
            self.model,
            temperature=self.temperature,
            max_tokens=self.rag_max_tokens,
            **self._provider_kwargs,
        )
        response = rag_llm.invoke(prompt)
        return response.content