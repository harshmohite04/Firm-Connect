import os
import time
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

# Cache configuration
_provider_cache = None
_cache_time = None
_cache_ttl = 60  # 60 second cache TTL

# Per-user AI preset cache: { user_id: (preset_or_None, plan_or_None, timestamp) }
_user_preset_cache = {}
_user_cache_ttl = 60  # 60 second TTL per user

# Plan-based default preset cache
_plan_defaults_cache = None
_plan_defaults_cache_time = None
_plan_defaults_cache_ttl = 60

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
    Load per-user AI preset override and subscription plan from MongoDB with 60s TTL cache.
    Returns tuple: (preset_or_None, subscriptionPlan_or_None).
    """
    if not user_id:
        return None, None

    now = time.time()
    cached = _user_preset_cache.get(user_id)
    if cached is not None:
        preset_val, plan_val, cache_ts = cached
        if (now - cache_ts) < _user_cache_ttl:
            return preset_val, plan_val

    try:
        from bson import ObjectId
        client = _get_mongo_client()
        if client:
            db_name = os.getenv("MONGO_DB_NAME", "lawfirmDB")
            db = client[db_name]
            user_doc = db.users.find_one(
                {"_id": ObjectId(user_id)},
                {"aiPreset": 1, "subscriptionPlan": 1}
            )
            if user_doc:
                preset = user_doc.get("aiPreset")
                plan = user_doc.get("subscriptionPlan")
                if preset not in ("deepseek", "openai"):
                    preset = None
                _user_preset_cache[user_id] = (preset, plan, now)
                if preset:
                    print(f"[system_settings] User {user_id} override: {preset}, plan: {plan}")
                return preset, plan
    except Exception as e:
        print(f"[system_settings] Error loading user preset for {user_id}: {e}")

    _user_preset_cache[user_id] = (None, None, now)
    return None, None


def _load_plan_defaults() -> dict:
    """
    Load plan-based default presets (freePreset, paidPreset) from systemsettings.
    Returns dict with defaults: {"freePreset": "deepseek", "paidPreset": "openai"}
    """
    global _plan_defaults_cache, _plan_defaults_cache_time

    now = time.time()
    if _plan_defaults_cache is not None and _plan_defaults_cache_time is not None:
        if (now - _plan_defaults_cache_time) < _plan_defaults_cache_ttl:
            return _plan_defaults_cache

    defaults = {"freePreset": "deepseek", "paidPreset": "openai"}

    try:
        client = _get_mongo_client()
        if client:
            db_name = os.getenv("MONGO_DB_NAME", "lawfirmDB")
            db = client[db_name]
            settings_doc = db.systemsettings.find_one({"key": "ai_provider_preset"})
            if settings_doc and "value" in settings_doc:
                val = settings_doc["value"]
                free = val.get("freePreset")
                paid = val.get("paidPreset")
                if free in ("deepseek", "openai"):
                    defaults["freePreset"] = free
                if paid in ("deepseek", "openai"):
                    defaults["paidPreset"] = paid
    except Exception as e:
        print(f"[system_settings] Error loading plan defaults: {e}")

    _plan_defaults_cache = defaults
    _plan_defaults_cache_time = now
    return defaults


def get_effective_preset(user_id: str = None) -> Literal["deepseek", "openai"]:
    """
    Get the effective AI preset for a request.
    Priority:
      1. User's explicit aiPreset override
      2. Plan-based assignment (FREE_TRIAL → freePreset, paid plans → paidPreset)
      3. Global system setting fallback
    """
    if user_id:
        user_preset, user_plan = load_user_preset(user_id)
        # 1. Explicit user override takes priority
        if user_preset:
            return user_preset
        # 2. Plan-based assignment
        if user_plan:
            plan_defaults = _load_plan_defaults()
            if user_plan == "FREE_TRIAL":
                return plan_defaults["freePreset"]
            elif user_plan in ("STARTER", "PROFESSIONAL", "FIRM"):
                return plan_defaults["paidPreset"]
    # 3. Global fallback
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
    global _provider_cache, _cache_time, _plan_defaults_cache, _plan_defaults_cache_time
    _provider_cache = None
    _cache_time = None
    _user_preset_cache.clear()
    _plan_defaults_cache = None
    _plan_defaults_cache_time = None
    print("[system_settings] Cache cleared")

def get_current_preset() -> dict:
    """Get the current preset configuration."""
    preset = load_provider_preset()
    return {
        "preset": preset,
        "main_llm": "deepseek-chat" if preset == "deepseek" else "gpt-4o",
        "web_search": "serper" if preset == "deepseek" else "perplexity",
    }
