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
    pinned: bool = False


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


class ChatFeedbackRequest(BaseModel):
    session_id: str
    message_id: int
    feedback: str  # "up" or "down"
    message_content: Optional[str] = None


class ChatFeedbackResponse(BaseModel):
    success: bool
    message: str


class TruncateSessionRequest(BaseModel):
    after_index: int


class PinSessionRequest(BaseModel):
    pinned: bool


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class CustomInstructionsRequest(BaseModel):
    instructions: str


class CustomInstructionsResponse(BaseModel):
    instructions: str
    updated_at: Optional[datetime] = None


class SearchRequest(BaseModel):
    caseId: str
    q: str


class ModelOverrideChatRequest(BaseModel):
    message: str
    caseId: str
    sessionId: Optional[str] = None
    top_k: int = 15
    model_override: Optional[str] = None
