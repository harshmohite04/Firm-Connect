"""
Shared LLM factory with DeepSeek / OpenAI toggle.

Env vars:
  USE_OPENAI=true|false  (default: false -> DeepSeek)
  OPENAI_API_KEY          required when USE_OPENAI=true
  DEEPSEEK_API_KEY        required when USE_OPENAI=false
"""

import os
from openai import OpenAI


def _use_openai() -> bool:
    return os.getenv("USE_OPENAI", "false").lower().strip() == "true"


def get_llm_client() -> OpenAI:
    """Return an OpenAI-compatible client configured for the active provider."""
    if _use_openai():
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com",
    )


def get_model_name() -> str:
    """Return the model name for the active provider."""
    if _use_openai():
        return os.getenv("OPENAI_MODEL", "gpt-4o")
    return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


def get_langchain_llm(temperature: float = 0.1):
    """Return a LangChain ChatOpenAI instance for the active provider."""
    from langchain_openai import ChatOpenAI

    if _use_openai():
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=temperature,
        )
    return ChatOpenAI(
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com",
        temperature=temperature,
    )
