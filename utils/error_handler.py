"""
Centralized error handling and logging utilities.
Provides secure error responses that don't leak sensitive information.
"""

import logging
import traceback
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from typing import Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("law_firm_connect")


async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle HTTP exceptions with consistent format.
    """
    logger.warning(
        f"HTTP {exc.status_code}: {exc.detail} | "
        f"Path: {request.url.path} | "
        f"Method: {request.method}"
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors from Pydantic models.
    """
    logger.warning(
        f"Validation error: {exc.errors()} | "
        f"Path: {request.url.path}"
    )
    
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Invalid request data",
            "errors": exc.errors()
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Handle unexpected exceptions securely.
    Logs full details but returns generic message to client.
    """
    # Log full error details internally
    logger.error(
        f"Unexpected error: {str(exc)} | "
        f"Path: {request.url.path} | "
        f"Method: {request.method}",
        exc_info=True
    )
    
    # Return generic error to client (don't leak internal details)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


def log_security_event(event_type: str, details: dict):
    """
    Log security-relevant events for audit trail.
    
    Args:
        event_type: Type of security event (e.g., 'AUTH_FAILURE', 'RATE_LIMIT')
        details: Additional context about the event
    """
    logger.warning(
        f"SECURITY EVENT: {event_type} | "
        f"Details: {details}"
    )


def safe_error_detail(error: Exception, fallback: str = "An error occurred") -> str:
    """
    Convert exception to safe error message for client.
    Only returns detailed messages for known safe exceptions.
    
    Args:
        error: The exception that occurred
        fallback: Generic fallback message
        
    Returns:
        Safe error message string
    """
    # Log full error internally
    logger.error(f"Error occurred: {str(error)}", exc_info=True)
    
    # Return generic message to client
    if isinstance(error, HTTPException):
        return error.detail
    else:
        return fallback
