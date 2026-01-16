'''Application Configurations'''
from enum import Enum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SRC_ROOT = Path(__file__).parent
PROJECT_ROOT = SRC_ROOT.parent

class ChromaClientType(str, Enum):
    """ChromaDB client type."""
    PERSISTENT = "persistent"
    HTTP = "http"
    CLOUD = "cloud"

class LLMProvider(str, Enum):
    """LLM provider type."""
    OPENAI = "openai"    # OpenAI or compatible (Ollama, LM Studio, vLLM)
    BEDROCK = "bedrock"  # AWS Bedrock

class Settings(BaseSettings):
    '''Application settings'''

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')
    
    # App
    app_name: str = "Policy RAG API"
    app_description: str = "RAG chatbot for policy insights"
    version: str = "0.1.0"
    debug_mode: bool = False

    # LLM Config
    llm_provider: LLMProvider = LLMProvider.BEDROCK
    llm_model: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    llm_temperature: float = 0.1
    llm_max_tokens: int = 1000
    
    # LLM - Provider-specific
    llm_base_url: str = ""          # OpenAI-compatible only
    llm_api_key: str = ""           # OpenAI-compatible only
    
    # AWS (Bedrock only)
    aws_region: str = "us-west-2"
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    
    # ChromaDB
    chroma_client_type: ChromaClientType = ChromaClientType.PERSISTENT
    chroma_persist_path: Path = Path("./chroma_data")
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_tenant_id: str | None = None
    chroma_database: str | None = None
    chroma_cloud_api_key: str | None = None
    chroma_collection_name: str = "policy_rag_collection"

    # Directories
    data_dir: Path = PROJECT_ROOT / "data"

    def get_llm_kwargs(self) -> dict:
        """Get provider-specific kwargs for LLMClient."""
        kwargs = {
            "temperature": self.llm_temperature,
            "max_tokens": self.llm_max_tokens,
        }
        
        if self.llm_provider == LLMProvider.OPENAI:
            if self.llm_base_url:
                kwargs["base_url"] = self.llm_base_url
            # For local models, use dummy API key if not provided
            kwargs["api_key"] = self.llm_api_key or "not-needed"
        
        return kwargs

@lru_cache
def get_settings() -> Settings:
    '''Get cached settings instance'''
    return Settings()