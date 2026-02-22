from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import shutil

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

from datetime import datetime, timedelta
from pymongo import MongoClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from rag.rag import ask, ask_stream
from ingestion.injector import ingest_document, delete_document
from investigation.generator import DocumentGenerator

# Import security utilities
from utils.auth import verify_token, get_current_user, get_user_id
from utils.validation import (
    validate_case_id, 
    sanitize_filename, 
    validate_session_id,
    validate_string_length
)
from utils.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler,
    log_security_event,
    logger
)
import asyncio

async def _run_ingestion_background(
    ingest_fn, db_case_id, db_filename, document_status_collection, logger, **kwargs
):
    """Run ingestion in the background and update document status on completion/failure."""
    try:
        # Run the synchronous ingest_document function in a separate thread
        await asyncio.to_thread(ingest_fn, **kwargs)
        
        # Update status to Ready upon success
        document_status_collection.update_one(
            {"case_id": db_case_id, "filename": db_filename},
            {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
        )
        logger.info(f"Background ingestion complete: {db_filename} for case {db_case_id}")
    except Exception as e:
        logger.error(f"Background ingestion failed for {db_filename}: {e}", exc_info=True)
        # Update status to Failed upon error
        document_status_collection.update_one(
            {"case_id": db_case_id, "filename": db_filename},
            {"$set": {"status": "Failed", "error": str(e)[:200], "last_updated": datetime.utcnow()}}
        )

generator = DocumentGenerator()





# --- Investigator Engine Import Setup ---
import sys
import importlib.util
from pathlib import Path

# Add Investigator Engine to sys.path to allow importing its modules
investigator_path = Path(__file__).parent / "Investigator Engine"
sys.path.append(str(investigator_path))

# Now we can import from Investigator Engine modules
# Note: Since 'Investigator Engine' has a space, accessing it directly is tricky, 
# but adding it to path allows us to import 'src' processing modules if they are top level in that dir.
# However, main.py imports 'from src...', so we need to make sure 'src' is resolvable.

try:
    from src.state import InvestigatorState
    # dynamic import for main because of the space in folder name, or just rely on path
    # But main.py is inside "Investigator Engine". 
    # Let's import create_graph from main logic.
    # We can use importlib to import 'main.py' from that directory.
    spec = importlib.util.spec_from_file_location("investigator_main", investigator_path / "main.py")
    investigator_main = importlib.util.module_from_spec(spec)
    sys.modules["investigator_main"] = investigator_main
    spec.loader.exec_module(investigator_main)
    create_graph = investigator_main.create_graph
except ImportError as e:
    print(f"Warning: Could not import Investigator Engine: {e}")
    create_graph = None


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Law Firm Connect API",
    version="1.1.0",
    description="Secure API for law firm case management with RAG and document generation"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add custom exception handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ---------- MONGO DB ----------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["lawfirm"]
chat_collection = db["chat_history"]
document_status_collection = db["document_status"]
draft_sessions_collection = db["draft_sessions"]
investigation_reports_collection = db["investigation_reports"]
investigation_jobs_collection = db["investigation_jobs"]
case_law_bookmarks_collection = db["case_law_bookmarks"]

# ---------- CORS Configuration ----------
from fastapi.middleware.cors import CORSMiddleware

# Get allowed origins from environment (comma-separated)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Environment-based, no wildcard
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# ---------- MODELS ----------
class ChatRequest(BaseModel):
    message: str
    caseId: str
    sessionId: Optional[str] = None
    top_k: int = 15

class InvestigatorRequest(BaseModel):
    caseId: str
    focusQuestions: Optional[List[str]] = None

class InvestigatorResponse(BaseModel):
    final_report: str
    reportId: Optional[str] = None


class CreateSessionRequest(BaseModel):
    caseId: str
    title: Optional[str] = "New Chat"

class SessionResponse(BaseModel):
    session_id: str
    title: str
    created_at: datetime

class ContextItem(BaseModel):
    content: str
    source: Optional[str] = None
    metadata: Optional[dict] = None
    score: Optional[float] = None

class ChatResponse(BaseModel):
    answer: str
    contexts: List[ContextItem]

class CheckSourcesRequest(BaseModel):
    selectedText: str
    contexts: List[ContextItem]

class Message(BaseModel):
    role: str
    content: str
    contexts: Optional[List[ContextItem]] = None

class ChatHistoryResponse(BaseModel):
    history: List[Message]

class GenerateDocumentRequest(BaseModel):
    caseId: str
    instructions: str

class SaveDocumentRequest(BaseModel):
    caseId: str
    filename: str
    content: str

class RetryIngestRequest(BaseModel):
    caseId: str
    filename: str

class ConversationalDraftRequest(BaseModel):
    caseId: str
    sessionId: str
    message: str
    currentDocument: Optional[str] = ""
    template: Optional[str] = None

class ConversationalDraftResponse(BaseModel):
    ai_message: str
    document_content: str

class CreateDraftSessionRequest(BaseModel):
    caseId: str
    template: Optional[str] = "blank"
    title: Optional[str] = "New Document"

class DraftSessionResponse(BaseModel):
    session_id: str
    title: str
    template: str
    created_at: datetime

# ---------- ROUTES ----------
import uuid

@app.post("/chat/session", response_model=SessionResponse)
@limiter.limit("30/minute")
async def create_session(
    request: Request,
    body: CreateSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate input
        validate_case_id(body.caseId)
        
        session_id = str(uuid.uuid4())
        new_session = {
            "session_id": session_id,
            "case_id": body.caseId,
            "user_id": get_user_id(current_user),  # Track ownership
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

@app.get("/chat/sessions/{caseId}", response_model=List[SessionResponse])
@limiter.limit("60/minute")
async def get_sessions(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate input
        validate_case_id(caseId)
        
        # Get sessions for this case and user
        user_id = get_user_id(current_user)
        cursor = chat_collection.find({
            "case_id": caseId,
            "user_id": user_id  # Only show user's own sessions
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

@app.get("/chat/history/{sessionId}", response_model=ChatHistoryResponse)
@limiter.limit("60/minute")
async def get_chat_history(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate input
        validate_session_id(sessionId)
        
        # Find session and verify ownership
        session_doc = chat_collection.find_one({"session_id": sessionId})
        
        # Fallback for legacy sessions
        if not session_doc:
            session_doc = chat_collection.find_one({
                "case_id": sessionId, 
                "session_id": {"$exists": False}
            })
        
        if not session_doc:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Verify user owns this session
        user_id = get_user_id(current_user)
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_ACCESS", {
                "user_id": user_id,
                "session_id": sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check expiration
        if "expires_at" in session_doc:
            if session_doc["expires_at"] < datetime.utcnow():
                raise HTTPException(status_code=410, detail="Session expired")
        
        if "messages" not in session_doc:
            return ChatHistoryResponse(history=[])
        
        # Convert to Message objects
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


@app.post("/chat")
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    SSE streaming chat endpoint.
    Event format:
      data: {"type": "contexts", "contexts": [...]}
      data: {"type": "token", "content": "The"}
      data: {"type": "done", "full_response": "..."}
    Saves full response to MongoDB after streaming completes.
    """
    import json as json_module

    try:
        # Validate inputs
        validate_case_id(body.caseId)
        if body.sessionId:
            validate_session_id(body.sessionId)
        validate_string_length(body.message, "Message", min_length=1, max_length=5000)

        session_doc = None
        user_id = get_user_id(current_user)

        # 1. Fetch history from MongoDB
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

        # Capture these for the generator closure
        case_id = body.caseId
        session_id = body.sessionId
        message = body.message
        top_k = body.top_k

        async def event_generator():
            contexts_list = []
            full_response = ""

            try:
                for event_json in ask_stream(
                    query=message,
                    case_id=case_id,
                    history=recent_history,
                    top_k=top_k,
                ):
                    event = json_module.loads(event_json)
                    event_type = event.get("type")

                    if event_type == "contexts":
                        contexts_list = event.get("contexts", [])
                    elif event_type == "done":
                        full_response = event.get("full_response", "")

                    yield f"data: {event_json}\n\n"

            except Exception as e:
                logger.error(f"Streaming error: {e}", exc_info=True)
                yield f"data: {json_module.dumps({'type': 'done', 'full_response': 'Error generating response.'})}\n\n"
                full_response = "Error generating response."

            # Save to MongoDB after streaming completes
            try:
                new_user_msg = {"role": "user", "content": message}
                contexts_dicts = contexts_list
                new_ai_msg = {
                    "role": "assistant",
                    "content": full_response,
                    "contexts": contexts_dicts,
                }

                if session_id:
                    chat_collection.update_one(
                        {"session_id": session_id},
                        {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                        upsert=False,
                    )
                else:
                    chat_collection.update_one(
                        {"case_id": case_id, "session_id": {"$exists": False}},
                        {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                        upsert=True,
                    )
            except Exception as e:
                logger.error(f"Failed to save chat history: {e}", exc_info=True)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to process chat request"
        )


@app.post("/check-sources")
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
            # Cosine similarity
            cos_sim = float(np.dot(selected_vec, ctx_vec) / (np.linalg.norm(selected_vec) * np.linalg.norm(ctx_vec) + 1e-10))
            scored.append(ContextItem(
                content=ctx.content,
                source=ctx.source,
                metadata=ctx.metadata,
                score=round(cos_sim, 4)
            ))

        # Sort by similarity descending, filter very low matches
        scored.sort(key=lambda c: c.score if c.score is not None else 0, reverse=True)
        scored = [c for c in scored if (c.score or 0) > 0.2]

        return {"contexts": [c.model_dump() for c in scored]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check sources error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to check sources")


@app.post("/ingest")
@limiter.limit("10/minute")  # Limit file uploads
async def ingest_file(
    request: Request,
    file: UploadFile = File(...), 
    caseId: str = Form(...),
    current_user: Dict = Depends(get_current_user)
):
    import zipfile
    import tempfile
    
    try:
        # Validate inputs
        validate_case_id(caseId)
        safe_filename = sanitize_filename(file.filename)
        
        # Check file size (50MB limit)
        MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        user_id = get_user_id(current_user)
        
        # Check if it's a zip file
        if safe_filename.lower().endswith('.zip'):
            logger.info(f"Processing zip file: {safe_filename}")
            
            # Extract zip and process each file
            ingested_files = []
            failed_files = []
            
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_path = os.path.join(temp_dir, safe_filename)
                with open(zip_path, 'wb') as f:
                    f.write(file_content)
                
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Process each extracted file
                for root, dirs, files in os.walk(temp_dir):
                    for extracted_file in files:
                        if extracted_file == safe_filename:  # Skip the zip itself
                            continue
                        if extracted_file.startswith('.') or extracted_file.startswith('__'):
                            continue  # Skip hidden files and __MACOSX
                            
                        extracted_path = os.path.join(root, extracted_file)
                        extracted_safe_name = sanitize_filename(extracted_file)
                        
                        try:
                            # Set status to Processing
                            document_status_collection.update_one(
                                {"case_id": caseId, "filename": extracted_safe_name},
                                {
                                    "$set": {
                                        "status": "Processing",
                                        "filename": extracted_safe_name,
                                        "case_id": caseId,
                                        "user_id": user_id,
                                        "last_updated": datetime.utcnow()
                                    }
                                },
                                upsert=True
                            )
                            
                            # Copy to documents folder
                            dest_path = f"documents/{extracted_safe_name}"
                            shutil.copy2(extracted_path, dest_path)
                            
                            # Parse and ingest with page metadata
                            from ingestion.loader import parse_file_with_pages
                            page_data = parse_file_with_pages(dest_path)
                            text = "\n".join(p.get("text", "") for p in page_data)

                            if text.strip():
                                # Cache extracted text for fast retrieval
                                document_status_collection.update_one(
                                    {"case_id": caseId, "filename": extracted_safe_name},
                                    {"$set": {"extracted_pages": page_data}}
                                )
                                # Start background ingestion
                                asyncio.create_task(_run_ingestion_background(
                                    ingest_document,
                                    caseId,
                                    extracted_safe_name,
                                    document_status_collection,
                                    logger,
                                    text=text,
                                    source_name=extracted_safe_name,
                                    case_id=caseId,
                                    page_metadata=page_data,
                                    file_path=dest_path,
                                ))

                                ingested_files.append(extracted_safe_name)
                                logger.info(f"Started background ingestion for zip entry: {extracted_safe_name}")
                            else:
                                document_status_collection.update_one(
                                    {"case_id": caseId, "filename": extracted_safe_name},
                                    {"$set": {"status": "Failed", "error": "Empty file", "last_updated": datetime.utcnow()}}
                                )
                                failed_files.append(extracted_safe_name)
                                
                        except Exception as e:
                            logger.error(f"Failed to ingest {extracted_file}: {e}")
                            document_status_collection.update_one(
                                {"case_id": caseId, "filename": extracted_safe_name},
                                {"$set": {"status": "Failed", "error": str(e)[:100], "last_updated": datetime.utcnow()}}
                            )
                            failed_files.append(extracted_safe_name)
            
            return {
                "status": "processing",
                "message": f"Zip extracted. AI ingestion started in background.",
                "ingested_files": ingested_files,
                "failed_files": failed_files,
                "caseId": caseId
            }
        
        # Regular file processing (non-zip)
        else:
            # Reset file pointer
            await file.seek(0)
            
            # Set status to Processing
            document_status_collection.update_one(
                {"case_id": caseId, "filename": safe_filename},
                {
                    "$set": {
                        "status": "Processing",
                        "filename": safe_filename,
                        "case_id": caseId,
                        "user_id": user_id,
                        "last_updated": datetime.utcnow()
                    }
                },
                upsert=True
            )

            # Save file locally with sanitized name
            file_location = f"documents/{safe_filename}"
            with open(file_location, "wb+") as file_object:
                file_object.write(file_content)
                
            # Read content using page-aware loader
            from ingestion.loader import parse_file_with_pages
            page_data = parse_file_with_pages(file_location)
            text = "\n".join(p.get("text", "") for p in page_data)

            if not text.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract text from file or file is empty."
                )

            # Cache extracted text in document_status for fast retrieval later
            document_status_collection.update_one(
                {"case_id": caseId, "filename": safe_filename},
                {"$set": {"extracted_pages": page_data}}
            )

            # Ingest with page metadata in BACKGROUND
            # We already set status to "Processing" above.

            # Start background task
            asyncio.create_task(_run_ingestion_background(
                ingest_document,
                caseId,
                safe_filename,
                document_status_collection,
                logger,
                text=text,
                source_name=safe_filename,
                case_id=caseId,
                page_metadata=page_data,
                file_path=file_location,
            ))
            
            logger.info(f"Started background ingestion: {safe_filename} for case {caseId}")
            
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
        
        # Set status to Failed
        if 'safe_filename' in locals() and 'caseId' in locals():
            document_status_collection.update_one(
                {"case_id": caseId, "filename": safe_filename},
                {"$set": {"status": "Failed", "error": "Processing failed", "last_updated": datetime.utcnow()}}
            )
        raise HTTPException(status_code=500, detail="File ingestion failed")


@app.get("/documents/{caseId}")
@limiter.limit("60/minute")
async def get_documents_status(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate input
        validate_case_id(caseId)
        
        # Only return documents for this user's cases
        # In a real app, you'd verify case ownership here
        docs = list(document_status_collection.find(
            {"case_id": caseId},
            {"_id": 0}
        ))
        return docs
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching documents: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


@app.delete("/documents/{caseId}/{filename}")
@limiter.limit("30/minute")
async def delete_document_endpoint(
    request: Request,
    caseId: str, 
    filename: str,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate inputs
        validate_case_id(caseId)
        safe_filename = sanitize_filename(filename)
        
        user_id = get_user_id(current_user)
        
        # Verify document exists and user has access
        doc_status = document_status_collection.find_one({
            "case_id": caseId,
            "filename": safe_filename
        })
        
        if not doc_status:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # SECURITY: Verify user owns this document
        if doc_status.get("user_id") and doc_status.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_DOCUMENT_DELETE", {
                "user_id": user_id,
                "case_id": caseId,
                "filename": safe_filename
            })
            raise HTTPException(status_code=403, detail="Access denied")
        
        # 1. Delete from Neo4j & Qdrant (Remove from AI Context)
        delete_document(caseId, safe_filename)

        # 2. Update status to 'Archived' in MongoDB
        result = document_status_collection.update_one(
            {"case_id": caseId, "filename": safe_filename},
            {"$set": {"status": "Archived", "last_updated": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            logger.warning(f"Document {safe_filename} not found in MongoDB for case {caseId}")

        # 3. Preserve file on disk (Do NOT delete)
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


@app.post("/generate-document")
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

@app.post("/save-document")
@limiter.limit("20/minute")
async def save_document_endpoint(
    request: Request,
    body: SaveDocumentRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        # Validate inputs
        validate_case_id(body.caseId)
        safe_filename = sanitize_filename(body.filename)
        validate_string_length(body.content, "Content", min_length=1, max_length=500000)
        
        # Ensure filename has extension
        if not safe_filename.endswith(".txt") and not safe_filename.endswith(".md"):
            safe_filename += ".txt"
            
        file_location = f"documents/{safe_filename}"
        user_id = get_user_id(current_user)
        
        # Save to disk
        with open(file_location, "w", encoding="utf-8") as f:
            f.write(body.content)
            
        # Set status to Processing
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

        # Start background ingestion
        asyncio.create_task(_run_ingestion_background(
            ingest_document,
            body.caseId,
            safe_filename,
            document_status_collection,
            logger,
            text=body.content,
            source_name=safe_filename,
            case_id=body.caseId,
            file_path=file_location,
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


@app.post("/retry-ingest")
@limiter.limit("10/minute")
async def retry_ingest(
    request: Request,
    body: RetryIngestRequest,
    current_user: Dict = Depends(get_current_user)
):
    try:
        validate_case_id(body.caseId)
        safe_filename = sanitize_filename(body.filename)
        
        # Check if file exists
        file_path = f"documents/{safe_filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
            
        # Read content
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except:
            # Maybe binary? But we only ingest text...
            # For now try reading as binary and decoding with error ignore
             with open(file_path, "rb") as f:
                content = f.read().decode("utf-8", errors="ignore")

        # Set status to Processing
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

        # Start background ingestion
        asyncio.create_task(_run_ingestion_background(
            ingest_document,
            body.caseId,
            safe_filename,
            document_status_collection,
            logger,
            text=content,
            source_name=safe_filename,
            case_id=body.caseId,
            file_path=file_path,
        ))

        logger.info(f"Retry ingestion started: {safe_filename}")
        
        return {"status": "processing", "message": "Result initiated in background"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Retry ingestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retry ingestion")


@app.get("/health")
@limiter.limit("30/minute")
async def health(request: Request):
    # Health check doesn't require authentication
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ---------- CONVERSATIONAL DRAFT ENDPOINTS ----------

@app.post("/draft/session", response_model=DraftSessionResponse)
@limiter.limit("30/minute")
async def create_draft_session(
    request: Request,
    body: CreateDraftSessionRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new conversational draft session"""
    try:
        # SECURITY: Validate input
        validate_case_id(body.caseId)
        
        user_id = get_user_id(current_user)
        session_id = str(uuid.uuid4())
        new_session = {
            "session_id": session_id,
            "case_id": body.caseId,
            "user_id": user_id,  # SECURITY: Track ownership
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

@app.get("/draft/sessions/{caseId}")
@limiter.limit("60/minute")
async def get_draft_sessions(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get all draft sessions for a case"""
    try:
        # SECURITY: Validate input
        validate_case_id(caseId)
        
        user_id = get_user_id(current_user)
        # SECURITY: Only return user's own sessions
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

@app.get("/draft/session/{sessionId}")
@limiter.limit("60/minute")
async def get_draft_session(
    request: Request,
    sessionId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific draft session with messages and document content"""
    try:
        # SECURITY: Validate input
        validate_session_id(sessionId)
        
        session_doc = draft_sessions_collection.find_one({"session_id": sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        
        # SECURITY: Verify ownership
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

@app.post("/draft/chat", response_model=ConversationalDraftResponse)
@limiter.limit("20/minute")  # Limit AI generation requests
async def conversational_draft(
    request: Request,
    body: ConversationalDraftRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Process conversational message and update document"""
    try:
        # SECURITY: Validate inputs
        validate_case_id(body.caseId)
        validate_session_id(body.sessionId)
        validate_string_length(body.message, "Message", min_length=1, max_length=5000)
        
        user_id = get_user_id(current_user)
        
        # Fetch session
        session_doc = draft_sessions_collection.find_one({"session_id": body.sessionId})
        if not session_doc:
            raise HTTPException(status_code=404, detail="Draft session not found")
        
        # SECURITY: Verify ownership
        if session_doc.get("user_id") and session_doc.get("user_id") != user_id:
            log_security_event("UNAUTHORIZED_DRAFT_CHAT", {
                "user_id": user_id,
                "session_id": body.sessionId
            })
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get conversation history
        history = session_doc.get("messages", [])
        template = session_doc.get("template", "blank")
        
        # Generate AI response and updated document
        result = generator.generate_conversational(
            case_id=body.caseId,
            message=body.message,
            current_document=body.currentDocument,
            history=history[-6:],  # Last 6 messages for context
            template=template
        )
        
        # Save to history
        new_user_msg = {"role": "user", "content": body.message}
        new_ai_msg = {"role": "assistant", "content": result["ai_message"]}
        
        draft_sessions_collection.update_one(
            {"session_id": body.sessionId},
            {
                "$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}},
                "$set": {"current_document": result["document_content"]}
            }
        )
        
        return ConversationalDraftResponse(
            ai_message=result["ai_message"],
            document_content=result["document_content"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in conversational draft: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process draft request")

@app.get("/draft/templates")
@limiter.limit("60/minute")
async def get_templates(request: Request):
    """Get available document templates"""
    templates = [
        {
            "id": "noc",
            "name": "No Objection Certificate (NOC)",
            "description": "Generate NOC for property, employment, or other purposes",
            "category": "Certificate"
        },
        {
            "id": "demand_letter",
            "name": "Demand Letter",
            "description": "Legal demand letter for payment or action",
            "category": "Letter"
        },
        {
            "id": "legal_notice",
            "name": "Legal Notice",
            "description": "Formal legal notice under law",
            "category": "Notice"
        },
        {
            "id": "contract",
            "name": "Contract Agreement",
            "description": "Standard contract or agreement template",
            "category": "Contract"
        },
        {
            "id": "affidavit",
            "name": "Affidavit",
            "description": "Sworn statement of facts",
            "category": "Affidavit"
        },
        {
            "id": "blank",
            "name": "Blank Document",
            "description": "Start from scratch with AI assistance",
            "category": "General"
        }
    ]
    return templates

@app.post("/investigation/run", response_model=InvestigatorResponse)
@limiter.limit("5/minute")
async def run_investigation(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    try:
        # 1. Fetch documents for the case
        # We need to get the text content of documents. 
        # In this system, we use Qdrant for RAG, but the Investigator Engine expects raw text.
        # We can either fetch from Qdrant scroll or read files from disk.
        # Reading from disk is safer for full context.
        
        # Get list of ready documents
        validate_case_id(body.caseId)
        docs_status = list(document_status_collection.find({"case_id": body.caseId, "status": "Ready"}))
        
        doc_list = []
        for doc in docs_status:
            filename = doc["filename"]
            file_path = f"documents/{filename}"
            if os.path.exists(file_path):
                try:
                    # Reuse the same loader logic or simple read
                    # For simplicity, we'll do a basic read here, preferably using the ingestion loader
                    from ingestion.loader import parse_file
                    content = parse_file(file_path)
                    if content.strip():
                        doc_list.append({
                            "id": filename,
                            "content": content,
                            "metadata": {"source": filename}
                        })
                except Exception as e:
                    print(f"Error reading {filename}: {e}")
        
        if not doc_list:
            raise HTTPException(status_code=404, detail="No documents found for this case. Please upload and process documents before running investigation.")

        # 2. Initialize State
        initial_state = {
            "documents": doc_list,
            "entities": [],
            "facts": [],
            "timeline": [],
            "revision_count": 0,
            "errors": [],
            "focus_questions": body.focusQuestions or [],
        }

        # 3. Invoke Graph (async to avoid blocking the event loop)
        import asyncio
        workflow = create_graph()
        final_state = await asyncio.to_thread(workflow.invoke, initial_state)
        
        report = final_state.get("final_report", "Analysis completed but no report was generated.")

        # Save report to MongoDB
        report_doc = {
            "case_id": body.caseId,
            "user_id": current_user.get("user_id", "unknown"),
            "final_report": report,
            "focus_questions": body.focusQuestions or [],
            "metadata": {
                "fact_count": len(final_state.get("facts", [])),
                "revision_count": final_state.get("revision_count", 0),
                "conflict_count": len(final_state.get("conflicts", [])),
                "document_count": len(doc_list),
                "errors": final_state.get("errors", []),
            },
            "created_at": datetime.utcnow(),
        }
        insert_result = investigation_reports_collection.insert_one(report_doc)
        report_id = str(insert_result.inserted_id)

        return InvestigatorResponse(final_report=report, reportId=report_id)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")


# --- SSE Streaming Investigation Endpoint ---

import json as json_module
import asyncio

# Node name to user-friendly step labels
_STEP_LABELS = {
    "document_analyst": "Analyzing documents...",
    "entity_extractor": "Extracting facts & entities...",
    "auditor": "Auditing timeline...",
    "primary_investigator": "Building case narrative...",
    "cross_examiner": "Cross-examining narrative...",
    "conflict_resolver": "Resolving conflicts...",
    "evidence_validator": "Validating evidence...",
    "gap_detector": "Detecting evidence gaps...",
    "legal_researcher": "Researching legal issues...",
    "debate_hub": "Synchronizing analysis...",
    "risk_assessor": "Assessing risks...",
    "final_judge": "Generating final report...",
}

_STEP_ORDER = list(_STEP_LABELS.keys())

def _fetch_docs_for_case(case_id: str) -> list:
    """Helper to fetch documents for a case (shared by both endpoints)."""
    from ingestion.loader import parse_file
    docs_status = list(document_status_collection.find({"case_id": case_id, "status": "Ready"}))
    doc_list = []
    for doc in docs_status:
        filename = doc["filename"]
        file_path = f"documents/{filename}"
        if os.path.exists(file_path):
            try:
                content = parse_file(file_path)
                if content.strip():
                    doc_list.append({
                        "id": filename,
                        "content": content,
                        "metadata": {"source": filename}
                    })
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    return doc_list


@app.post("/investigation/run-stream")
@limiter.limit("5/minute")
async def run_investigation_stream(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    """SSE endpoint for investigation with real-time progress updates."""
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    validate_case_id(body.caseId)
    doc_list = _fetch_docs_for_case(body.caseId)

    if not doc_list:
        raise HTTPException(status_code=404, detail="No documents found for this case.")

    initial_state = {
        "documents": doc_list,
        "entities": [],
        "facts": [],
        "timeline": [],
        "revision_count": 0,
        "errors": [],
        "focus_questions": body.focusQuestions or [],
    }

    async def event_generator():
        try:
            workflow = create_graph()
            total_steps = len(_STEP_ORDER)

            def run_stream():
                return list(workflow.stream(initial_state))

            # Run the blocking stream in a thread
            stream_results = await asyncio.to_thread(run_stream)

            completed_steps = 0
            final_state = initial_state.copy()

            for chunk in stream_results:
                # Each chunk is a dict {node_name: node_output}
                for node_name, node_output in chunk.items():
                    if node_output and isinstance(node_output, dict):
                        final_state.update(node_output)
                    completed_steps += 1
                    step_index = _STEP_ORDER.index(node_name) if node_name in _STEP_ORDER else completed_steps
                    progress = min(int((step_index + 1) / total_steps * 100), 99)
                    label = _STEP_LABELS.get(node_name, f"Processing {node_name}...")

                    yield f"data: {json_module.dumps({'type': 'progress', 'step': node_name, 'label': label, 'progress': progress})}\n\n"

            # Get final report
            report = final_state.get("final_report", "Analysis completed but no report was generated.")

            # Extract structured data
            facts = final_state.get("facts", [])
            entities = list(set(final_state.get("entities", [])))
            timeline = final_state.get("timeline", [])
            conflicts = final_state.get("conflicts", [])
            risks = final_state.get("risks", [])
            evidence_gaps = final_state.get("evidence_gaps", [])
            hypotheses = final_state.get("hypotheses", [])
            legal_issues = final_state.get("legal_issues", [])
            avg_confidence = round(sum(f.get("confidence", 0) for f in facts) / len(facts), 2) if facts else 0.0
            risk_level = "CRITICAL" if len(risks) >= 5 else "HIGH" if len(risks) >= 3 else "MEDIUM" if len(risks) >= 1 else "LOW"

            structured_data = {
                "entities": entities,
                "facts": facts,
                "timeline": timeline,
                "conflicts": conflicts,
                "risks": risks,
                "evidence_gaps": evidence_gaps,
                "hypotheses": hypotheses,
                "legal_issues": legal_issues,
            }
            metadata = {
                "fact_count": len(facts),
                "entity_count": len(entities),
                "conflict_count": len(conflicts),
                "risk_count": len(risks),
                "timeline_count": len(timeline),
                "evidence_gap_count": len(evidence_gaps),
                "document_count": len(doc_list),
                "revision_count": final_state.get("revision_count", 0),
                "avg_confidence": avg_confidence,
                "overall_risk_level": risk_level,
                "errors": final_state.get("errors", []),
            }

            # Save to MongoDB
            report_doc = {
                "case_id": body.caseId,
                "user_id": current_user.get("user_id", "unknown"),
                "final_report": report,
                "focus_questions": body.focusQuestions or [],
                "structured_data": structured_data,
                "metadata": metadata,
                "created_at": datetime.utcnow(),
            }
            insert_result = investigation_reports_collection.insert_one(report_doc)
            report_id = str(insert_result.inserted_id)

            yield f"data: {json_module.dumps({'type': 'complete', 'progress': 100, 'final_report': report, 'reportId': report_id, 'structured_data': structured_data, 'stats': metadata})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
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


# --- Investigation Report History ---

@app.get("/investigation/reports/{caseId}")
@limiter.limit("30/minute")
async def get_investigation_reports(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Fetch past investigation reports for a case."""
    validate_case_id(caseId)
    reports = list(
        investigation_reports_collection.find(
            {"case_id": caseId},
            {"final_report": 1, "metadata": 1, "created_at": 1, "focus_questions": 1}
        ).sort("created_at", -1).limit(20)
    )
    # Convert ObjectId to string
    for r in reports:
        r["_id"] = str(r["_id"])
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
    return reports


# --- Background Investigation (runs even if user navigates away) ---

async def _run_investigation_background(job_id: str, case_id: str, focus_questions: list, user_id: str, doc_list: list):
    """Runs the full investigation pipeline as a background task, updating progress in MongoDB."""
    try:
        workflow = create_graph()
        initial_state = {
            "documents": doc_list,
            "entities": [],
            "facts": [],
            "timeline": [],
            "revision_count": 0,
            "errors": [],
            "focus_questions": focus_questions,
        }

        total_steps = len(_STEP_ORDER)

        def run_stream():
            return list(workflow.stream(initial_state))

        stream_results = await asyncio.to_thread(run_stream)

        final_state = initial_state.copy()
        completed_steps = 0

        for chunk in stream_results:
            for node_name, node_output in chunk.items():
                if node_output and isinstance(node_output, dict):
                    final_state.update(node_output)
                completed_steps += 1
                step_index = _STEP_ORDER.index(node_name) if node_name in _STEP_ORDER else completed_steps
                progress = min(int((step_index + 1) / total_steps * 100), 99)
                label = _STEP_LABELS.get(node_name, f"Processing {node_name}...")

                investigation_jobs_collection.update_one(
                    {"_id": job_id},
                    {"$set": {
                        "status": "running",
                        "current_step": node_name,
                        "progress": progress,
                        "progress_label": label,
                        "updated_at": datetime.utcnow(),
                    }}
                )

        # Build final results
        report = final_state.get("final_report", "Analysis completed but no report was generated.")
        facts = final_state.get("facts", [])
        entities = list(set(final_state.get("entities", [])))
        timeline = final_state.get("timeline", [])
        conflicts = final_state.get("conflicts", [])
        risks = final_state.get("risks", [])
        evidence_gaps = final_state.get("evidence_gaps", [])
        hypotheses = final_state.get("hypotheses", [])
        legal_issues = final_state.get("legal_issues", [])
        avg_confidence = round(sum(f.get("confidence", 0) for f in facts) / len(facts), 2) if facts else 0.0
        risk_level = "CRITICAL" if len(risks) >= 5 else "HIGH" if len(risks) >= 3 else "MEDIUM" if len(risks) >= 1 else "LOW"

        structured_data = {
            "entities": entities, "facts": facts, "timeline": timeline,
            "conflicts": conflicts, "risks": risks, "evidence_gaps": evidence_gaps,
            "hypotheses": hypotheses, "legal_issues": legal_issues,
        }
        metadata = {
            "fact_count": len(facts), "entity_count": len(entities),
            "conflict_count": len(conflicts), "risk_count": len(risks),
            "timeline_count": len(timeline), "evidence_gap_count": len(evidence_gaps),
            "document_count": len(doc_list), "revision_count": final_state.get("revision_count", 0),
            "avg_confidence": avg_confidence, "overall_risk_level": risk_level,
            "errors": final_state.get("errors", []),
        }

        # Save report to investigation_reports
        report_doc = {
            "case_id": case_id, "user_id": user_id,
            "final_report": report, "focus_questions": focus_questions,
            "structured_data": structured_data, "metadata": metadata,
            "created_at": datetime.utcnow(),
        }
        insert_result = investigation_reports_collection.insert_one(report_doc)
        report_id = str(insert_result.inserted_id)

        # Mark job as completed
        investigation_jobs_collection.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "progress_label": "Investigation complete",
                "report_id": report_id,
                "final_report": report,
                "structured_data": structured_data,
                "stats": metadata,
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }}
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        investigation_jobs_collection.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "error",
                "error": str(e),
                "updated_at": datetime.utcnow(),
            }}
        )


@app.post("/investigation/run-background")
@limiter.limit("5/minute")
async def run_investigation_background(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Start investigation as a background task. Returns a jobId immediately."""
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    validate_case_id(body.caseId)
    doc_list = _fetch_docs_for_case(body.caseId)

    if not doc_list:
        raise HTTPException(status_code=404, detail="No documents found for this case.")

    # Create job record
    import uuid
    job_id = str(uuid.uuid4())
    investigation_jobs_collection.insert_one({
        "_id": job_id,
        "case_id": body.caseId,
        "user_id": current_user.get("user_id", "unknown"),
        "status": "running",
        "progress": 0,
        "progress_label": "Starting investigation...",
        "current_step": "",
        "focus_questions": body.focusQuestions or [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    # Fire and forget — runs in the background
    asyncio.create_task(
        _run_investigation_background(
            job_id, body.caseId, body.focusQuestions or [], current_user.get("user_id", "unknown"), doc_list
        )
    )

    return {"jobId": job_id}


@app.get("/investigation/status/{jobId}")
@limiter.limit("60/minute")
async def get_investigation_status(
    request: Request,
    jobId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Poll the status of a background investigation job."""
    job = investigation_jobs_collection.find_one({"_id": jobId})
    if not job:
        raise HTTPException(status_code=404, detail="Investigation job not found.")

    result = {
        "jobId": job["_id"],
        "status": job["status"],
        "progress": job.get("progress", 0),
        "progressLabel": job.get("progress_label", ""),
        "currentStep": job.get("current_step", ""),
    }

    if job["status"] == "completed":
        result["reportId"] = job.get("report_id")
        result["finalReport"] = job.get("final_report")
        result["structuredData"] = job.get("structured_data")
        result["stats"] = job.get("stats")

    if job["status"] == "error":
        result["error"] = job.get("error", "Unknown error")

    return result


@app.get("/investigation/active-job/{caseId}")
@limiter.limit("30/minute")
async def get_active_investigation_job(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Check if there's a running investigation job for this case."""
    validate_case_id(caseId)
    job = investigation_jobs_collection.find_one(
        {"case_id": caseId, "status": "running"},
        sort=[("created_at", -1)]
    )
    if not job:
        return {"hasActiveJob": False}

    return {
        "hasActiveJob": True,
        "jobId": job["_id"],
        "progress": job.get("progress", 0),
        "progressLabel": job.get("progress_label", ""),
        "currentStep": job.get("current_step", ""),
    }


# ---------- SECURITY NOTE ----------
# Static file serving has been REMOVED for security.
# All document access must go through authenticated endpoints.

# Return parsed text content of a document (for in-app document viewer)
@app.get("/document-text/{caseId}/{filename}")
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

        # Serve from cached extracted_pages if available (avoids re-running OCR)
        if doc_status.get("extracted_pages"):
            return {
                "filename": safe_filename,
                "pages": doc_status["extracted_pages"]
            }

        # Fallback: re-parse (for documents ingested before caching was added)
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


# Secure document download endpoint
@app.get("/download/{caseId}/{filename}")
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
        
        # Verify document exists and user has access
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


# ---------- INDIAN KANOON CASE LAW ENDPOINTS ----------

import httpx

INDIAN_KANOON_API_TOKEN = os.getenv("INDIAN_KANOON_API_TOKEN", "")
INDIAN_KANOON_BASE_URL = "https://api.indiankanoon.org"


class CaseLawSearchRequest(BaseModel):
    formInput: str = Field(..., min_length=1, max_length=500)
    pagenum: Optional[int] = 0
    doctypes: Optional[str] = None  # e.g. "judgments", "laws"
    fromdate: Optional[str] = None  # DD-MM-YYYY
    todate: Optional[str] = None    # DD-MM-YYYY
    title: Optional[str] = None
    author: Optional[str] = None


class CaseLawBookmarkRequest(BaseModel):
    docId: int
    title: str
    court: Optional[str] = ""
    date: Optional[str] = ""
    practiceArea: Optional[str] = ""
    tags: Optional[List[str]] = []
    notes: Optional[str] = ""
    caseId: Optional[str] = None  # linked current case


class CaseLawBookmarkUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    practiceArea: Optional[str] = None


@app.post("/case-law/search")
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


@app.get("/case-law/doc/{docId}")
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


@app.get("/case-law/meta/{docId}")
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


# --- Embedding-based Precedent Finder ---

@app.post("/case-law/find-precedents/{caseId}")
@limiter.limit("5/minute")
async def find_precedents_from_embeddings(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Use case document embeddings to find relevant Indian Kanoon precedents.
    1. Fetch top chunks from Qdrant for this case
    2. Use LLM to extract targeted legal search queries
    3. Search Indian Kanoon with those queries
    4. Return deduplicated results
    """
    try:
        validate_case_id(caseId)

        if not INDIAN_KANOON_API_TOKEN:
            raise HTTPException(status_code=503, detail="Indian Kanoon API not configured")

        from qdrant_client import QdrantClient, models as qmodels
        from groq import Groq

        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_key = os.getenv("QDRANT_API_KEY")
        qdrant_client = QdrantClient(url=qdrant_url, api_key=qdrant_key)
        COLLECTION = "chunks"

        # 1. Scroll Qdrant for this case's chunks (get a representative sample)
        try:
            scroll_result = qdrant_client.scroll(
                collection_name=COLLECTION,
                scroll_filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="case_id",
                            match=qmodels.MatchValue(value=caseId),
                        )
                    ]
                ),
                limit=20,
                with_payload=True,
                with_vectors=False,
            )
            points = scroll_result[0]
        except Exception as e:
            logger.warning(f"Qdrant scroll failed for case {caseId}: {e}")
            points = []

        if not points:
            raise HTTPException(
                status_code=404,
                detail="No document embeddings found for this case. Please upload documents first."
            )

        # 2. Combine chunk texts for LLM analysis
        chunk_texts = [p.payload.get("text", "") for p in points if p.payload.get("text")]
        combined_text = "\n---\n".join(chunk_texts)
        # Truncate to fit LLM context
        if len(combined_text) > 12000:
            combined_text = combined_text[:12000]

        # 3. Use Groq LLM to extract legal search queries
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        llm_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an Indian legal research assistant. Given excerpts from case documents, "
                        "extract 3 to 5 specific search queries for finding relevant precedents on Indian Kanoon. "
                        "Each query should target a distinct legal issue, section, act, or principle mentioned in the documents. "
                        "Return ONLY a JSON array of strings, nothing else. Example: "
                        '[\"Section 498A IPC dowry harassment\", \"Supreme Court maintenance under Section 125 CrPC\"]'
                    )
                },
                {
                    "role": "user",
                    "content": f"Extract legal search queries from these case documents:\n\n{combined_text}"
                }
            ],
            temperature=0.2,
            max_tokens=500,
        )

        import json as _json
        raw_queries = llm_response.choices[0].message.content.strip()
        # Parse JSON array from LLM response
        try:
            # Handle case where LLM wraps in markdown code block
            if raw_queries.startswith("```"):
                raw_queries = raw_queries.split("```")[1]
                if raw_queries.startswith("json"):
                    raw_queries = raw_queries[4:]
            search_queries = _json.loads(raw_queries)
            if not isinstance(search_queries, list):
                search_queries = [raw_queries]
        except _json.JSONDecodeError:
            # Fallback: split by newlines and clean
            search_queries = [q.strip().strip('"').strip("'") for q in raw_queries.split("\n") if q.strip()]

        search_queries = search_queries[:5]  # Cap at 5

        logger.info(f"Generated {len(search_queries)} search queries for case {caseId}: {search_queries}")

        # 4. Search Indian Kanoon with each query and deduplicate
        seen_doc_ids = set()
        all_results = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in search_queries:
                if not query.strip():
                    continue
                try:
                    resp = await client.post(
                        f"{INDIAN_KANOON_BASE_URL}/search/",
                        data={"formInput": query, "pagenum": 0},
                        headers={"Authorization": f"Token {INDIAN_KANOON_API_TOKEN}"}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        for doc in data.get("docs", []):
                            tid = doc.get("tid")
                            if tid and tid not in seen_doc_ids:
                                seen_doc_ids.add(tid)
                                doc["_matched_query"] = query
                                all_results.append(doc)
                except Exception as e:
                    logger.warning(f"IK search failed for query '{query}': {e}")
                    continue

        return {
            "queries": search_queries,
            "docs": all_results[:30],  # Cap total results
            "total": len(all_results),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Find precedents error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to find precedents")


# --- Case Law Bookmarks CRUD ---

@app.post("/case-law/bookmark")
@limiter.limit("30/minute")
async def create_case_law_bookmark(
    request: Request,
    body: CaseLawBookmarkRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Save a case law bookmark."""
    try:
        user_id = get_user_id(current_user)

        # Check if already bookmarked
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


@app.get("/case-law/bookmarks")
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


@app.delete("/case-law/bookmark/{docId}")
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


@app.patch("/case-law/bookmark/{docId}")
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
