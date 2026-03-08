import os
import re
import uuid
import json as json_module
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, List
from datetime import datetime, timedelta

from dependencies import limiter
from database import chat_collection
from schemas.chat import (
    ChatRequest, CreateSessionRequest, SessionResponse,
    ContextItem, ChatResponse, CheckSourcesRequest,
    Message, ChatHistoryResponse,
)
from rag.rag import ask, ask_stream
from utils.auth import get_current_user, get_user_id
from utils.validation import validate_case_id, validate_session_id, validate_string_length
from utils.error_handler import log_security_event, logger

router = APIRouter()


@router.post("/chat/session", response_model=SessionResponse)
@limiter.limit("30/minute")
async def create_session(
    request: Request,
    body: CreateSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)

        session_id = str(uuid.uuid4())
        new_session = {
            "session_id": session_id,
            "case_id": body.caseId,
            "user_id": get_user_id(current_user),
            "title": body.title,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=24),
            "messages": []
        }
        chat_collection.insert_one(new_session)

        logger.info(f"Session created: {session_id} for user {get_user_id(current_user)}")

        return SessionResponse(
            session_id=session_id,
            title=new_session["title"],
            created_at=new_session["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/chat/sessions/{caseId}", response_model=List[SessionResponse])
@limiter.limit("60/minute")
async def get_sessions(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(caseId)

        user_id = get_user_id(current_user)
        cursor = chat_collection.find({
            "case_id": caseId,
            "user_id": user_id
        }).sort("created_at", -1)

        sessions = []
        for doc in cursor:
            if "session_id" not in doc:
                continue
            sessions.append(SessionResponse(
                session_id=doc["session_id"],
                title=doc.get("title", "Untitled Chat"),
                created_at=doc.get("created_at", datetime.utcnow())
            ))
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@router.get("/chat/history/{sessionId}", response_model=ChatHistoryResponse)
@limiter.limit("60/minute")
async def get_chat_history(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_session_id(sessionId)

        session_doc = chat_collection.find_one({"session_id": sessionId})

        # Fallback for legacy sessions
        if not session_doc:
            session_doc = chat_collection.find_one({
                "case_id": sessionId,
                "session_id": {"$exists": False}
            })

        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")

        user_id = get_user_id(current_user)
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_ACCESS", {
                "user_id": user_id,
                "session_id": sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")

        if "expires_at" in session_doc:
            if session_doc["expires_at"] < datetime.utcnow():
                raise HTTPException(status_code=410, detail="Session expired")

        if "messages" not in session_doc:
            return ChatHistoryResponse(history=[])

        messages = [
            Message(
                role=m["role"],
                content=m["content"],
                contexts=[ContextItem(**c) for c in m.get("contexts", [])] if m.get("contexts") else None
            )
            for m in session_doc["messages"]
        ]
        return ChatHistoryResponse(history=messages)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)
        if body.sessionId:
            validate_session_id(body.sessionId)
        validate_string_length(body.message, "Message", min_length=1, max_length=5000)

        session_doc = None
        user_id = get_user_id(current_user)

        if body.sessionId:
            session_doc = chat_collection.find_one({"session_id": body.sessionId})
            if session_doc and session_doc.get("user_id") != user_id:
                log_security_event("UNAUTHORIZED_CHAT_ACCESS", {
                    "user_id": user_id,
                    "session_id": body.sessionId
                })
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            session_doc = chat_collection.find_one({
                "case_id": body.caseId,
                "session_id": {"$exists": False}
            })

        history = session_doc["messages"] if session_doc else []
        recent_history = history[-10:]

        result = ask(
            query=body.message,
            case_id=body.caseId,
            history=recent_history,
            top_k=body.top_k,
            user_id=user_id
        )

        contexts = []
        score_threshold = float(os.getenv("SOURCE_SCORE_THRESHOLD", "0.3"))
        if hasattr(result, 'retriever_result') and result.retriever_result:
            for item in result.retriever_result.items:
                metadata = item.metadata or {}
                source = metadata.get("source")
                score = metadata.get("score")
                raw_content = item.content if isinstance(item.content, str) else str(item.content)
                text_content = re.sub(r'^\[\d+\]\s*\(Source:\s*[^)]*\)\s*', '', raw_content)

                if score is not None and score < score_threshold:
                    continue

                contexts.append(
                    ContextItem(
                        content=text_content,
                        source=source,
                        metadata=metadata,
                        score=score
                    )
                )

            contexts.sort(key=lambda c: c.score if c.score is not None else 0, reverse=True)

        new_user_msg = {"role": "user", "content": body.message}
        contexts_dicts = [ctx.model_dump() for ctx in contexts] if contexts else []
        new_ai_msg = {
            "role": "assistant",
            "content": result.answer,
            "contexts": contexts_dicts
        }

        if body.sessionId:
            chat_collection.update_one(
                {"session_id": body.sessionId},
                {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                upsert=False
            )
        else:
             chat_collection.update_one(
                {"case_id": body.caseId, "session_id": {"$exists": False}},
                {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                upsert=True
            )

        return ChatResponse(
            answer=result.answer,
            contexts=contexts
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process chat request"
        )


@router.post("/chat/stream")
@limiter.limit("30/minute")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """SSE streaming endpoint for chat — tokens arrive in real-time."""
    try:
        validate_case_id(body.caseId)
        if body.sessionId:
            validate_session_id(body.sessionId)
        validate_string_length(body.message, "Message", min_length=1, max_length=5000)

        session_doc = None
        user_id = get_user_id(current_user)

        if body.sessionId:
            session_doc = chat_collection.find_one({"session_id": body.sessionId})
            if session_doc and session_doc.get("user_id") != user_id:
                log_security_event("UNAUTHORIZED_CHAT_ACCESS", {
                    "user_id": user_id,
                    "session_id": body.sessionId
                })
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            session_doc = chat_collection.find_one({
                "case_id": body.caseId,
                "session_id": {"$exists": False}
            })

        history = session_doc["messages"] if session_doc else []
        recent_history = history[-10:]

        async def event_generator():
            full_answer = ""
            contexts_list = []

            try:
                for event_str in await asyncio.to_thread(
                    lambda: list(ask_stream(
                        query=body.message,
                        case_id=body.caseId,
                        history=recent_history,
                        top_k=body.top_k,
                        user_id=user_id
                    ))
                ):
                    try:
                        data_line = event_str.replace("data: ", "").strip()
                        if data_line:
                            parsed = json_module.loads(data_line)
                            if parsed.get("type") == "done":
                                full_answer = parsed.get("answer", "")
                            elif parsed.get("type") == "contexts":
                                contexts_list = parsed.get("contexts", [])
                    except Exception:
                        pass

                    yield event_str

                # Save to MongoDB after streaming completes
                new_user_msg = {"role": "user", "content": body.message}
                new_ai_msg = {
                    "role": "assistant",
                    "content": full_answer,
                    "contexts": contexts_list
                }

                if body.sessionId:
                    chat_collection.update_one(
                        {"session_id": body.sessionId},
                        {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                        upsert=False
                    )
                else:
                    chat_collection.update_one(
                        {"case_id": body.caseId, "session_id": {"$exists": False}},
                        {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                        upsert=True
                    )

            except Exception as e:
                logger.error(f"Chat stream error: {e}", exc_info=True)
                yield f"data: {json_module.dumps({'type': 'error', 'detail': str(e)})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat stream setup error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process streaming chat request"
        )


@router.post("/check-sources")
@limiter.limit("60/minute")
async def check_sources(
    request: Request,
    body: CheckSourcesRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Re-rank contexts against selected text using cosine similarity."""
    try:
        validate_string_length(body.selectedText, "Selected text", min_length=1, max_length=5000)

        from utils.embeddings import embed_text
        import numpy as np

        selected_vec = np.array(embed_text(body.selectedText))

        scored = []
        for ctx in body.contexts:
            ctx_vec = np.array(embed_text(ctx.content))
            cos_sim = float(np.dot(selected_vec, ctx_vec) / (np.linalg.norm(selected_vec) * np.linalg.norm(ctx_vec) + 1e-10))
            scored.append(ContextItem(
                content=ctx.content,
                source=ctx.source,
                metadata=ctx.metadata,
                score=round(cos_sim, 4)
            ))

        scored.sort(key=lambda c: c.score if c.score is not None else 0, reverse=True)
        scored = [c for c in scored if (c.score or 0) > 0.2]

        return {"contexts": [c.model_dump() for c in scored]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check sources error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check sources")
