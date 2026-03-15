import os
import re
import asyncio
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form, Depends
from typing import Dict, Optional
from datetime import datetime

from dependencies import limiter, generator
from database import document_status_collection, precedent_cache_collection
from schemas.document import GenerateDocumentRequest, SaveDocumentRequest, RetryIngestRequest
from services.ingestion_service import run_ingestion_background, process_zip_file, process_single_file
from ingestion.injector import ingest_document, delete_document
from utils.auth import get_current_user, get_user_id
from utils.validation import validate_case_id, sanitize_filename, validate_string_length
from utils.error_handler import log_security_event, logger

router = APIRouter()


@router.post("/ingest")
@limiter.limit("10/minute")
async def ingest_file(
    request: Request,
    file: UploadFile = File(...),
    caseId: str = Form(...),
    sessionId: Optional[str] = Form(None),
    isScanned: Optional[str] = Form("false"),
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(caseId)
        safe_filename = sanitize_filename(file.filename)

        MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        user_id = get_user_id(current_user)
        is_scanned = (isScanned or "false").lower() == "true"

        if safe_filename.lower().endswith('.zip'):
            logger.info(f"Processing zip file: {safe_filename}")
            ingested_files, failed_files = process_zip_file(file_content, safe_filename, caseId, user_id, is_scanned=is_scanned)

            return {
                "status": "processing",
                "message": f"Zip extracted. AI ingestion started in background.",
                "ingested_files": ingested_files,
                "failed_files": failed_files,
                "caseId": caseId
            }

        else:
            await file.seek(0)
            await process_single_file(file_content, safe_filename, caseId, user_id, session_id=sessionId or None, is_scanned=is_scanned)

            return {
                "status": "processing",
                "filename": safe_filename,
                "caseId": caseId,
                "message": "File uploaded. AI ingestion processing in background."
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingestion error: {e}", exc_info=True)

        if 'safe_filename' in locals() and 'caseId' in locals():
            document_status_collection.update_one(
                {"case_id": caseId, "filename": safe_filename},
                {"$set": {"status": "Failed", "error": "Processing failed", "last_updated": datetime.utcnow()}}
            )
        raise HTTPException(status_code=500, detail="File ingestion failed")


@router.get("/documents/session/{sessionId}")
@limiter.limit("60/minute")
async def get_session_documents(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get document statuses for documents uploaded within a specific chat session."""
    try:
        docs = list(document_status_collection.find(
            {"session_id": sessionId},
            {"_id": 0, "extracted_pages": 0}
        ))
        return docs
    except Exception as e:
        logger.error(f"Error fetching session documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch session documents")


@router.get("/documents/{caseId}")
@limiter.limit("60/minute")
async def get_documents_status(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(caseId)

        docs = list(document_status_collection.find(
            {"case_id": caseId},
            {"_id": 0, "extracted_pages": 0}
        ))
        return docs
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


@router.delete("/documents/{caseId}/{filename}")
@limiter.limit("30/minute")
async def delete_document_endpoint(
    request: Request,
    caseId: str,
    filename: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(caseId)
        safe_filename = sanitize_filename(filename)

        user_id = get_user_id(current_user)

        doc_status = document_status_collection.find_one({
            "case_id": caseId,
            "filename": safe_filename
        })

        if not doc_status:
            raise HTTPException(status_code=404, detail="Document not found")

        if doc_status.get("user_id") and doc_status.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_DOCUMENT_DELETE", {
                "user_id": user_id,
                "case_id": caseId,
                "filename": safe_filename
            })
            raise HTTPException(status_code=403, detail="Access denied")

        delete_document(caseId, safe_filename)

        result = document_status_collection.update_one(
            {"case_id": caseId, "filename": safe_filename},
            {"$set": {"status": "Archived", "last_updated": datetime.utcnow()}}
        )

        if result.matched_count == 0:
            logger.warning(f"Document {safe_filename} not found in MongoDB for case {caseId}")

        precedent_cache_collection.delete_one({"case_id": caseId})

        logger.info(f"Document archived: {safe_filename} for case {caseId} by user {user_id}")

        return {
            "status": "success",
            "message": f"Document {safe_filename} archived successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.post("/generate-document")
@limiter.limit("20/minute")
async def generate_document_endpoint(
    request: Request,
    body: GenerateDocumentRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)
        validate_string_length(body.instructions, "Instructions", min_length=10, max_length=5000)

        content = generator.generate(body.caseId, body.instructions)
        return {"content": content}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate document")


@router.post("/save-document")
@limiter.limit("20/minute")
async def save_document_endpoint(
    request: Request,
    body: SaveDocumentRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)
        safe_filename = sanitize_filename(body.filename)
        validate_string_length(body.content, "Content", min_length=1, max_length=500000)

        if not safe_filename.endswith(".txt") and not safe_filename.endswith(".md"):
            safe_filename += ".txt"

        file_location = f"documents/{safe_filename}"
        user_id = get_user_id(current_user)

        with open(file_location, "w", encoding="utf-8") as f:
            f.write(body.content)

        document_status_collection.update_one(
            {"case_id": body.caseId, "filename": safe_filename},
            {
                "$set": {
                    "status": "Processing",
                    "filename": safe_filename,
                    "case_id": body.caseId,
                    "user_id": user_id,
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )

        asyncio.create_task(run_ingestion_background(
            ingest_document,
            body.caseId,
            safe_filename,
            text=body.content,
            source_name=safe_filename,
            case_id=body.caseId
        ))

        logger.info(f"Document saved, background ingestion started: {safe_filename}")

        return {
            "status": "processing",
            "filename": safe_filename,
            "message": "Document saved. AI ingestion processing in background."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save document error: {e}", exc_info=True)
        if 'safe_filename' in locals():
            document_status_collection.update_one(
                {"case_id": body.caseId, "filename": safe_filename},
                {"$set": {"status": "Failed", "error": "Processing failed", "last_updated": datetime.utcnow()}}
            )
        raise HTTPException(status_code=500, detail="Failed to save document")


@router.post("/retry-ingest")
@limiter.limit("10/minute")
async def retry_ingest(
    request: Request,
    body: RetryIngestRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)
        safe_filename = sanitize_filename(body.filename)

        file_path = f"documents/{safe_filename}"
        if not os.path.exists(file_path):
            doc_status = document_status_collection.find_one(
                {"case_id": body.caseId, "filename": safe_filename}
            )
            if not doc_status:
                doc_status = document_status_collection.find_one(
                    {"case_id": body.caseId, "filename": {"$regex": re.escape(safe_filename), "$options": "i"}}
                )
            if doc_status and os.path.exists(f"documents/{doc_status['filename']}"):
                safe_filename = doc_status['filename']
                file_path = f"documents/{safe_filename}"
            else:
                for f_name in os.listdir("documents"):
                    if safe_filename.lower() in f_name.lower() or f_name.lower() in safe_filename.lower():
                        safe_filename = f_name
                        file_path = f"documents/{safe_filename}"
                        break
                else:
                    raise HTTPException(status_code=404, detail="File not found on server")

        from ingestion.loader import parse_file_with_pages
        page_data = parse_file_with_pages(file_path)
        content = "\n".join(p.get("text", "") for p in page_data)

        if not content.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file or file is empty.")

        document_status_collection.update_one(
            {"case_id": body.caseId, "filename": safe_filename},
            {
                "$set": {
                    "status": "Processing",
                    "last_updated": datetime.utcnow()
                }
            },
            upsert=True
        )

        asyncio.create_task(run_ingestion_background(
            ingest_document,
            body.caseId,
            safe_filename,
            text=content,
            source_name=safe_filename,
            case_id=body.caseId
        ))

        logger.info(f"Retry ingestion started: {safe_filename}")

        return {"status": "processing", "message": "Result initiated in background"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retry ingestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retry ingestion")
