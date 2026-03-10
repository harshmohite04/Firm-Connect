from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


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


class CheckSourcesRequest(BaseModel):
    selectedText: str
    contexts: List[ContextItem]


class Message(BaseModel):
    role: str
    content: str
    contexts: Optional[List[ContextItem]] = None


class RenameSessionRequest(BaseModel):
    title: str


class ChatHistoryResponse(BaseModel):
    history: List[Message]
