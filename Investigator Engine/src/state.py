import operator
from typing import List, Dict, Optional, Annotated, Any
from typing_extensions import TypedDict

class Fact(TypedDict):
    id: str
    source_doc_id: str
    source_quote: str  # Direct text snippet
    description: str
    entities: List[str]
    date: Optional[str]  # Normalized date if possible
    confidence: float

class Conflict(TypedDict):
    description: str
    conflicting_fact_ids: List[str]
    resolution_status: str  # "UNRESOLVED" or "RESOLVED"
    resolution_note: Optional[str]

class Document(TypedDict):
    id: str
    content: str
    metadata: Dict[str, Any]
    analysis: Optional[Dict[str, Any]]

class Challenge(TypedDict):
    description: str
    severity: str
    counter_evidence: Optional[str]

class InvestigatorState(TypedDict):
    # Input data
    documents: List[Document]

    # Persistent Knowledge (Deep Extraction)
    entities: Annotated[List[str], operator.add]
    facts: Annotated[List[Fact], operator.add]
    timeline: List[Dict[str, Any]]  # Full audited timeline
    conflicts: List[Conflict]        # Tracked contradictions

    # Agent Narratives and reasoning
    case_narrative: str
    hypotheses: List[Dict[str, Any]]

    # Critique & Refinement
    challenges: List[Challenge]
    evidence_gaps: List[Dict[str, Any]]
    validation_status: Dict[str, str]

    # Final Result
    final_report: Optional[str]
    
    # Control logic
    revision_count: int
