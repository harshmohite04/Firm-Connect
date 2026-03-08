from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Dict, Optional
from datetime import datetime

import httpx

from dependencies import limiter, INDIAN_KANOON_API_TOKEN, INDIAN_KANOON_BASE_URL
from database import case_law_bookmarks_collection
from schemas.case_law import CaseLawSearchRequest, CaseLawBookmarkRequest, CaseLawBookmarkUpdateRequest
from services.precedent_service import find_precedents
from utils.auth import get_current_user, get_user_id
from utils.validation import validate_case_id
from utils.error_handler import logger

router = APIRouter()


@router.post("/case-law/search")
@limiter.limit("20/minute")
async def case_law_search(
    request: Request,
    body: CaseLawSearchRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Proxy search to Indian Kanoon API."""
    try:
        if not INDIAN_KANOON_API_TOKEN:
            raise HTTPException(status_code=503, detail="Indian Kanoon API not configured")

        params = {"formInput": body.formInput, "pagenum": body.pagenum or 0}
        if body.doctypes:
            params["doctypes"] = body.doctypes
        if body.fromdate:
            params["fromdate"] = body.fromdate
        if body.todate:
            params["todate"] = body.todate
        if body.title:
            params["title"] = body.title
        if body.author:
            params["author"] = body.author

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{INDIAN_KANOON_BASE_URL}/search/",
                data=params,
                headers={"Authorization": f"Token {INDIAN_KANOON_API_TOKEN}"}
            )

        if resp.status_code != 200:
            logger.warning(f"Indian Kanoon search failed: {resp.status_code}")
            raise HTTPException(status_code=resp.status_code, detail="Indian Kanoon API error")

        return resp.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Case law search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search case law")


@router.get("/case-law/doc/{docId}")
@limiter.limit("30/minute")
async def case_law_doc(
    request: Request,
    docId: int,
    current_user: Dict = Depends(get_current_user)
):
    """Proxy document fetch to Indian Kanoon API."""
    try:
        if not INDIAN_KANOON_API_TOKEN:
            raise HTTPException(status_code=503, detail="Indian Kanoon API not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{INDIAN_KANOON_BASE_URL}/doc/{docId}/",
                headers={"Authorization": f"Token {INDIAN_KANOON_API_TOKEN}"}
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Indian Kanoon API error")

        return resp.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Case law doc error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch case document")


@router.get("/case-law/meta/{docId}")
@limiter.limit("30/minute")
async def case_law_meta(
    request: Request,
    docId: int,
    current_user: Dict = Depends(get_current_user)
):
    """Proxy document metadata fetch to Indian Kanoon API."""
    try:
        if not INDIAN_KANOON_API_TOKEN:
            raise HTTPException(status_code=503, detail="Indian Kanoon API not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{INDIAN_KANOON_BASE_URL}/docmeta/{docId}/",
                headers={"Authorization": f"Token {INDIAN_KANOON_API_TOKEN}"}
            )

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Indian Kanoon API error")

        return resp.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Case law meta error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch case metadata")


@router.post("/case-law/find-precedents/{caseId}")
@limiter.limit("5/minute")
async def find_precedents_from_embeddings(
    request: Request,
    caseId: str,
    force: bool = False,
    current_user: Dict = Depends(get_current_user)
):
    """Use case document embeddings to find relevant Indian Kanoon precedents."""
    try:
        validate_case_id(caseId)

        if not INDIAN_KANOON_API_TOKEN:
            raise HTTPException(status_code=503, detail="Indian Kanoon API not configured")

        return await find_precedents(caseId, force=force)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Find precedents error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to find precedents")


@router.post("/case-law/bookmark")
@limiter.limit("30/minute")
async def create_case_law_bookmark(
    request: Request,
    body: CaseLawBookmarkRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Save a case law bookmark."""
    try:
        user_id = get_user_id(current_user)

        existing = case_law_bookmarks_collection.find_one({
            "userId": user_id,
            "docId": body.docId
        })
        if existing:
            raise HTTPException(status_code=409, detail="Case already bookmarked")

        bookmark = {
            "userId": user_id,
            "docId": body.docId,
            "title": body.title,
            "court": body.court,
            "date": body.date,
            "practiceArea": body.practiceArea,
            "tags": body.tags or [],
            "notes": body.notes or "",
            "caseId": body.caseId,
            "createdAt": datetime.utcnow()
        }
        case_law_bookmarks_collection.insert_one(bookmark)

        logger.info(f"Case law bookmarked: docId={body.docId} by user {user_id}")
        return {"status": "success", "message": "Case bookmarked"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bookmark create error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to bookmark case")


@router.get("/case-law/bookmarks")
@limiter.limit("60/minute")
async def get_case_law_bookmarks(
    request: Request,
    current_user: Dict = Depends(get_current_user),
    caseId: Optional[str] = None
):
    """List user's bookmarked cases."""
    try:
        user_id = get_user_id(current_user)
        query = {"userId": user_id}
        if caseId:
            query["caseId"] = caseId

        bookmarks = list(
            case_law_bookmarks_collection.find(query)
            .sort("createdAt", -1)
            .limit(100)
        )

        for b in bookmarks:
            b["_id"] = str(b["_id"])

        return bookmarks

    except Exception as e:
        logger.error(f"Bookmark list error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch bookmarks")


@router.delete("/case-law/bookmark/{docId}")
@limiter.limit("30/minute")
async def delete_case_law_bookmark(
    request: Request,
    docId: int,
    current_user: Dict = Depends(get_current_user)
):
    """Remove a case law bookmark."""
    try:
        user_id = get_user_id(current_user)
        result = case_law_bookmarks_collection.delete_one({
            "userId": user_id,
            "docId": docId
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")

        return {"status": "success", "message": "Bookmark removed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bookmark delete error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove bookmark")


@router.patch("/case-law/bookmark/{docId}")
@limiter.limit("30/minute")
async def update_case_law_bookmark(
    request: Request,
    docId: int,
    body: CaseLawBookmarkUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Update notes/tags on a bookmark."""
    try:
        user_id = get_user_id(current_user)

        update_fields = {}
        if body.tags is not None:
            update_fields["tags"] = body.tags
        if body.notes is not None:
            update_fields["notes"] = body.notes
        if body.practiceArea is not None:
            update_fields["practiceArea"] = body.practiceArea

        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = case_law_bookmarks_collection.update_one(
            {"userId": user_id, "docId": docId},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")

        return {"status": "success", "message": "Bookmark updated"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bookmark update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update bookmark")
