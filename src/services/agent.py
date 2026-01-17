"""Agent service using LangChain create_agent."""

from typing import TYPE_CHECKING, Any

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_core.messages import AIMessageChunk
from langgraph.checkpoint.memory import InMemorySaver

from src.config.logging import get_logger

if TYPE_CHECKING:
    from src.services.llm import LLMClient
    from src.services.rag import RAGService

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are the University of Richmond Policy Assistant helping students, faculty, and staff understand university policies.

CRITICAL: Always use the retrieve_policies tool for EVERY question - never answer from memory.

When responding:
- Use bullet points for lists of requirements or steps
- Cite policy numbers when available (e.g., "According to HRM-1008...")
- If the tool returns insufficient information, say: "Based on the available policies, I cannot fully answer this question. Contact [relevant office] for clarification."
- For follow-up questions, use conversation context appropriately"""


class PolicyAgent:
    """Agent for policy Q&A using RAG."""

    def __init__(self, llm: "LLMClient", rag_service: "RAGService", checkpointer=None):
        """Initialize agent.

        Args:
            llm: LLM client instance.
            rag_service: RAG service for policy retrieval.
            checkpointer: Checkpointer instance for thread management.
        """
        self.llm = llm
        self.rag_service = rag_service
        self._last_sources: list[str] = []

        @tool
        def retrieve_policies(question: str) -> str:
            """Retrieve relevant policies to answer a question.

            Args:
                question: The user's question about policies.

            Returns:
                Answer based on policy documents.
            """
            result = self.rag_service.query(question)
            # Store sources for later retrieval
            self._last_sources = result.get("sources", [])
            answer = result.get("answer", "")
            return answer

        if checkpointer is None:
            checkpointer = InMemorySaver()
            logger.warning("No checkpointer provided, using InMemorySaver")

        self.agent = create_agent(
            model=llm.get_llm(),
            tools=[retrieve_policies],
            system_prompt=SYSTEM_PROMPT,
            checkpointer=checkpointer,
        )
        logger.info("✅ Policy agent initialized")

    def invoke(self, question: str, thread_id: str) -> dict[str, Any]:
        """Answer a question using the agent.

        Args:
            question: User question.
            thread_id: Thread ID for conversation continuity.

        Returns:
            Dict with 'answer' and 'sources' keys.
        """
        self._last_sources = []
        config = {"configurable": {"thread_id": thread_id}}
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": question}]},
            config=config
        )
        return {
            "answer": result["messages"][-1].content,
            "sources": self._last_sources,
        }

    def stream(self, question: str, thread_id: str):
        """Stream agent response with LLM token streaming.

        Args:
            question: User question.
            thread_id: Thread ID for conversation continuity.

        Yields:
            Dict chunks with 'content' or 'sources' keys.
        """
        self._last_sources = []
        config = {"configurable": {"thread_id": thread_id}}
        
        for chunk, metadata in self.agent.stream(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
            stream_mode="messages",
        ):
            # Only yield content from AIMessageChunk, not tool messages
            if (
                isinstance(chunk, AIMessageChunk)
                and chunk.content
                and not chunk.tool_calls  # Skip tool-calling messages
            ):
                yield {"content": chunk.content}
        
        # Yield sources at the end
        yield {"sources": self._last_sources}
