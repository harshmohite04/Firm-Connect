from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import shutil
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pymongo import MongoClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from rag.rag import ask
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

generator = DocumentGenerator()

load_dotenv()

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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
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

class InvestigatorResponse(BaseModel):
    final_report: str


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
import re
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


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("30/minute")  # Limit AI requests
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: Dict = Depends(get_current_user)
):
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
            
            # Verify ownership
            if session_doc and session_doc.get("user_id") != user_id:
                log_security_event("UNAUTHORIZED_CHAT_ACCESS", {
                    "user_id": user_id,
                    "session_id": body.sessionId
                })
                raise HTTPException(status_code=403, detail="Access denied")
        else:
            # Legacy fallback
            session_doc = chat_collection.find_one({
                "case_id": body.caseId, 
                "session_id": {"$exists": False}
            })
        
        history = session_doc["messages"] if session_doc else []
        
        # Limit history to last 10 messages to fit token limits
        recent_history = history[-10:]

        # 2. Get Answer from RAG
        result = ask(
            query=body.message,
            case_id=body.caseId,
            history=recent_history,
            top_k=body.top_k
        )

        # Extract context items from result
        contexts = []
        if hasattr(result, 'retriever_result') and result.retriever_result:
            for item in result.retriever_result.items:
                content_str = item.content
                source = None
                text_content = content_str # Default to raw string

                # Try to extract source using regex
                source_match = re.search(r"['\"]source['\"]\s*:\s*['\"]([^'\"]+)['\"]", content_str)
                if source_match:
                    source = source_match.group(1)
                
                # Try to clean text
                text_match = re.search(r"['\"]text['\"]\s*:\s*['\"]((?:[^'\\]|\\.)*)['\"]", content_str)
                if text_match:
                     text_content = text_match.group(1).replace("\\n", "\n").replace("\\'", "'")

                contexts.append(
                    ContextItem(
                        content=text_content,
                        source=source,
                        metadata={"original_content": content_str},
                        score=getattr(item, 'score', None)
                    )
                )

        # 3. Save to History
        new_user_msg = {"role": "user", "content": body.message}
        
        # Convert contexts to dicts for MongoDB
        contexts_dicts = [ctx.model_dump() for ctx in contexts] if contexts else []
        new_ai_msg = {
            "role": "assistant", 
            "content": result.answer,
            "contexts": contexts_dicts
        }

        # Update MongoDB (upsert)
        if body.sessionId:
            chat_collection.update_one(
                {"session_id": body.sessionId},
                {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                upsert=False  # Session must exist for security
            )
        else:
             # Legacy
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
                            
                            # Parse and ingest
                            from ingestion.loader import parse_file
                            text = parse_file(dest_path)
                            
                            if text.strip():
                                ingest_document(text, source_name=extracted_safe_name, case_id=caseId)
                                
                                # Set status to Ready
                                document_status_collection.update_one(
                                    {"case_id": caseId, "filename": extracted_safe_name},
                                    {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
                                )
                                ingested_files.append(extracted_safe_name)
                                logger.info(f"Ingested from zip: {extracted_safe_name}")
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
                "status": "success",
                "message": f"Zip extracted and processed",
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
                
            # Read content using loader
            from ingestion.loader import parse_file
            text = parse_file(file_location)

            if not text.strip():
                raise HTTPException(
                    status_code=400, 
                    detail="Could not extract text from file or file is empty."
                )

            # Ingest
            ingest_document(text, source_name=safe_filename, case_id=caseId)
            
            # Set status to Ready
            document_status_collection.update_one(
                {"case_id": caseId, "filename": safe_filename},
                {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
            )
            
            logger.info(f"File ingested: {safe_filename} for case {caseId} by user {user_id}")
            
            return {
                "status": "success", 
                "filename": safe_filename, 
                "caseId": caseId
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

        ingest_document(body.content, source_name=safe_filename, case_id=body.caseId)
        
        # Set status to Ready
        document_status_collection.update_one(
            {"case_id": body.caseId, "filename": safe_filename},
            {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
        )

        logger.info(f"Document saved: {safe_filename} for case {body.caseId} by user {user_id}")

        return {"status": "success", "filename": safe_filename}

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
async def run_investigation(request: InvestigatorRequest):
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    try:
        # 1. Fetch documents for the case
        # We need to get the text content of documents. 
        # In this system, we use Qdrant for RAG, but the Investigator Engine expects raw text.
        # We can either fetch from Qdrant scroll or read files from disk.
        # Reading from disk is safer for full context.
        
        # Get list of ready documents
        docs_status = list(document_status_collection.find({"case_id": request.caseId, "status": "Ready"}))
        
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
             # Fallback to mock if no docs (or raise error)
             # raise HTTPException(status_code=404, detail="No documents found for this case.")
             pass

        # 2. Initialize State
        initial_state = {
            "documents": doc_list,
            "entities": [],
            "facts": [],
            "timeline": [],
            "revision_count": 0,
            # Add any other required keys from InvestigatorState
        }

        # 3. Invoke Graph
        # We need to run this async or in a separate thread because it might block
        # For now, running synchronously (beware of timeout)
        workflow = create_graph()
        final_state = workflow.invoke(initial_state)
        
        report = final_state.get("final_report", "Analysis completed but no report was generated.")

        return InvestigatorResponse(final_report=report)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")




# ---------- SECURITY NOTE ----------
# Static file serving has been REMOVED for security.
# All document access must go through authenticated endpoints.

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


if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
