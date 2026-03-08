from pydantic import BaseModel
from typing import List, Optional


class InvestigatorRequest(BaseModel):
    caseId: str
    focusQuestions: Optional[List[str]] = None


class InvestigatorResponse(BaseModel):
    final_report: str
    reportId: Optional[str] = None
