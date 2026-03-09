# --- Environment Setup (Must be first) ---
import os
from dotenv import load_dotenv

# First load the central switcher
load_dotenv(".env")
app_env = os.getenv("APPLICATION_ENV", "development")

# Then load the specific environment variables
env_file = f".env.{app_env}"
load_dotenv(env_file, override=True)

print(f"Loaded environment: {app_env} from {env_file}")

# --- Thread Pool for OCR/blocking tasks ---
import asyncio
import concurrent.futures
asyncio.get_event_loop().set_default_executor(
    concurrent.futures.ThreadPoolExecutor(max_workers=8)
)

# --- App Setup ---
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from dependencies import limiter
from utils.error_handler import (
    http_exception_handler,
    general_exception_handler,
    logger,
)

app = FastAPI(
    title="LawFirmAI API",
    version="1.1.0",
    description="Secure API for law firm case management with RAG and document generation"
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# --- CORS Configuration ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]
logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# --- Mount Routers ---
from routes.system import router as system_router
from routes.chat import router as chat_router
from routes.documents import router as documents_router
from routes.document_viewer import router as document_viewer_router
from routes.drafts import router as drafts_router
from routes.investigation import router as investigation_router
from routes.case_law import router as case_law_router

app.include_router(system_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(document_viewer_router)
app.include_router(drafts_router)
app.include_router(investigation_router)
app.include_router(case_law_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
