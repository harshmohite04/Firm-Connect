from fastapi import APIRouter, Request, HTTPException
from datetime import datetime

from dependencies import limiter
from utils.error_handler import logger
from utils.system_settings import clear_cache as clear_settings_cache

router = APIRouter()


@router.get("/health")
@limiter.limit("30/minute")
async def health(request: Request):
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.post("/api/admin/reload-config")
@limiter.limit("5/minute")
async def reload_config(request: Request):
    """Reload system configuration cache (called by Admin Dashboard after settings change)"""
    try:
        clear_settings_cache()
        return {"status": "success", "message": "Configuration cache cleared"}
    except Exception as e:
        logger.error(f"Error reloading config: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload configuration")


@router.post("/api/admin/clear-user-cache/{user_id}")
@limiter.limit("30/minute")
async def clear_user_preset_cache(request: Request, user_id: str):
    """Clear per-user AI preset cache (called by Admin Dashboard after preset change)."""
    from utils.system_settings import clear_user_cache
    clear_user_cache(user_id)
    return {"status": "ok", "message": f"Cache cleared for user {user_id}"}
