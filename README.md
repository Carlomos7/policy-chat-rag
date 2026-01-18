# Policy Chat RAG

A Retrieval-Augmented Generation (RAG) chatbot that helps students, faculty, and staff at the University of Richmond search and understand official university policies by querying the comprehensive policy manual.

## What It Does

This application provides an intelligent interface for exploring University of Richmond's policy documents. Users can ask questions in natural language about:

- **Academic Policies** - integrity monitoring, credit requirements, course policies
- **Human Resources** - leave policies, benefits, employment, compensation
- **Information Technology & Security** - acceptable use, data security, access management
- **Financial Operations** - business expenses, contracts, grants, purchasing
- **Campus Operations** - building access, space allocation, facilities use
- **Student Life & Conduct** - hazing, campus protests, student privacy
- **Legal & Compliance** - FERPA, HIPAA, discrimination policies, conflicts of interest

The chatbot retrieves relevant policy sections from the official policy manual and provides accurate, cited answers based on the actual policy documents.

## How It Works

The application uses a **Retrieval-Augmented Generation (RAG)** architecture:

1. **Policy Documents** - Official University of Richmond policy documents (`.txt` files) stored in `data/policies/`
2. **Vector Database** - ChromaDB stores embedded representations of policy documents for semantic search
3. **LLM** - AWS Bedrock (Claude by default) generates contextual answers based on retrieved policy sections
4. **Web Interface** - Next.js frontend provides an intuitive chat interface
5. **API Backend** - FastAPI serves the RAG pipeline and conversation management

When a user asks a question, the system:
- Searches the vector database for relevant policy sections
- Retrieves the most relevant policy text based on semantic similarity
- Provides the LLM with the retrieved context
- Generates an accurate answer with proper citations from official policies

## Architecture

```
┌─────────────┐
│  Next.js    │ ← Web Interface (http://localhost:3000)
│   Frontend  │
└──────┬──────┘
       │
┌──────▼──────┐
│   FastAPI   │ ← REST API (http://localhost:8000)
│   Backend   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼───┐ ┌─▼─────┐
│Chroma│ │ AWS   │
│  DB  │ │Bedrock│
└──────┘ └───────┘
```

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (React/TypeScript)
- **Vector Database**: ChromaDB
- **LLM**: AWS Bedrock (Claude 3 Sonnet by default)
- **Conversation Management**: LangGraph with checkpointing
- **Containerization**: Docker & Docker Compose

## Quickstart (Docker Compose)

### 1. Clone the repository
```bash
git clone https://github.com/Carlomos7/policy-chat-rag.git
cd policy-chat-rag
```

### 2. Configure environment variables
Copy the example file and fill in your credentials:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (for Bedrock)
- `CHROMA_TENANT_ID`, `CHROMA_DATABASE`, `CHROMA_CLOUD_API_KEY` (for ChromaDB Cloud)

Other variables are pre-filled for Bedrock as default.

### 3. Start the stack
```bash
docker compose up --build
```

The application will be available at:
- **API**: http://localhost:8000
- **Web Interface**: http://localhost:3000

### 4. Stopping
```bash
docker compose down
```

## Requirements

- Docker & Docker Compose
- AWS Bedrock account (for LLM)
- ChromaDB Cloud account (for vector storage)

## Project Structure

```
policy-chat-rag/
├── api/                 # FastAPI backend service
│   └── src/
│       ├── main.py      # API endpoints
│       ├── services/    # RAG agent and policy retrieval
│       └── config/      # Settings and configuration
├── web/                 # Next.js frontend application
│   └── app/             # Next.js app router pages
├── data/
│   ├── policies/        # Policy document files (.txt)
│   └── chroma_data/     # ChromaDB local storage
├── docker-compose.yml   # Multi-container orchestration
└── README.md
```

## Documentation

For more detailed information about specific components:

- **[API Documentation](./api/README.md)** - FastAPI backend setup, endpoints, and configuration
- **[Web Documentation](./web/README.md)** - Next.js frontend setup, components, and development guide

## Notes

- All configuration is via the root `.env` file.
- Policy documents are stored as plain text files in `data/policies/`
- For local development or advanced usage, see the `api/` and `web/` subfolders.
- The vector database needs to be populated initially by indexing the policy documents.

## Development

For local development without Docker, see the individual documentation:
- **[API Development Guide](./api/README.md)** - Backend setup and API endpoints
- **[Web Development Guide](./web/README.md)** - Frontend setup and component documentation

---

For questions or issues, open an issue on GitHub.
