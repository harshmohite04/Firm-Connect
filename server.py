from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
from dotenv import load_dotenv
from datetime import datetime
from pymongo import MongoClient

from rag.rag import ask
from ingestion.injector import ingest_document, delete_document

load_dotenv()

app = FastAPI(
    title="Hospital RAG API",
    version="1.0"
)

# ---------- MONGO DB ----------
# Dependencies updated
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["lawfirm"]
chat_collection = db["chat_history"]
document_status_collection = db["document_status"]

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- MODELS ----------
class ChatRequest(BaseModel):
    message: str
    caseId: str
    sessionId: Optional[str] = None
    top_k: int = 15

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

# ---------- ROUTES ----------
import re
import uuid

@app.post("/chat/session", response_model=SessionResponse)
def create_session(request: CreateSessionRequest):
    try:
        session_id = str(uuid.uuid4())
        new_session = {
            "session_id": session_id,
            "case_id": request.caseId,
            "title": request.title,
            "created_at": datetime.utcnow(),
            "messages": []
        }
        chat_collection.insert_one(new_session)
        return SessionResponse(
            session_id=session_id,
            title=new_session["title"],
            created_at=new_session["created_at"]
        )
    except Exception as e:
        print(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/sessions/{caseId}", response_model=List[SessionResponse])
def get_sessions(caseId: str):
    try:
        cursor = chat_collection.find({"case_id": caseId}).sort("created_at", -1)
        sessions = []
        for doc in cursor:
            # Handle legacy docs that might not have session_id
            if "session_id" not in doc:
                continue
            sessions.append(SessionResponse(
                session_id=doc["session_id"],
                title=doc.get("title", "Untitled Chat"),
                created_at=doc.get("created_at", datetime.utcnow())
            ))
        return sessions
    except Exception as e:
        print(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/history/{sessionId}", response_model=ChatHistoryResponse)
def get_chat_history(sessionId: str):
    try:
        # Try to find by session_id first
        session_doc = chat_collection.find_one({"session_id": sessionId})
        
        # Fallback: check if the ID passed is actually a caseId (legacy single-chat mode)
        if not session_doc:
             session_doc = chat_collection.find_one({"case_id": sessionId, "session_id": {"$exists": False}})

        if not session_doc or "messages" not in session_doc:
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

    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        session_doc = None
        
        # 1. Fetch history from MongoDB
        if request.sessionId:
            session_doc = chat_collection.find_one({"session_id": request.sessionId})
        else:
            # Legacy fallback
            session_doc = chat_collection.find_one({"case_id": request.caseId, "session_id": {"$exists": False}})
        
        history = session_doc["messages"] if session_doc else []
        
        # Limit history to last 10 messages to fit token limits
        recent_history = history[-10:]

        # 2. Get Answer from RAG
        result = ask(
            query=request.message,
            case_id=request.caseId,
            history=recent_history,
            top_k=request.top_k
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
        new_user_msg = {"role": "user", "content": request.message}
        
        # Convert contexts to dicts for MongoDB
        contexts_dicts = [ctx.model_dump() for ctx in contexts] if contexts else []
        new_ai_msg = {
            "role": "assistant", 
            "content": result.answer,
            "contexts": contexts_dicts
        }

        # Update MongoDB (upsert)
        if request.sessionId:
            chat_collection.update_one(
                {"session_id": request.sessionId},
                {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                upsert=True # This should ideally be False if we ensure session creation first, but True keeps it robust
            )
        else:
             # Legacy
             chat_collection.update_one(
                {"case_id": request.caseId, "session_id": {"$exists": False}},
                {"$push": {"messages": {"$each": [new_user_msg, new_ai_msg]}}},
                upsert=True
            )

        return ChatResponse(
            answer=result.answer,
            contexts=contexts
        )

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )


@app.post("/ingest")
async def ingest_file(file: UploadFile = File(...), caseId: str = Form(...)):
    try:
        # Set status to Processing
        document_status_collection.update_one(
            {"case_id": caseId, "filename": file.filename},
            {"$set": {"status": "Processing", "filename": file.filename, "case_id": caseId, "last_updated": datetime.utcnow()}},
            upsert=True
        )

        # Save file locally
        file_location = f"documents/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        # Read content using loader
        from ingestion.loader import parse_file
        text = parse_file(file_location)

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file or file is empty.")

        # Ingest
        ingest_document(text, source_name=file.filename, case_id=caseId)
        
        # Set status to Ready
        document_status_collection.update_one(
            {"case_id": caseId, "filename": file.filename},
            {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
        )
        
        return {"status": "success", "filename": file.filename, "caseId": caseId}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during ingestion: {e}")
        # Set status to Failed
        document_status_collection.update_one(
            {"case_id": caseId, "filename": file.filename},
            {"$set": {"status": "Failed", "error": str(e), "last_updated": datetime.utcnow()}}
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents/{caseId}")
def get_documents_status(caseId: str):
    docs = list(document_status_collection.find({"case_id": caseId}, {"_id": 0}))
    return docs


@app.delete("/documents/{caseId}/{filename}")
def delete_document_endpoint(caseId: str, filename: str):
    try:
        # 1. Delete from Neo4j & Qdrant (Remove from AI Context)
        delete_document(caseId, filename)

        # 2. Soft Delete in MongoDB: Update status to 'Archived'
        # We generally want to keep the record but mark it as not active for RAG
        result = document_status_collection.update_one(
            {"case_id": caseId, "filename": filename},
            {"$set": {"status": "Archived", "last_updated": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            print(f"[WARN] Document {filename} not found in MongoDB status for case {caseId}")

        # 3. Preserve file on disk (Do NOT delete)
        print(f"[INFO] Document {filename} archived. File preserved on disk.")

        return {"status": "success", "message": f"Document {filename} archived successfully"}

    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}


# Mount the documents directory to serve static files
app.mount("/files", StaticFiles(directory="documents"), name="files")

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )