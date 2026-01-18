"""Ingest policy documents into ChromaDB with recursive semantic chunking.

Chunking approach based on:
https://towardsdatascience.com/a-visual-exploration-of-semantic-text-chunking-6bb46f728e30
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

from dotenv import load_dotenv
import numpy as np
from scipy.cluster.hierarchy import linkage, cut_tree
from scipy.spatial.distance import cosine, pdist
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model
from langchain.messages import HumanMessage
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.config.logging import get_logger, setup_logging
from src.config.settings import get_settings
from src.services.vector_store import VectorStore

# Initialize logging with file handlers if configured
setup_logging()
logger = get_logger(__name__)

load_dotenv()

embed_fn = DefaultEmbeddingFunction()


def embed(texts: list[str]) -> np.ndarray:
    return np.array(embed_fn(texts))


def initial_split(text: str, chunk_size: int = 300, min_len: int = 100) -> list[str]:
    """Split text into small initial chunks, merging short ones."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=0,
        separators=["\n\n", "\n", ". ", " "],
    )
    chunks = splitter.split_text(text)

    merged = []
    buffer = ""
    for chunk in chunks:
        combined = f"{buffer} {chunk}".strip() if buffer else chunk
        if len(combined) < min_len:
            buffer = combined
        else:
            if buffer:
                merged.append(buffer)
            buffer = chunk
    if buffer:
        merged.append(buffer)

    return merged


def find_breakpoints(embeddings: np.ndarray, percentile: float = 0.85) -> list[int]:
    """Find indices where cosine distance exceeds threshold."""
    if len(embeddings) < 2:
        return []

    distances = [cosine(embeddings[i], embeddings[i - 1]) for i in range(1, len(embeddings))]
    threshold = np.percentile(distances, 100 * percentile)
    return [i for i, d in enumerate(distances) if d >= threshold]


def recursive_chunk(
    chunks: list[str],
    embeddings: np.ndarray,
    max_length: int = 1500,
    percentile: float = 0.85,
) -> list[str]:
    """Recursively split chunks until all are under max_length."""
    total_len = sum(len(c) for c in chunks)

    if len(chunks) <= 1 or total_len < max_length:
        return [" ".join(chunks)]

    breakpoints = find_breakpoints(embeddings, percentile)

    if not breakpoints:
        mid = len(chunks) // 2
        left = recursive_chunk(chunks[:mid], embeddings[:mid], max_length, percentile)
        right = recursive_chunk(chunks[mid:], embeddings[mid:], max_length, percentile)
        return left + right

    # Split at breakpoints
    segments = []
    prev = 0
    for bp in sorted(breakpoints):
        segments.append((chunks[prev:bp + 1], embeddings[prev:bp + 1]))
        prev = bp + 1
    if prev < len(chunks):
        segments.append((chunks[prev:], embeddings[prev:]))

    results = []
    for seg_chunks, seg_emb in segments:
        seg_len = sum(len(c) for c in seg_chunks)
        if seg_len >= max_length and len(seg_chunks) > 1:
            results.extend(recursive_chunk(seg_chunks, seg_emb, max_length, percentile))
        else:
            results.append(" ".join(seg_chunks))

    return results


def cluster_chunks(texts: list[str], n_clusters: int = 6) -> list[int]:
    """Hierarchical clustering for semantic grouping."""
    if len(texts) < 2:
        return [0] * len(texts)

    n_clusters = min(n_clusters, len(texts))
    embeddings = embed(texts)
    distances = pdist(embeddings, metric="cosine")
    labels = cut_tree(linkage(distances, method="average"), n_clusters=n_clusters)
    return labels.ravel().tolist()


def label_clusters(chunks: list[dict]) -> dict[int, str]:
    """Generate short labels for each cluster using LLM."""
    model = init_chat_model("gpt-4o-mini", temperature=0)

    grouped = defaultdict(list)
    for chunk in chunks:
        grouped[chunk["metadata"]["cluster_id"]].append(chunk["text"])

    labels = {}
    for cluster_id, texts in grouped.items():
        combined = " ".join(texts)[:3000]
        prompt = (
            "Summarize what this text is about in 5 words or less. "
            f"Be specific to the policy topic.\n\n{combined}"
        )
        try:
            response = model.invoke([HumanMessage(content=prompt)])
            labels[cluster_id] = response.content.strip()
        except Exception as e:
            logger.error(f"Failed to label cluster {cluster_id}: {e}")
            labels[cluster_id] = f"cluster_{cluster_id}"

    return labels


def chunk_document(text: str, file_name: str, n_clusters: int = 6) -> list[dict]:
    """Process a single document into chunks with metadata."""
    if len(text.strip()) < 100:
        return [{"text": text.strip(), "metadata": {"file_name": file_name, "chunk_index": 0, "cluster_id": 0}}]

    initial = initial_split(text)
    if len(initial) < 2:
        return [{"text": text.strip(), "metadata": {"file_name": file_name, "chunk_index": 0, "cluster_id": 0}}]

    embeddings = embed(initial)
    final_texts = recursive_chunk(initial, embeddings)
    final_texts = [t.strip() for t in final_texts if t.strip()]

    cluster_ids = cluster_chunks(final_texts, n_clusters)

    return [
        {
            "text": chunk,
            "metadata": {
                "file_name": file_name,
                "chunk_index": i,
                "cluster_id": cluster_ids[i],
            },
        }
        for i, chunk in enumerate(final_texts)
    ]


def load_documents(data_dir: Path) -> list[tuple[str, str]]:
    """Load .txt and .md files from directory."""
    docs = []
    if not data_dir.exists():
        logger.error(f"Directory not found: {data_dir}")
        return docs

    for pattern in ["*.txt", "*.md"]:
        for path in data_dir.glob(pattern):
            try:
                docs.append((path.name, path.read_text(encoding="utf-8")))
                logger.info(f"Loaded: {path.name}")
            except Exception as e:
                logger.error(f"Failed to load {path.name}: {e}")

    return docs


def save_chunks_backup(chunks: list[dict], backup_path: Path) -> bool:
    """Save chunks to JSON file as backup before uploading.
    
    Args:
        chunks: List of chunk dicts with text and metadata.
        backup_path: Path to save the JSON backup.
        
    Returns:
        True if saved successfully, False otherwise.
    """
    try:
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        logger.info(f"Backup saved: {backup_path} ({len(chunks)} chunks)")
        return True
    except Exception as e:
        logger.error(f"Failed to save backup: {e}")
        return False


def load_chunks_backup(backup_path: Path) -> list[dict] | None:
    """Load chunks from JSON backup file.
    
    Args:
        backup_path: Path to the JSON backup.
        
    Returns:
        List of chunk dicts if loaded successfully, None otherwise.
    """
    if not backup_path.exists():
        return None
    
    try:
        with open(backup_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)
        logger.info(f"Loaded backup: {backup_path} ({len(chunks)} chunks)")
        return chunks
    except Exception as e:
        logger.error(f"Failed to load backup: {e}")
        return None


def main():
    logger.info("Starting ingestion")

    settings = get_settings()
    
    # Paths
    data_dir = settings.data_dir / "policies"
    backup_path = settings.data_dir / "chunks_backup.json"
    
    # Check for existing backup (useful if previous upload failed)
    existing_chunks = load_chunks_backup(backup_path)
    if existing_chunks:
        logger.info(f"Found existing backup with {len(existing_chunks)} chunks")
        use_backup = input("Use existing backup? (y/n): ").strip().lower() == "y"
        if use_backup:
            all_chunks = existing_chunks
        else:
            existing_chunks = None
    
    # Process documents if no backup used
    if not existing_chunks or not use_backup:
        logger.info(f"Loading documents from {data_dir}")
        documents = load_documents(data_dir)

        if not documents:
            logger.warning("No documents found in data/policies/")
            return

        logger.info(f"Processing {len(documents)} documents...")
        all_chunks = []
        for file_name, content in documents:
            chunks = chunk_document(content, file_name)
            all_chunks.extend(chunks)
            logger.info(f"  {file_name}: {len(chunks)} chunks")

        if not all_chunks:
            logger.error("No chunks generated")
            return

        # Generate cluster labels
        logger.info("Generating cluster labels...")
        cluster_labels = label_clusters(all_chunks)
        
        for chunk in all_chunks:
            cluster_id = chunk["metadata"]["cluster_id"]
            chunk["metadata"]["cluster_label"] = cluster_labels.get(cluster_id, "unknown")

        # Save backup before uploading
        logger.info(f"Total chunks: {len(all_chunks)}")
        save_chunks_backup(all_chunks, backup_path)

    # Initialize vector store and upload
    logger.info("Initializing vector store...")
    vector_store = VectorStore(
        client_type=settings.chroma_client_type,
        collection_name=settings.chroma_collection_name,
        persist_path=settings.chroma_persist_path,
        host=settings.chroma_host,
        port=settings.chroma_port,
        chroma_cloud_api_key=settings.chroma_cloud_api_key,
        chroma_tenant_id=settings.chroma_tenant_id,
        chroma_database=settings.chroma_database,
    )
    
    logger.info("Uploading to vector store...")
    try:
        vector_store.add_documents(
            documents=[c["text"] for c in all_chunks],
            metadatas=[c["metadata"] for c in all_chunks],
        )
        logger.info(f"✅ Ingestion complete: {len(all_chunks)} chunks uploaded")
        
        # Remove backup after successful upload
        if backup_path.exists():
            backup_path.unlink()
            logger.info("Backup removed after successful upload")
            
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}")
        logger.info(f"Chunks saved at: {backup_path}")
        logger.info("Re-run script to retry upload from backup")
        raise


if __name__ == "__main__":
    main()
