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
        # Thread-keyed sources to avoid race conditions between concurrent requests
        self._sources_by_thread: dict[str, list[str]] = {}
        # Track current thread for tool access (set before each invoke/astream)
        self._current_thread_id: str | None = None

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

            # Store sources keyed by thread to avoid race conditions
            sources = list({doc["source"] for doc in docs})
            if self._current_thread_id:
                self._sources_by_thread[self._current_thread_id] = sources

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

    def get_sources(self, thread_id: str) -> list[str]:
        """Get sources for a specific thread. Clears them after retrieval."""
        return self._sources_by_thread.pop(thread_id, [])

    def invoke(self, question: str, thread_id: str) -> dict:
        """Answer a question using the agent (non-streaming)."""
        self._current_thread_id = thread_id
        self._sources_by_thread.pop(thread_id, None)  # Clear any stale sources

        config = {"configurable": {"thread_id": thread_id}}
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
        )

        sources = self.get_sources(thread_id)
        self._current_thread_id = None

        return {
            "answer": result["messages"][-1].text,
            "sources": sources,
        }

    async def astream(self, question: str, thread_id: str):
        """Stream response tokens. Call get_sources(thread_id) after streaming completes."""
        self._current_thread_id = thread_id
        self._sources_by_thread.pop(thread_id, None)  # Clear any stale sources

        config = {"configurable": {"thread_id": thread_id}}

        try:
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
        finally:
            self._current_thread_id = None

    @property
    def last_sources(self) -> list[str]:
        """Sources from the most recent agent run (deprecated, use get_sources)."""
        # Fallback for any code still using this
        if self._current_thread_id:
            return self._sources_by_thread.get(self._current_thread_id, [])
        return []
