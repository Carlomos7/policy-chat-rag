'''Application Configurations'''
from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

CONFIG_DIR = Path(__file__).parent
APP_ROOT = CONFIG_DIR.parent
PROJECT_ROOT = APP_ROOT.parent

class ChromaClientType(str, Enum):
    """ChromaDB client type."""
    PERSISTENT = "persistent"
    HTTP = "http"
    CLOUD = "cloud"

class LLMProvider(str, Enum):
    """LLM provider type."""
    OPENAI = "openai"    # OpenAI or compatible (Ollama, LM Studio, vLLM)
    BEDROCK = "bedrock"  # AWS Bedrock

class CheckpointType(str, Enum):
    """Checkpoint type."""
    MEMORY = "memory"
    POSTGRES = "postgres"

class Settings(BaseSettings):
    '''Application settings'''

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra="ignore")
    
    # App
    app_name: str = "Policy RAG API"
    app_description: str = "RAG chatbot for policy insights"
    version: str = "0.1.0"
    debug_mode: bool = False

    # LLM Config
    llm_provider: LLMProvider = LLMProvider.BEDROCK
    llm_model: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 600
    
    # LLM - Provider-specific
    llm_base_url: str = ""          # OpenAI-compatible only
    llm_api_key: str = ""           # OpenAI-compatible only
    
    # AWS (Bedrock only)
    aws_region: str = "us-west-2"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    
    # ChromaDB
    chroma_client_type: ChromaClientType = ChromaClientType.PERSISTENT
    chroma_persist_path: Path = PROJECT_ROOT / "data" / "chroma_data"
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_tenant_id: str | None = None
    chroma_database: str | None = None
    chroma_cloud_api_key: str | None = None
    chroma_collection_name: str = "policy_rag_collection"

    # Checkpoint/ThreadManagement
    checkpoint_type: CheckpointType = CheckpointType.MEMORY
    checkpoint_postgres_url: str = ""

    # Logging
    log_level: str = "INFO"
    log_to_file: bool = False
    log_dir: Path = PROJECT_ROOT / "logs"
    logging_config_file: Path = CONFIG_DIR / "logging_conf.json"

    # Directories
    data_dir: Path = PROJECT_ROOT / "data"


@lru_cache
def get_settings() -> Settings:
    '''Get cached settings instance'''
    return Settings()