import os
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import Dict

from dependencies import limiter
from database import document_status_collection
from utils.auth import get_current_user
from utils.validation import validate_case_id, sanitize_filename
from utils.error_handler import logger

router = APIRouter()


@router.get("/document-text/{caseId}/{filename}")
@limiter.limit("60/minute")
async def get_document_text(
    request: Request,
    caseId: str,
    filename: str,
    current_user: Dict = Depends(get_current_user)
):
    """Return the parsed text content of a document for the in-app viewer."""
    try:
        validate_case_id(caseId)
        safe_filename = sanitize_filename(filename)

        doc_status = document_status_collection.find_one({
            "case_id": caseId,
            "filename": safe_filename,
            "status": "Ready"
        })

        if not doc_status:
            raise HTTPException(status_code=404, detail="Document not found")

        # Serve from cached extracted_pages if available
        if doc_status.get("extracted_pages"):
            return {
                "filename": safe_filename,
                "pages": doc_status["extracted_pages"]
            }

        # Fallback: re-parse
        file_path = f"documents/{safe_filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")

        from ingestion.loader import parse_file_with_pages
        pages = parse_file_with_pages(file_path)

        # Cache for future requests
        document_status_collection.update_one(
            {"case_id": caseId, "filename": safe_filename},
            {"$set": {"extracted_pages": pages}}
        )

        return {
            "filename": safe_filename,
            "pages": pages
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document text error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to read document")


@router.get("/download/{caseId}/{filename}")
@limiter.limit("30/minute")
async def download_document(
    request: Request,
    caseId: str,
    filename: str,
    current_user: Dict = Depends(get_current_user)
):
    """Secure document download with authentication and ownership verification."""
    try:
        validate_case_id(caseId)
        safe_filename = sanitize_filename(filename)

        doc_status = document_status_collection.find_one({
            "case_id": caseId,
            "filename": safe_filename,
            "status": "Ready"
        })

        if not doc_status:
            raise HTTPException(status_code=404, detail="Document not found")

        file_path = f"documents/{safe_filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")

        return FileResponse(
            path=file_path,
            filename=safe_filename,
            media_type='application/octet-stream'
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to download document")
