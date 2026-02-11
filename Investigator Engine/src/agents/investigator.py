from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState
from src.utils import get_llm_with_retry, get_json_parser, format_facts, smart_truncate, rate_limiter
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
    Incorporates custom focus questions if provided.
    """
    llm = get_llm_with_retry(task_tier="powerful")
    parser = get_json_parser(pydantic_object=InvestigatorOutput)

    # Check if this is a refinement round
    feedback_context = ""
    if state.get("challenges"):
        feedback_context = "PREVIOUS CHALLENGES (You must address these):\n"
        for challenge in state["challenges"]:
            desc = challenge.get('description') or challenge.get('challenge') or challenge.get('issue') or str(challenge)
            severity = challenge.get('severity') or challenge.get('level') or challenge.get('priority') or 'MEDIUM'
            feedback_context += f"- {desc} (Severity: {severity})\n"

    # Build focus questions context
    focus_context = ""
    focus_questions = state.get("focus_questions", [])
    if focus_questions:
        focus_context = "INVESTIGATION FOCUS (prioritize these questions):\n"
        for q in focus_questions:
            focus_context += f"- {q}\n"

    facts_text = format_facts(state["facts"])

    prompt = ChatPromptTemplate.from_template(
        """
        You are the LEAD LEGAL INVESTIGATOR. Your goal is to synthesize raw evidence into a rock-solid case narrative.

        KNOWN FACTS (with citations):
        {facts}

        PREVIOUS NARRATIVE (if any):
        {current_narrative}

        {feedback_context}

        {focus_context}

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
        rate_limiter.wait()
        result = chain.invoke({
            "facts": smart_truncate(facts_text, 4000),
            "current_narrative": smart_truncate(state.get("case_narrative", ""), 4000),
            "feedback_context": feedback_context,
            "focus_context": focus_context,
            "format_instructions": parser.get_format_instructions()
        })

        new_revision_count = state.get("revision_count", 0) + 1

        return {
            "case_narrative": result["narrative"],
            "timeline": result["timeline"],
            "hypotheses": result["hypotheses"],
            "revision_count": new_revision_count,
            "challenges": [],  # Clear stale challenges before critics re-evaluate
        }
    except Exception as e:
        print(f"Error in Primary Investigator: {e}")
        return {
            "case_narrative": state.get("case_narrative", ""),
            "timeline": state.get("timeline", []),
            "hypotheses": state.get("hypotheses", []),
            "revision_count": state.get("revision_count", 0) + 1,
            "challenges": [],
            "errors": [{"agent": "primary_investigator", "error": str(e)}],
        }
