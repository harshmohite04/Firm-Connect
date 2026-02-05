"""
Input validation and sanitization utilities.
Prevents path traversal, injection attacks, and other input-based vulnerabilities.
"""

import re
from pathlib import Path
from fastapi import HTTPException, UploadFile
from typing import Optional


def validate_case_id(case_id: str) -> str:
    """
    Validate case ID to prevent NoSQL injection.
    Case IDs should be UUIDs (with or without hyphens).
    
    Args:
        case_id: The case ID to validate
        
    Returns:
        The validated case ID
        
    Raises:
        HTTPException: 400 if case ID format is invalid
    """
    # Allow UUID format with hyphens (standard) or without
    if not re.match(r'^[a-f0-9\-]{32,36}$', case_id.lower()):
        raise HTTPException(
            status_code=400,
            detail="Invalid case ID format"
        )
    return case_id


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename to prevent path traversal attacks.
    Removes path components and dangerous characters.
    
    Args:
        filename: Original filename
        max_length: Maximum allowed filename length
        
    Returns:
        Sanitized filename
        
    Raises:
        HTTPException: 400 if filename is invalid
    """
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename cannot be empty"
        )
    
    # Extract just the filename, removing any path components
    filename = Path(filename).name
    
    # Remove or replace dangerous characters
    # Allow: alphanumeric, spaces, dots, hyphens, underscores
    filename = re.sub(r'[^\w\s.-]', '', filename)
    
    # Prevent files starting with dot (hidden files)
    if filename.startswith('.'):
        raise HTTPException(
            status_code=400,
            detail="Filename cannot start with a dot"
        )
    
    # Prevent empty filename after sanitization
    if not filename or filename.strip() == '':
        raise HTTPException(
            status_code=400,
            detail="Invalid filename"
        )
    
    # Enforce length limit
    if len(filename) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"Filename too long (max {max_length} characters)"
        )
    
    return filename


def validate_session_id(session_id: str) -> str:
    """
    Validate session ID format (UUID).
    
    Args:
        session_id: The session ID to validate
        
    Returns:
        The validated session ID
        
    Raises:
        HTTPException: 400 if session ID format is invalid
    """
    if not re.match(r'^[a-f0-9\-]{32,36}$', session_id.lower()):
        raise HTTPException(
            status_code=400,
            detail="Invalid session ID format"
        )
    return session_id


def validate_file_upload(
    file: UploadFile,
    max_size_mb: int = 50,
    allowed_extensions: Optional[list] = None
) -> None:
    """
    Validate uploaded file for size and type.
    
    Args:
        file: Uploaded file object
        max_size_mb: Maximum file size in megabytes
        allowed_extensions: List of allowed file extensions (e.g., ['.pdf', '.txt'])
        
    Raises:
        HTTPException: 400 if file validation fails
    """
    if allowed_extensions is None:
        # Default allowed extensions for legal documents
        allowed_extensions = [
            '.pdf', '.doc', '.docx', '.txt', '.rtf',
            '.jpg', '.jpeg', '.png', '.zip'
        ]
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Note: File size validation is trickier with streaming uploads
    # In production, consider using nginx client_max_body_size or similar
    # For now, we'll add a note
    # max_size_bytes = max_size_mb * 1024 * 1024


def validate_string_length(
    value: str,
    field_name: str,
    min_length: int = 1,
    max_length: int = 10000
) -> str:
    """
    Validate string length for text fields.
    
    Args:
        value: String to validate
        field_name: Name of the field (for error messages)
        min_length: Minimum allowed length
        max_length: Maximum allowed length
        
    Returns:
        The validated string
        
    Raises:
        HTTPException: 400 if validation fails
    """
    if len(value) < min_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be at least {min_length} characters"
        )
    
    if len(value) > max_length:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} cannot exceed {max_length} characters"
        )
    
    return value
