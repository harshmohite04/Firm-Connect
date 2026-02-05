"""
Authentication utilities for FastAPI backend.
Verifies JWT tokens issued by the Node.js backend.
"""

from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import jwt
import os
from typing import Optional, Dict

security = HTTPBearer()

# JWT Secret must be shared with Node.js backend
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("CRITICAL: JWT_SECRET environment variable not set. Cannot start server.")


async def verify_token(credentials: HTTPAuthCredentials = Security(security)) -> Dict:
    """
    Verify JWT token and return decoded payload.
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        Decoded JWT payload containing user information
        
    Raises:
        HTTPException: 401 if token is invalid or expired
    """
    try:
        token = credentials.credentials
        
        # Decode and verify token
        payload = jwt.decode(
            token, 
            JWT_SECRET, 
            algorithms=["HS256"]
        )
        
        # Validate required fields
        if "id" not in payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user ID"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )
    except Exception as e:
        # Log the error but don't expose details to client
        print(f"[AUTH ERROR] Token verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


async def get_current_user(credentials: HTTPAuthCredentials = Security(security)) -> Dict:
    """
    Get current authenticated user from JWT token.
    Alias for verify_token for semantic clarity.
    
    Returns:
        User information from JWT payload
    """
    return await verify_token(credentials)


def get_user_id(user: Dict) -> str:
    """
    Extract user ID from decoded JWT payload.
    
    Args:
        user: Decoded JWT payload from verify_token
        
    Returns:
        User ID string
    """
    return user.get("id")
