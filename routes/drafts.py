import uuid
from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Dict, List
from datetime import datetime

from dependencies import limiter, generator
from database import draft_sessions_collection, draft_versions_collection
from schemas.draft import (
    ConversationalDraftRequest, ConversationalDraftResponse,
    CreateDraftSessionRequest, DraftSessionResponse,
    CreateDraftVersionRequest, DraftVersionSummary, DraftVersionFull,
)
from utils.auth import get_current_user, get_user_id
from utils.validation import validate_case_id, validate_session_id, validate_string_length
from utils.error_handler import log_security_event, logger

router = APIRouter()


@router.post("/draft/session", response_model=DraftSessionResponse)
@limiter.limit("30/minute")
async def create_draft_session(
    request: Request,
    body: CreateDraftSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new conversational draft session"""
    try:
        validate_case_id(body.caseId)

        user_id = get_user_id(current_user)
        session_id = str(uuid.uuid4())
        new_session = {
            "session_id": session_id,
            "case_id": body.caseId,
            "user_id": user_id,
            "title": body.title,
            "template": body.template,
            "created_at": datetime.utcnow(),
            "messages": [],
            "current_document": ""
        }
        draft_sessions_collection.insert_one(new_session)

        logger.info(f"Draft session created: {session_id} by user {user_id}")

        return DraftSessionResponse(
            session_id=session_id,
            title=new_session["title"],
            template=new_session["template"],
            created_at=new_session["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating draft session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create draft session")


@router.get("/draft/sessions/{caseId}")
@limiter.limit("60/minute")
async def get_draft_sessions(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get all draft sessions for a case"""
    try:
        validate_case_id(caseId)

        user_id = get_user_id(current_user)
        cursor = draft_sessions_collection.find({
            "case_id": caseId,
            "user_id": user_id
        }).sort("created_at", -1)

        sessions = []
        for doc in cursor:
            sessions.append({
                "session_id": doc["session_id"],
                "title": doc.get("title", "Untitled Document"),
                "template": doc.get("template", "blank"),
                "created_at": doc.get("created_at", datetime.utcnow())
            })
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching draft sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch draft sessions")


@router.get("/draft/session/{sessionId}")
@limiter.limit("60/minute")
async def get_draft_session(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific draft session with messages and document content"""
    try:
        validate_session_id(sessionId)

        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")

        user_id = get_user_id(current_user)
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_DRAFT_ACCESS", {
                "user_id": user_id,
                "session_id": sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")

        return {
            "session_id": session_doc["session_id"],
            "title": session_doc.get("title", "Untitled Document"),
            "template": session_doc.get("template", "blank"),
            "created_at": session_doc.get("created_at", datetime.utcnow()),
            "messages": session_doc.get("messages", []),
            "current_document": session_doc.get("current_document", "")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching draft session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch draft session")


@router.post("/draft/chat", response_model=ConversationalDraftResponse)
@limiter.limit("20/minute")
async def conversational_draft(
    request: Request,
    body: ConversationalDraftRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Process conversational message and update document"""
    try:
        validate_case_id(body.caseId)
        validate_session_id(body.sessionId)
        validate_string_length(body.message, "Message", min_length=1, max_length=5000)

        user_id = get_user_id(current_user)

        session_doc = draft_sessions_collection.find_one({"session_id": body.sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")

        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_DRAFT_CHAT", {
                "user_id": user_id,
                "session_id": body.sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")

        history = session_doc.get("messages", [])
        template = session_doc.get("template", "blank")

        result = generator.generate_conversational(
            case_id=body.caseId,
            message=body.message,
            current_document=body.currentDocument,
            history=history[-6:],
            template=template
        )

        new_user_msg = {"role": "user", "content": body.message}
        new_ai_msg = {"role": "assistant", "content": result["ai_message"]}

        draft_sessions_collection.update_one(
            {"session_id": body.sessionId},
            {
                "$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}},
                "$set": {"current_document": result["document_content"]}
            }
        )

        # Auto-save version
        last_version = draft_versions_collection.find_one(
            {"session_id": body.sessionId},
            sort=[("version_number", -1)]
        )
        next_version = (last_version["version_number"] + 1) if last_version else 1
        draft_versions_collection.insert_one({
            "session_id": body.sessionId,
            "case_id": body.caseId,
            "user_id": user_id,
            "version_number": next_version,
            "content": result["document_content"],
            "label": None,
            "type": "auto",
            "created_at": datetime.utcnow()
        })

        return ConversationalDraftResponse(
            ai_message=result["ai_message"],
            document_content=result["document_content"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in conversational draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process draft request")


@router.get("/draft/session/{sessionId}/versions", response_model=List[DraftVersionSummary])
@limiter.limit("60/minute")
async def list_draft_versions(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    """List all versions for a draft session (without content for performance)"""
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        cursor = draft_versions_collection.find(
            {"session_id": sessionId},
            {"content": 0, "_id": 0}
        ).sort("version_number", -1)

        versions = []
        for doc in cursor:
            versions.append(DraftVersionSummary(
                version_number=doc["version_number"],
                label=doc.get("label"),
                type=doc.get("type", "auto"),
                created_at=doc.get("created_at", datetime.utcnow())
            ))
        return versions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing draft versions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list draft versions")


@router.get("/draft/session/{sessionId}/version/{versionNumber}", response_model=DraftVersionFull)
@limiter.limit("60/minute")
async def get_draft_version(
    request: Request,
    sessionId: str,
    versionNumber: int,
    current_user: Dict = Depends(get_current_user)
):
    """Get full content of a specific version"""
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        version_doc = draft_versions_collection.find_one({
            "session_id": sessionId,
            "version_number": versionNumber
        })
        if not version_doc:
            raise HTTPException(status_code=404, detail="Version not found")

        return DraftVersionFull(
            version_number=version_doc["version_number"],
            label=version_doc.get("label"),
            type=version_doc.get("type", "auto"),
            content=version_doc["content"],
            created_at=version_doc.get("created_at", datetime.utcnow())
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching draft version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch draft version")


@router.post("/draft/session/{sessionId}/version", response_model=DraftVersionSummary)
@limiter.limit("30/minute")
async def create_manual_draft_version(
    request: Request,
    sessionId: str,
    body: CreateDraftVersionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create a manual (named) version snapshot"""
    try:
        validate_session_id(sessionId)
        validate_string_length(body.label, "Label", min_length=1, max_length=100)
        user_id = get_user_id(current_user)

        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        last_version = draft_versions_collection.find_one(
            {"session_id": sessionId},
            sort=[("version_number", -1)]
        )
        next_version = (last_version["version_number"] + 1) if last_version else 1

        new_version = {
            "session_id": sessionId,
            "case_id": session_doc.get("case_id"),
            "user_id": user_id,
            "version_number": next_version,
            "content": body.content,
            "label": body.label,
            "type": "manual",
            "created_at": datetime.utcnow()
        }
        draft_versions_collection.insert_one(new_version)

        return DraftVersionSummary(
            version_number=next_version,
            label=body.label,
            type="manual",
            created_at=new_version["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating manual draft version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create draft version")


@router.post("/draft/session/{sessionId}/restore/{versionNumber}")
@limiter.limit("20/minute")
async def restore_draft_version(
    request: Request,
    sessionId: str,
    versionNumber: int,
    current_user: Dict = Depends(get_current_user)
):
    """Restore a version: copies its content into current_document and creates a new auto-version"""
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        version_doc = draft_versions_collection.find_one({
            "session_id": sessionId,
            "version_number": versionNumber
        })
        if not version_doc:
            raise HTTPException(status_code=404, detail="Version not found")

        restored_content = version_doc["content"]

        draft_sessions_collection.update_one(
            {"session_id": sessionId},
            {"$set": {"current_document": restored_content}}
        )

        last_version = draft_versions_collection.find_one(
            {"session_id": sessionId},
            sort=[("version_number", -1)]
        )
        next_version = (last_version["version_number"] + 1) if last_version else 1

        draft_versions_collection.insert_one({
            "session_id": sessionId,
            "case_id": session_doc.get("case_id"),
            "user_id": user_id,
            "version_number": next_version,
            "content": restored_content,
            "label": f"Restored from v{versionNumber}",
            "type": "auto",
            "created_at": datetime.utcnow()
        })

        return {
            "message": f"Restored to version {versionNumber}",
            "document_content": restored_content,
            "new_version_number": next_version
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring draft version: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to restore draft version")


@router.get("/draft/templates")
@limiter.limit("60/minute")
async def get_templates(request: Request):
    """Get available document templates"""
    from investigation.templates import get_all_metadata
    return get_all_metadata()
