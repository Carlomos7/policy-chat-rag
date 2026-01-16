"""Agent service using LangChain create_agent."""

from typing import TYPE_CHECKING, Optional
from uuid import uuid4

from langchain.agents import create_agent
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver

from src.config.logging import get_logger
from src.config.settings import get_settings

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
        self.settings = get_settings()

        # Define the RAG tool
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

        # Use provided checkpointer or fall back to InMemorySaver
        if checkpointer is None:
            checkpointer = InMemorySaver()
            logger.warning("No checkpointer provided, using InMemorySaver")
        
        # Create the agent
        self.agent = create_agent(
            model=llm.get_llm(),
            tools=[retrieve_policies],
            system_prompt=SYSTEM_PROMPT,
            checkpointer=checkpointer,
        )

        logger.info(f"✅ Policy agent initialized with {self.settings.checkpoint_type.value} checkpoint")

    def invoke(self, question: str, thread_id: Optional[str] = None) -> str:
        """Answer a question using the agent with thread management.

        Args:
            question: User question.
            thread_id: Optional thread ID for conversation continuity.
                      If None, generates a new thread ID.

        Returns:
            Agent response.
        """
        # Generate thread_id if not provided for conversation continuity
        if thread_id is None:
            thread_id = str(uuid4())
        
        config = {"configurable": {"thread_id": thread_id}}
        
        result = self.agent.invoke(
            {"messages": [{"role": "user", "content": question}]},
            config=config
        )
        
        # Extract the final message content
        final_message = result["messages"][-1]
        return final_message.content

    def stream(self, question: str, thread_id: Optional[str] = None):
        """Stream agent response with thread management.

        Args:
            question: User question.
            thread_id: Optional thread ID for conversation continuity.
                      If None, generates a new thread ID.

        Yields:
            Response chunks.
        """
        # Generate thread_id if not provided
        if thread_id is None:
            thread_id = str(uuid4())
        
        config = {"configurable": {"thread_id": thread_id}}
        
        for chunk in self.agent.stream(
            {"messages": [{"role": "user", "content": question}]},
            config=config,
            stream_mode="values"
        ):
            latest_message = chunk["messages"][-1]
            if latest_message.content:
                yield latest_message.content
