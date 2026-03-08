from pydantic import BaseModel


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
