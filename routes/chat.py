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
from database import (
    chat_collection, chat_feedback_collection,
    token_usage_collection, custom_instructions_collection,
    response_cache_collection,
)
from schemas.chat import (
    ChatRequest, CreateSessionRequest, SessionResponse,
    ContextItem, ChatResponse, CheckSourcesRequest,
    Message, ChatHistoryResponse, RenameSessionRequest,
    ChatFeedbackRequest, ChatFeedbackResponse, TruncateSessionRequest,
    PinSessionRequest, CustomInstructionsRequest, CustomInstructionsResponse,
    ModelOverrideChatRequest,
)
from rag.rag import ask, ask_stream, AVAILABLE_MODELS
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
            "user_id": user_id,
            "$or": [{"deleted": {"$exists": False}}, {"deleted": False}]
        }).sort("created_at", -1)

        sessions = []
        for doc in cursor:
            if "session_id" not in doc:
                continue
            sessions.append(SessionResponse(
                session_id=doc["session_id"],
                title=doc.get("title", "Untitled Chat"),
                created_at=doc.get("created_at", datetime.utcnow()),
                pinned=doc.get("pinned", False)
            ))
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")


@router.patch("/chat/session/{sessionId}", response_model=SessionResponse)
@limiter.limit("30/minute")
async def rename_session(
    request: Request,
    sessionId: str,
    body: RenameSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_session_id(sessionId)
        validate_string_length(body.title, "Title", min_length=1, max_length=100)

        user_id = get_user_id(current_user)
        session_doc = chat_collection.find_one({"session_id": sessionId})

        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")

        if session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_SESSION_RENAME", {
                "user_id": user_id,
                "session_id": sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")

        chat_collection.update_one(
            {"session_id": sessionId, "user_id": user_id},
            {"$set": {"title": body.title}}
        )

        logger.info(f"Session renamed: {sessionId} to '{body.title}' by user {user_id}")

        return SessionResponse(
            session_id=session_doc["session_id"],
            title=body.title,
            created_at=session_doc["created_at"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to rename session")


@router.delete("/chat/session/{sessionId}")
@limiter.limit("30/minute")
async def delete_session(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = chat_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")

        if session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_SESSION_DELETE", {
                "user_id": user_id,
                "session_id": sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")

        chat_collection.update_one(
            {"session_id": sessionId, "user_id": user_id},
            {"$set": {"deleted": True}}
        )

        logger.info(f"Session deleted: {sessionId} by user {user_id}")
        return {"message": "Session deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete session")


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

        result = await asyncio.to_thread(
            ask,
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
    body: ModelOverrideChatRequest,
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

        # Conversation summarization for long contexts (#15)
        context_summary = None
        recent_history = history[-10:]
        if len(history) > 10:
            try:
                from services.summarization_service import summarize_conversation
                from rag.rag import _get_stream_client
                sum_client, sum_model = _get_stream_client(user_id)
                older_messages = history[:-10]
                context_summary = summarize_conversation(older_messages, sum_client, sum_model)
                # Store summary on session doc
                if body.sessionId:
                    chat_collection.update_one(
                        {"session_id": body.sessionId},
                        {"$set": {"summary": context_summary}}
                    )
            except Exception as e:
                logger.warning(f"Summarization failed, using full history: {e}")
                recent_history = history[-10:]

        # Load custom instructions (#26)
        custom_instructions = None
        try:
            ci_doc = custom_instructions_collection.find_one({"user_id": user_id})
            if ci_doc and ci_doc.get("instructions"):
                custom_instructions = ci_doc["instructions"]
        except Exception:
            pass

        async def event_generator():
            full_answer = ""
            contexts_list = []
            usage_data = None

            try:
                for event_str in await asyncio.to_thread(
                    lambda: list(ask_stream(
                        query=body.message,
                        case_id=body.caseId,
                        history=recent_history,
                        top_k=body.top_k,
                        user_id=user_id,
                        context_summary=context_summary,
                        custom_instructions=custom_instructions,
                        model_override=body.model_override
                    ))
                ):
                    try:
                        data_line = event_str.replace("data: ", "").strip()
                        if data_line:
                            parsed = json_module.loads(data_line)
                            if parsed.get("type") == "done":
                                full_answer = parsed.get("answer", "")
                                usage_data = parsed.get("usage")
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
                # Store token usage in the AI message
                if usage_data:
                    new_ai_msg["usage"] = usage_data

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

                # Aggregate token usage per-user per-day (#11)
                if usage_data and user_id:
                    try:
                        today = datetime.utcnow().strftime("%Y-%m-%d")
                        token_usage_collection.update_one(
                            {"user_id": user_id, "date": today},
                            {"$inc": {
                                "prompt_tokens": usage_data.get("prompt_tokens", 0),
                                "completion_tokens": usage_data.get("completion_tokens", 0),
                                "total_tokens": usage_data.get("total_tokens", 0),
                                "request_count": 1,
                            }},
                            upsert=True
                        )
                    except Exception:
                        pass  # Non-critical

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


@router.post("/chat/feedback", response_model=ChatFeedbackResponse)
@limiter.limit("60/minute")
async def submit_feedback(
    request: Request,
    body: ChatFeedbackRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Submit thumbs up/down feedback on an AI response."""
    try:
        validate_session_id(body.session_id)
        if body.feedback not in ("up", "down"):
            raise HTTPException(status_code=400, detail="Feedback must be 'up' or 'down'")

        user_id = get_user_id(current_user)

        chat_feedback_collection.update_one(
            {"session_id": body.session_id, "message_id": body.message_id, "user_id": user_id},
            {"$set": {
                "feedback": body.feedback,
                "message_content": body.message_content,
                "updated_at": datetime.utcnow(),
            }},
            upsert=True
        )

        logger.info(f"Feedback '{body.feedback}' on message {body.message_id} in session {body.session_id} by user {user_id}")
        return ChatFeedbackResponse(success=True, message="Feedback recorded")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save feedback")


@router.patch("/chat/session/{sessionId}/pin")
@limiter.limit("30/minute")
async def pin_session(
    request: Request,
    sessionId: str,
    body: PinSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Pin or unpin a chat session."""
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = chat_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")
        if session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        chat_collection.update_one(
            {"session_id": sessionId, "user_id": user_id},
            {"$set": {"pinned": body.pinned}}
        )

        logger.info(f"Session {sessionId} {'pinned' if body.pinned else 'unpinned'} by user {user_id}")
        return {"message": f"Session {'pinned' if body.pinned else 'unpinned'}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pin session error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to pin session")


@router.get("/chat/search")
@limiter.limit("30/minute")
async def search_messages(
    request: Request,
    caseId: str,
    q: str,
    current_user: Dict = Depends(get_current_user)
):
    """Search across chat sessions for a given case using regex on message content."""
    try:
        validate_case_id(caseId)
        validate_string_length(q, "Query", min_length=1, max_length=200)
        user_id = get_user_id(current_user)

        import re
        safe_query = re.escape(q)

        cursor = chat_collection.find({
            "case_id": caseId,
            "user_id": user_id,
            "$or": [{"deleted": {"$exists": False}}, {"deleted": False}],
            "messages.content": {"$regex": safe_query, "$options": "i"}
        })

        results = []
        for doc in cursor:
            session_id = doc.get("session_id", "")
            title = doc.get("title", "Untitled")
            for idx, msg in enumerate(doc.get("messages", [])):
                if re.search(safe_query, msg.get("content", ""), re.IGNORECASE):
                    # Return a snippet around the match
                    content = msg.get("content", "")
                    match = re.search(safe_query, content, re.IGNORECASE)
                    start = max(0, match.start() - 50) if match else 0
                    end = min(len(content), match.end() + 50) if match else 100
                    snippet = content[start:end]

                    results.append({
                        "session_id": session_id,
                        "session_title": title,
                        "message_index": idx,
                        "role": msg.get("role", ""),
                        "snippet": snippet,
                    })

            if len(results) >= 50:  # Limit results
                break

        return {"results": results, "total": len(results)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search messages")


@router.get("/chat/models")
@limiter.limit("60/minute")
async def get_available_models(
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """Return available LLM models for the model picker."""
    return {"models": AVAILABLE_MODELS}


@router.get("/chat/custom-instructions", response_model=CustomInstructionsResponse)
@limiter.limit("60/minute")
async def get_custom_instructions(
    request: Request,
    current_user: Dict = Depends(get_current_user)
):
    """Get user's custom instructions."""
    user_id = get_user_id(current_user)
    doc = custom_instructions_collection.find_one({"user_id": user_id})
    if doc:
        return CustomInstructionsResponse(
            instructions=doc.get("instructions", ""),
            updated_at=doc.get("updated_at")
        )
    return CustomInstructionsResponse(instructions="")


@router.put("/chat/custom-instructions", response_model=CustomInstructionsResponse)
@limiter.limit("30/minute")
async def set_custom_instructions(
    request: Request,
    body: CustomInstructionsRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Set or update user's custom instructions."""
    try:
        validate_string_length(body.instructions, "Instructions", min_length=0, max_length=2000)
        user_id = get_user_id(current_user)

        now = datetime.utcnow()
        custom_instructions_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "instructions": body.instructions,
                "updated_at": now,
            }},
            upsert=True
        )

        logger.info(f"Custom instructions updated by user {user_id}")
        return CustomInstructionsResponse(instructions=body.instructions, updated_at=now)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom instructions error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save custom instructions")


@router.patch("/chat/session/{sessionId}/truncate")
@limiter.limit("30/minute")
async def truncate_session(
    request: Request,
    sessionId: str,
    body: TruncateSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Truncate session messages after a given index (for edit-and-resubmit)."""
    try:
        validate_session_id(sessionId)
        user_id = get_user_id(current_user)

        session_doc = chat_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")
        if session_doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        messages = session_doc.get("messages", [])
        if body.after_index < 0 or body.after_index >= len(messages):
            raise HTTPException(status_code=400, detail="Invalid index")

        truncated = messages[:body.after_index]
        chat_collection.update_one(
            {"session_id": sessionId},
            {"$set": {"messages": truncated}}
        )

        logger.info(f"Session {sessionId} truncated to {body.after_index} messages by user {user_id}")
        return {"message": "Session truncated", "remaining_messages": len(truncated)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Truncate error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to truncate session")
