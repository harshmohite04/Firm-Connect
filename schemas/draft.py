from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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


class CreateDraftVersionRequest(BaseModel):
    label: str
    content: str


class DraftVersionSummary(BaseModel):
    version_number: int
    label: Optional[str] = None
    type: str
    created_at: datetime


class DraftVersionFull(BaseModel):
    version_number: int
    label: Optional[str] = None
    type: str
    content: str
    created_at: datetime
