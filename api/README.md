# Policy RAG API

FastAPI backend service that powers the Policy Chat RAG application. Provides REST endpoints for querying University of Richmond policies using Retrieval-Augmented Generation (RAG).

## Overview

This API service implements a RAG (Retrieval-Augmented Generation) pipeline that:

1. **Retrieves** relevant policy documents from ChromaDB vector database using semantic search
2. **Generates** contextual answers using AWS Bedrock (Claude) or OpenAI-compatible models
3. **Manages** conversation threads with checkpointing for multi-turn conversations
4. **Returns** answers with source citations from official policy documents

## Architecture

The API is built on:

- **FastAPI** - Modern, fast web framework for building APIs
- **LangChain/LangGraph** - Agent orchestration and conversation management
- **ChromaDB** - Vector database for policy document embeddings
- **AWS Bedrock** (default) - LLM provider for generating responses
- **PostgreSQL** (optional) - Persistent checkpoint storage for conversation threads

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

### `POST /threads`
Create a new conversation thread.

**Response:**
```json
{
  "thread_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `POST /chat`
Send a question and get a response (non-streaming).

**Request:**
```json
{
  "question": "What is the bereavement leave policy?",
  "thread_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "answer": "According to the University of Richmond bereavement leave policy...",
  "sources": [
    "bereavement_leave_policy.txt",
    "holiday_leave_policy.txt"
  ],
  "thread_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `POST /chat/stream`
Send a question and get a streaming response.

**Request:**
```json
{
  "question": "What is the bereavement leave policy?",
  "thread_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"content": "According", "thread_id": "..."}

data: {"content": " to", "thread_id": "..."}

data: {"sources": ["bereavement_leave_policy.txt"], "thread_id": "..."}
```

## Configuration

Configuration is managed via environment variables or a `.env` file. Key settings:

### Application Settings
- `APP_NAME` - Application name (default: "Policy RAG API")
- `DEBUG_MODE` - Enable debug mode with auto-reload (default: false)
- `HOST` - Server host (default: "0.0.0.0")
- `PORT` - Server port (default: 8000)

### LLM Configuration
- `LLM_PROVIDER` - Provider type: `bedrock` or `openai` (default: `bedrock`)
- `LLM_MODEL` - Model identifier (default: `anthropic.claude-3-sonnet-20240229-v1:0`)
- `LLM_TEMPERATURE` - Temperature for generation (default: 0.1)
- `LLM_MAX_TOKENS` - Maximum tokens in response (default: 600)

### AWS Bedrock (when `LLM_PROVIDER=bedrock`)
- `AWS_REGION` - AWS region (default: `us-west-2`)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

### OpenAI-Compatible (when `LLM_PROVIDER=openai`)
- `LLM_BASE_URL` - Base URL for API
- `LLM_API_KEY` - API key

### ChromaDB Configuration
- `CHROMA_CLIENT_TYPE` - Client type: `persistent`, `http`, or `cloud` (default: `persistent`)
- `CHROMA_PERSIST_PATH` - Path for persistent storage (default: `../data/chroma_data`)
- `CHROMA_HOST` - ChromaDB server host (for HTTP client)
- `CHROMA_PORT` - ChromaDB server port (for HTTP client)
- `CHROMA_TENANT_ID` - Tenant ID (for Cloud client)
- `CHROMA_DATABASE` - Database name (for Cloud client)
- `CHROMA_CLOUD_API_KEY` - API key (for Cloud client)
- `CHROMA_COLLECTION_NAME` - Collection name (default: `policy_rag_collection`)

### Checkpointing
- `CHECKPOINT_TYPE` - Type: `memory` or `postgres` (default: `memory`)
- `CHECKPOINT_POSTGRES_URL` - PostgreSQL connection string (required for `postgres` type)

### Logging
- `LOG_LEVEL` - Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`)
- `LOG_TO_FILE` - Enable file logging (default: false)
- `LOG_DIR` - Directory for log files (default: `../logs`)

## Running the API

### Using Docker Compose (from project root)
```bash
docker compose up api
```

### Local Development

#### Prerequisites
- Python 3.13+
- UV package manager (recommended) or pip

#### Installation

1. **Install dependencies with UV:**
```bash
uv sync
```

2. **Or install with pip:**
```bash
pip install -e .
```

#### Run the Server

**With UV:**
```bash
uv run python run.py
```

**Or with uvicorn directly:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

#### API Documentation

FastAPI provides automatic interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs

## Project Structure

```
api/
├── app/
│   ├── config/
│   │   ├── settings.py          # Application configuration
│   │   ├── logging.py           # Logging setup
│   │   └── logging_conf.json    # Logging configuration
│   ├── services/
│   │   ├── agent.py             # LangChain/LangGraph agent
│   │   └── vector_store.py      # ChromaDB integration
│   ├── scripts/                 # Utility scripts
│   ├── dependencies.py          # FastAPI dependencies
│   ├── main.py                  # FastAPI app and routes
│   ├── prompts.py               # System prompts for agent
│   └── schemas.py               # Pydantic request/response models
├── run.py                       # Application entrypoint
├── pyproject.toml               # Python project configuration
├── uv.lock                      # Dependency lock file
├── Dockerfile                   # Docker image definition
└── README.md                    # This file
```

## Key Components

### Agent Service (`app/services/agent.py`)
The `PolicyAgent` class implements the RAG agent using LangChain/LangGraph:
- Manages conversation threads with checkpointing
- Retrieves relevant policy documents from vector store
- Generates contextual answers using the LLM
- Tracks sources for citation

### Vector Store Service (`app/services/vector_store.py`)
Handles ChromaDB integration:
- Manages document embeddings
- Performs semantic search queries
- Returns ranked policy document chunks

### Main Application (`app/main.py`)
FastAPI application with:
- REST API endpoints
- CORS middleware
- Lifespan management (startup/shutdown)
- Error handling

## Development

### Code Style
The project uses modern Python 3.13+ features and type hints. Follow PEP 8 guidelines.

### Logging
Logs are written to console by default. Set `LOG_TO_FILE=true` to enable file logging in `logs/` directory.

## Requirements

- Python 3.13+
- FastAPI 0.128.0+
- LangChain 1.2.4+
- LangGraph 1.0.6+
- ChromaDB 1.4.1+
- AWS SDK (boto3) for Bedrock support

See `pyproject.toml` for complete dependency list.

---

For questions or issues, open an issue on GitHub.
