import os
import time
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

# Cache configuration
_provider_cache = None
_cache_time = None
_cache_ttl = 60  # 60 second cache TTL

def _get_mongo_client():
    """Get MongoDB client from pymongo (already in dependencies)."""
    try:
        from pymongo import MongoClient
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            return None
        client = MongoClient(mongo_uri)
        return client
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB: {e}")
        return None

def load_provider_preset() -> Literal["deepseek", "openai"]:
    """
    Load the AI provider preset from MongoDB with in-memory cache.
    Falls back to LLM_PROVIDER environment variable if MongoDB unavailable.

    Returns:
        "deepseek" or "openai" preset
    """
    global _provider_cache, _cache_time

    # Check cache validity
    now = time.time()
    if _provider_cache is not None and _cache_time is not None:
        if (now - _cache_time) < _cache_ttl:
            return _provider_cache

    try:
        client = _get_mongo_client()
        if client:
            db_name = os.getenv("MONGO_DB_NAME", "lawfirmDB")
            db = client[db_name]
            settings_doc = db.systemsettings.find_one({"key": "ai_provider_preset"})

            if settings_doc and "value" in settings_doc:
                preset = settings_doc["value"].get("preset", "deepseek")
                if preset in ("deepseek", "openai"):
                    _provider_cache = preset
                    _cache_time = now
                    print(f"[system_settings] Loaded preset from MongoDB: {preset}")
                    return preset
    except Exception as e:
        print(f"[system_settings] Error reading from MongoDB: {e}. Falling back to env var.")

    # Fallback to environment variable
    fallback = os.getenv("LLM_PROVIDER", "deepseek").lower()
    if fallback not in ("deepseek", "openai"):
        fallback = "deepseek"

    _provider_cache = fallback
    _cache_time = now
    print(f"[system_settings] Using fallback preset from env: {fallback}")
    return fallback

def clear_cache():
    """Clear the in-memory provider preset cache."""
    global _provider_cache, _cache_time
    _provider_cache = None
    _cache_time = None
    print("[system_settings] Cache cleared")

def get_current_preset() -> dict:
    """Get the current preset configuration."""
    preset = load_provider_preset()
    return {
        "preset": preset,
        "main_llm": "deepseek-chat" if preset == "deepseek" else "gpt-4o-mini",
        "web_search": "serper" if preset == "deepseek" else "perplexity",
    }
