"""RAG orchestration service."""

from typing import TYPE_CHECKING, Any

from langchain_core.prompts import PromptTemplate

from src.config.logging import get_logger
from src.services.llm import LLMClient

if TYPE_CHECKING:
    from src.services.vector_store import VectorStore

logger = get_logger(__name__)

RAG_PROMPT = """Answer the question using ONLY the policy documents below. Do not use external knowledge.

If the documents don't contain enough information, say: "I don't have enough information in these policies to answer fully."

Always quote specific numbers, dates, and requirements exactly as written.

Policy Documents:
{context}

Question: {question}

Answer:"""


class RAGService:
    """Orchestrates retrieval and generation for policy documents."""

    def __init__(
        self,
        llm: LLMClient,
        vector_store: "VectorStore",
        top_k: int = 5,
        threshold: float = 1.2,
    ):
        """Initialize RAG service.

        Args:
            llm: LLM client instance.
            vector_store: ChromaDB vector store.
            top_k: Number of documents to retrieve.
            threshold: Distance threshold for filtering.
        """
        self.llm = llm
        self.vector_store = vector_store
        self.top_k = top_k
        self.threshold = threshold

    def query(self, question: str) -> dict[str, Any]:
        """Answer a question using policy documents.

        Args:
            question: User question.

        Returns:
            Dict with answer and sources.
        """
        # Step 1: Retrieve relevant documents
        docs = self.vector_store.query(
            query_text=question,
            n_results=self.top_k,
            threshold=self.threshold,
        )

        # Step 2: Handle no results
        if not docs:
            logger.info("No relevant documents found")
            return {
                "answer": "I couldn't find any relevant information to answer your question.",
                "sources": [],
                "num_docs": 0,
            }

        # Step 3: Format context
        context = self._format_context(docs)

        # Step 4: Generate answer
        answer = self._generate_answer(question, context)

        # Step 5: Extract unique sources
        sources = list({doc["source"] for doc in docs})

        return {
            "answer": answer,
            "sources": sources,
            "num_docs": len(docs),
        }

    def _format_context(self, docs: list[dict[str, Any]]) -> str:
        """Format retrieved documents into context string."""
        formatted_docs = []
        for doc in docs:
            source = doc["source"]
            text = doc["text"]
            formatted_docs.append(f"[Source: {source}]\n{text}")

        return "\n\n".join(formatted_docs)

    def _generate_answer(self, question: str, context: str) -> str:
        """Generate answer using LLM."""
        prompt = PromptTemplate(
            template=RAG_PROMPT,
            input_variables=["context", "question"],
        )

        formatted = prompt.format(context=context, question=question)
        return self.llm.invoke(formatted)