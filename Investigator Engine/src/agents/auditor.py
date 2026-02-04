from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState, Conflict
from src.utils import get_llm, get_json_parser
from pydantic import BaseModel, Field

class AuditOutput(BaseModel):
    timeline: List[Dict[str, Any]] = Field(description="Chronological list of all facts")
    conflicts: List[Dict[str, Any]] = Field(description="List of detected date or event contradictions")

def audit_timeline(state: InvestigatorState) -> Dict[str, Any]:
    """
    Specifically audits the timeline for consistency.
    Identifies if two documents give different dates for the same event.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=AuditOutput)
    
    # Context: Facts with dates
    dated_facts = [f for f in state["facts"] if f.get("date")]
    undated_facts = [f for f in state["facts"] if not f.get("date")]
    
    facts_context = "DATED FACTS:\n"
    for f in dated_facts:
        facts_context += f"- [{f['id']}] Date: {f['date']} | Desc: {f['description']} | Doc: {f['source_doc_id']}\n"
    
    facts_context += "\nUNDATED FACTS (Contextual):\n"
    for f in undated_facts[:20]: # Limit for context
        facts_context += f"- [{f['id']}] Desc: {f['description']}\n"

    prompt = ChatPromptTemplate.from_template(
        """
        You are the CHIEF TEMPORAL AUDITOR. 
        Your task is to build a high-fidelity Timeline and identify every CONTEMPORAL CONFLICT.
        
        INPUT FACTS:
        {facts_context}
        
        AUDIT REQUIREMENTS:
        1. **Chronological Sequence**: Sort every fact by date. Use contextual clues to place undated facts.
        2. **Logical Consistency**: Identify if an event (e.g. Counter-Offer) is claimed to happen BEFORE its trigger (e.g. Original Offer).
        3. **Cross-Document Discrepancy**: Flag if Doc A and Doc B give different dates for the same uniquely identifiable event.
        4. **Temporal Impossibility**: Flag if an incident is reported before its stated occurrence date.
        
        Return the timeline and a list of specific "conflicts" with IDs.
        
        {format_instructions}
        """
    )
    
    try:
        result = (prompt | llm | parser).invoke({
            "facts_context": facts_context,
            "format_instructions": parser.get_format_instructions()
        })
        
        # Convert output to state schema
        raw_conflicts = result.conflicts if hasattr(result, "conflicts") else result.get("conflicts", [])
        formatted_conflicts = []
        for rc in raw_conflicts:
            formatted_conflicts.append({
                "description": rc.get("description", ""),
                "conflicting_fact_ids": rc.get("conflicting_fact_ids", []),
                "resolution_status": "UNRESOLVED"
            })
            
        return {
            "timeline": result.timeline if hasattr(result, "timeline") else result.get("timeline", []),
            "conflicts": formatted_conflicts
        }
        
    except Exception as e:
        print(f"Error in Timeline Auditor: {e}")
        return {"timeline": [], "conflicts": []}
