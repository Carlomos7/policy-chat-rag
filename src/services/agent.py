"""Agent service using LangChain create_agent."""

from typing import TYPE_CHECKING

from langchain.agents import create_agent
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver

from src.config.logging import get_logger

if TYPE_CHECKING:
    from src.services.llm import LLMClient
    from src.services.rag import RAGService

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a helpful assistant that answers questions about company policies.
Use the policy retrieval tool to find relevant information and answer user questions accurately.
Be concise and direct in your responses."""


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

        @tool
        def retrieve_policies(question: str) -> str:
            """Retrieve relevant policies to answer a question.

            Args:
                question: The user's question about policies.

            Returns:
                Answer based on policy documents.
            """
            result = self.rag_service.query(question)
            sources = result.get("sources", [])
            answer = result.get("answer", "")
            if sources:
                answer += f"\n\n(Sources: {', '.join(sources)})"
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

    def invoke(self, question: str, thread_id: str) -> str:
        """Answer a question using the agent.

        Args:
            question: User question.
            thread_id: Thread ID for conversation continuity.

        Returns:
            Agent response.
        """
        config = {"configurable": {"thread_id": thread_id}}
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": question}]},
            config=config
        )
        return result["messages"][-1].content

    def stream(self, question: str, thread_id: str):
        """Stream agent response with LLM token streaming.

        Args:
            question: User question.
            thread_id: Thread ID for conversation continuity.

        Yields:
            Response token chunks.
        """
        config = {"configurable": {"thread_id": thread_id}}
        for chunk, metadata in self.agent.stream(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
            stream_mode="messages",
        ):
            if hasattr(chunk, 'content') and chunk.content:
                yield chunk.content
