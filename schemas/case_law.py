from pydantic import BaseModel, Field
from typing import List, Optional


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
