"""Agent service using LangChain create_agent."""

from typing import TYPE_CHECKING

from langchain.agents import create_agent
from langchain.tools import tool

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

    def __init__(self, llm: "LLMClient", rag_service: "RAGService"):
        """Initialize agent.

        Args:
            llm: LLM client instance.
            rag_service: RAG service for policy retrieval.
        """
        self.llm = llm
        self.rag_service = rag_service

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

        # Create the agent
        self.agent = create_agent(
            model=llm.get_llm(),
            tools=[retrieve_policies],
            system_prompt=SYSTEM_PROMPT,
        )

        logger.info("✅ Policy agent initialized")

    def invoke(self, question: str) -> str:
        """Answer a question using the agent.

        Args:
            question: User question.

        Returns:
            Agent response.
        """
        result = self.agent.invoke({
            "messages": [{"role": "user", "content": question}]
        })
        
        # Extract the final message content
        final_message = result["messages"][-1]
        return final_message.content

    def stream(self, question: str):
        """Stream agent response.

        Args:
            question: User question.

        Yields:
            Response chunks.
        """
        for chunk in self.agent.stream({
            "messages": [{"role": "user", "content": question}]
        }, stream_mode="values"):
            latest_message = chunk["messages"][-1]
            if latest_message.content:
                yield latest_message.content
