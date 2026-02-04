from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState
from src.utils import get_llm, get_json_parser
from pydantic import BaseModel, Field

class Hypothesis(BaseModel):
    description: str = Field(description="A working hypothesis about the case")
    supporting_facts: List[str] = Field(description="IDs or descriptions of facts supporting this")

class InvestigatorOutput(BaseModel):
    narrative: str = Field(description="Comprehensive case narrative")
    timeline: List[Dict[str, str]] = Field(description=" Chronological list of events")
    hypotheses: List[Hypothesis]

def primary_investigator(state: InvestigatorState) -> Dict[str, Any]:
    """
    Synthesizes facts into a coherent narrative and forms hypotheses.
    Handles feedback from the Cross-Examiner if present.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=InvestigatorOutput)
    
    # Check if this is a refinement round
    feedback_context = ""
    if state.get("challenges"):
        feedback_context = "PREVIOUS CHALLENGES (You must address these):\n"
        for challenge in state["challenges"]:
            feedback_context += f"- {challenge['description']} (Severity: {challenge['severity']})\n"
            
    facts_text = ""
    for fact in state["facts"]:
        facts_text += f"- [{fact.get('source_doc_id', 'Unknown')}] {fact['description']} (Conf: {fact['confidence']})\n"

    prompt = ChatPromptTemplate.from_template(
        """
        You are the LEAD LEGAL INVESTIGATOR. Your goal is to synthesize raw evidence into a rock-solid case narrative.
        
        KNOWN FACTS (with citations):
        {facts}
        
        PREVIOUS NARRATIVE (if any):
        {current_narrative}
        
        {feedback_context}
        
        CORE REQUIREMENTS:
        1. **Evidence Grounding**: Every major claim in your narrative MUST cite a Fact ID (e.g. "[fact_0]").
        2. **Logical Connectivity**: Ensure the narrative explains WHY events follow each other.
        3. **Refinement**: If there is feedback/critique, you MUST explicitly address it or admit why it cannot be addressed.
        4. **Uncertainty**: Clearly identify where the evidence is thin or where you are making a logical leap.
        
        {format_instructions}
        """
    )
    
    chain = prompt | llm | parser
    
    try:
        result = chain.invoke({
            "facts": facts_text[:4000],
            "current_narrative": state.get("case_narrative", "")[:4000],
            "feedback_context": feedback_context,
            "format_instructions": parser.get_format_instructions()
        })
        
        # Increment revision count
        new_revision_count = state.get("revision_count", 0) + 1
        
        return {
            "case_narrative": result["narrative"],
            "timeline": result["timeline"],
            "hypotheses": result["hypotheses"],
            "revision_count": new_revision_count
        }
    except Exception as e:
        print(f"Error in Primary Investigator: {e}")
        return {
            "case_narrative": state.get("case_narrative", ""),
            "timeline": state.get("timeline", []),
            "hypotheses": state.get("hypotheses", []),
            "revision_count": state.get("revision_count", 0) + 1
        }
