import os
import time
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

# Cache configuration
_provider_cache = None
_cache_time = None
_cache_ttl = 60  # 60 second cache TTL

# Per-user AI preset cache: { user_id: (preset_or_None, timestamp) }
_user_preset_cache = {}
_user_cache_ttl = 60  # 60 second TTL per user

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

def load_user_preset(user_id: str):
    """
    Load per-user AI preset override from MongoDB with 60s TTL cache.
    Returns 'deepseek', 'openai', or None (no override).
    """
    if not user_id:
        return None

    now = time.time()
    cached = _user_preset_cache.get(user_id)
    if cached is not None:
        preset_val, cache_ts = cached
        if (now - cache_ts) < _user_cache_ttl:
            return preset_val

    try:
        from bson import ObjectId
        client = _get_mongo_client()
        if client:
            db_name = os.getenv("MONGO_DB_NAME", "lawfirmDB")
            db = client[db_name]
            user_doc = db.users.find_one({"_id": ObjectId(user_id)}, {"aiPreset": 1})
            if user_doc:
                preset = user_doc.get("aiPreset")
                if preset in ("deepseek", "openai"):
                    _user_preset_cache[user_id] = (preset, now)
                    print(f"[system_settings] User {user_id} override: {preset}")
                    return preset
                else:
                    _user_preset_cache[user_id] = (None, now)
                    return None
    except Exception as e:
        print(f"[system_settings] Error loading user preset for {user_id}: {e}")

    _user_preset_cache[user_id] = (None, now)
    return None


def get_effective_preset(user_id: str = None) -> Literal["deepseek", "openai"]:
    """
    Get the effective AI preset for a request.
    Checks user override first, falls back to global system setting.
    """
    if user_id:
        user_preset = load_user_preset(user_id)
        if user_preset:
            return user_preset
    return load_provider_preset()


def clear_user_cache(user_id: str = None):
    """Clear per-user preset cache. If user_id is None, clears all user caches."""
    if user_id:
        _user_preset_cache.pop(user_id, None)
        print(f"[system_settings] User cache cleared for {user_id}")
    else:
        _user_preset_cache.clear()
        print("[system_settings] All user caches cleared")


def clear_cache():
    """Clear the in-memory provider preset cache."""
    global _provider_cache, _cache_time
    _provider_cache = None
    _cache_time = None
    _user_preset_cache.clear()
    print("[system_settings] Cache cleared")

def get_current_preset() -> dict:
    """Get the current preset configuration."""
    preset = load_provider_preset()
    return {
        "preset": preset,
        "main_llm": "deepseek-chat" if preset == "deepseek" else "gpt-4o-mini",
        "web_search": "serper" if preset == "deepseek" else "perplexity",
    }
