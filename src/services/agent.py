"""Agent service using LangChain create_agent."""

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessageChunk
from langgraph.checkpoint.base import BaseCheckpointSaver

from src.config.logging import get_logger
from src.services.vector_store import VectorStore

from src.prompts import SYSTEM_PROMPT

logger = get_logger(__name__)


class PolicyAgent:
    """Agent for policy Q&A using RAG."""

    def __init__(
        self,
        model: BaseChatModel,
        vector_store: VectorStore,
        checkpointer: BaseCheckpointSaver,
        top_k: int = 5,
        threshold: float = 1.2,
    ):
        self._vector_store = vector_store
        self._top_k = top_k
        self._threshold = threshold
        self._last_sources: list[str] = []

        @tool
        def retrieve_policies(question: str) -> str:
            """Search university policy documents to answer a question about policies."""
            docs = self._vector_store.query(
                query_text=question,
                n_results=self._top_k,
                threshold=self._threshold,
            )

            if not docs:
                return "No relevant policy documents found."

            # Track sources once, structurally
            self._last_sources = list({doc["source"] for doc in docs})

            return "\n\n".join(
                f"[Source: {doc['source']}]\n{doc['text']}"
                for doc in docs
            )

        self.agent = create_agent(
            model=model,
            tools=[retrieve_policies],
            system_prompt=SYSTEM_PROMPT,
            checkpointer=checkpointer,
        )

        logger.info("✅ Policy agent initialized")

    def invoke(self, question: str, thread_id: str) -> dict:
        """Answer a question using the agent (non-streaming)."""
        self._last_sources = []

        config = {"configurable": {"thread_id": thread_id}}
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
        )

        return {
            "answer": result["messages"][-1].text,
            "sources": self._last_sources,
        }

    async def astream(self, question: str, thread_id: str):
        self._last_sources = []

        config = {"configurable": {"thread_id": thread_id}}

        async for token, _ in self.agent.astream(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
            stream_mode="messages",
        ):
            if (
                isinstance(token, AIMessageChunk)
                and token.text
                and not token.tool_calls
            ):
                yield token.text


    @property
    def last_sources(self) -> list[str]:
        """Sources from the most recent agent run."""
        return self._last_sources
