from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState
from src.utils import get_llm, get_json_parser
from pydantic import BaseModel, Field

# --- Cross-Examiner (Advanced) ---

class CritiqueOutput(BaseModel):
    challenges: List[Dict[str, str]] = Field(description="List of challenges to the narrative")

def cross_examiner(state: InvestigatorState) -> Dict[str, Any]:
    """
    Advanced Cross-Examiner that uses ground facts and citations to find gaps.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=CritiqueOutput)
    
    # Prepare Fact context with Citations
    facts_context = ""
    for f in state.get("facts", []):
        facts_context += f"- [{f['id']}] {f['description']}\n  Quote: \"{f['source_quote']}\" (Doc: {f['source_doc_id']})\n"

    prompt = ChatPromptTemplate.from_template(
        """
        You are the AGGRESSIVE CROSS-EXAMINER. Your mission is to find every flaw, assumption, and logical leap in the Investigator's narrative.
        
        NARRATIVE:
        {narrative}
        
        FACTS WITH CITATIONS:
        {facts}
        
        ATTACK STRATEGY:
        1. **Check Citations**: Flag any narrative claim that doesn't have a supporting Fact ID or Quote.
        2. **Challenge Interpretation**: Provide alternative, non-incriminating explanations for the existing facts.
        3. **Identify Contradictions**: Use the Fact List to show where the Investigator's story violates documented evidence.
        4. **Severity Level**: 
           - HIGH: Logical impossibility or direct contradiction of a signed document.
           - MEDIUM: Unstated assumption or missing link.
           - LOW: Minor detail inconsistency.
        
        Return a list of specific "challenges".
        
        {format_instructions}
        """
    )
    
    try:
        chain = prompt | llm | parser
        result = chain.invoke({
            "narrative": state.get("case_narrative", ""),
            "facts": facts_context[:10000], # Process more context
            "format_instructions": parser.get_format_instructions()
        })
        
        if isinstance(result, list):
            return {"challenges": result}
        return {"challenges": result.get("challenges", [])}
    except Exception as e:
        print(f"Error in Cross-Examiner: {e}")
        return {"challenges": []}

# --- Conflict Resolver ---

class ResolutionOutput(BaseModel):
    resolutions: List[Dict[str, Any]] = Field(description="List of resolutions for each conflict")

def resolve_conflicts(state: InvestigatorState) -> Dict[str, Any]:
    """
    Attempts to resolve flagged contradictions by looking at the evidence again.
    """
    if not state.get("conflicts"):
        return {"conflicts": []}
        
    llm = get_llm()
    parser = get_json_parser(pydantic_object=ResolutionOutput)
    
    conflicts_text = ""
    for i, c in enumerate(state.get("conflicts", [])):
        conflicts_text += f"{i}. {c['description']} (Involving: {c['conflicting_fact_ids']})\n"
        
    facts_map = {f["id"]: f for f in state.get("facts", [])}
    relevant_facts = ""
    for c in state.get("conflicts", []):
        for fid in c["conflicting_fact_ids"]:
            f = facts_map.get(fid)
            if f:
                relevant_facts += f"- [{f['id']}] {f['description']} | Quote: {f['source_quote']} | Doc: {f['source_doc_id']}\n"

    prompt = ChatPromptTemplate.from_template(
        """
        You are the Conflict Resolver. 
        We have found contradictions in the evidence.
        
        CONFLICTS:
        {conflicts}
        
        RELEVANT EVIDENCE:
        {evidence}
        
        TASK:
        Analyze the evidence. Can you resolve the conflict? 
        e.g. One document is more recent? One is a formal signed contract while the other is an informal email?
        
        For each conflict, provide a "resolution_note" and update "resolution_status" to "RESOLVED" if possible.
        
        {format_instructions}
        """
    )
    
    try:
        result = (prompt | llm | parser).invoke({
            "conflicts": conflicts_text,
            "evidence": relevant_facts,
            "format_instructions": parser.get_format_instructions()
        })
        
        # Merge resolutions back
        if isinstance(result, ResolutionOutput):
            resolutions = result.resolutions
        elif isinstance(result, dict):
            resolutions = result.get("resolutions", [])
        else:
             # Fallback if somehow it's a list or other type
             resolutions = []

        current_conflicts = list(state["conflicts"])
        
        for i, res in enumerate(resolutions):
            if i < len(current_conflicts):
                current_conflicts[i]["resolution_status"] = res.get("status", "RESOLVED")
                current_conflicts[i]["resolution_note"] = res.get("note", "")
                
        return {"conflicts": current_conflicts}
        
    except Exception as e:
        print(f"Error in Conflict Resolver: {e}")
        return {}

# --- Evidence Validator ---
# (Keeping basic for now, can be upgraded later if needed)
class ValidationOutput(BaseModel):
    validation_status: Dict[str, str] = Field(description="Status of each hypothesis: validated/unsupported")

def evidence_validator(state: InvestigatorState) -> Dict[str, Any]:
    """
    Checks if hypotheses are supported by specific facts.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=ValidationOutput)
    
    prompt = ChatPromptTemplate.from_template(
        """
        You are the Evidence Validator.
        
        Hypotheses:
        {hypotheses}
        
        Facts:
        {facts}
        
        Determine if each hypothesis is strongly supported, weakly supported, or unsupported by the facts.
        
        {format_instructions}
        """
    )
    
    try:
        result = (prompt | llm | parser).invoke({
            "hypotheses": str(state.get("hypotheses", [])),
            "facts": str(state.get("facts", [])),
            "format_instructions": parser.get_format_instructions()
        })
        return {"validation_status": result.get("validation_status", {})}
    except Exception as e:
        print(f"Error in Evidence Validator: {e}")
        return {}

# --- Gap & Missing Evidence Detector ---

class GapOutput(BaseModel):
    gaps: List[Dict[str, str]] = Field(description="List of missing items")

def gap_detector(state: InvestigatorState) -> Dict[str, Any]:
    """
    Identifies missing documents or proof.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=GapOutput)
    
    prompt = ChatPromptTemplate.from_template(
        """
        You are the Missing Evidence Detector.
        Based on the current narrative and timeline, what CRITICAL evidence is missing?
        e.g. "We have the invoice but no proof of payment", "We have the contract but no signature page".
        
        Narrative: {narrative}
        Timeline: {timeline}
        
        Return a list of specific missing items/gaps.
        Each gap item should have: "description", "importance" (HIGH/MEDIUM).
        
        {format_instructions}
        """
    )
    
    try:
        result = (prompt | llm | parser).invoke({
            "narrative": state.get("case_narrative", ""),
            "timeline": str(state.get("timeline", [])),
            "format_instructions": parser.get_format_instructions()
        })
        
        if isinstance(result, list):
            return {"evidence_gaps": result}
            
        return {"evidence_gaps": result.get("gaps", [])}
    except Exception as e:
        print(f"Error in Gap Detector: {e}")
        return {}
