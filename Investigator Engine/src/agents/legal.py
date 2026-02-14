from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState
from src.utils import (
    get_llm_with_retry, get_json_parser,
    format_challenges, format_evidence_gaps, format_facts,
    format_timeline, format_legal_issues, format_risks,
    smart_truncate, rate_limiter
)
from pydantic import BaseModel, Field

# --- Legal Researcher ---

class ResearchOutput(BaseModel):
    issues: List[Dict[str, Any]] = Field(description="Identified legal issues with mock research")

def legal_researcher(state: InvestigatorState) -> Dict[str, Any]:
    """
    Identifies legal issues and simulates finding precedents.
    """
    llm = get_llm_with_retry(task_tier="standard")
    parser = get_json_parser(pydantic_object=ResearchOutput)

    prompt = ChatPromptTemplate.from_template(
        """
        You are a Legal Research Assistant specializing in INDIAN LAW.
        Analyze the case facts and narrative to identify key Legal Issues under Indian Jurisdiction.

        Narrative: {narrative}

        For each issue, cite RELEVANT INDIAN LAWS (e.g., "Section 420 of IPC", "Section 138 of NI Act", "Article 21 of Constitution") and relevant Supreme Court/High Court PRECEDENTS.

        return a list of "issues".
        Each issue has: "description", "relevant_laws" (list), "precedents" (list of case names).

        {format_instructions}
        """
    )

    try:
        rate_limiter.wait()
        result = (prompt | llm | parser).invoke({
            "narrative": smart_truncate(state.get("case_narrative", ""), 4000),
            "format_instructions": parser.get_format_instructions()
        })

        if isinstance(result, list):
            return {"legal_issues": result}

        return {"legal_issues": result.get("issues", [])}
    except Exception as e:
        print(f"Error in Legal Researcher: {e}")
        return {"errors": [{"agent": "legal_researcher", "error": str(e)}]}

# --- Risk Assessor ---

class RiskOutput(BaseModel):
    risks: List[Dict[str, str]] = Field(description="List of strategic risks")

def risk_assessor(state: InvestigatorState) -> Dict[str, Any]:
    """
    Identifies vulnerabilities.
    """
    llm = get_llm_with_retry(task_tier="standard")
    parser = get_json_parser(pydantic_object=RiskOutput)

    prompt = ChatPromptTemplate.from_template(
        """
        You are a Legal Risk Strategist.
        Review the identified Challenges and Missing Evidence.

        Challenges: {challenges}
        Missing Evidence: {gaps}

        Predict how the opposing counsel will attack this case.
        Return a list of "risks".
        Each risk has: "description", "impact", "mitigation".

        {format_instructions}
        """
    )

    try:
        rate_limiter.wait()
        result = (prompt | llm | parser).invoke({
            "challenges": format_challenges(state.get("challenges", [])),
            "gaps": format_evidence_gaps(state.get("evidence_gaps", [])),
            "format_instructions": parser.get_format_instructions()
        })

        if isinstance(result, list):
            return {"risks": result}

        return {"risks": result.get("risks", [])}
    except Exception as e:
        print(f"Error in Risk Assessor: {e}")
        return {"errors": [{"agent": "risk_assessor", "error": str(e)}]}

# --- Final Judge ---

def _build_report_metadata(state: InvestigatorState) -> str:
    """Build a metadata header for the report."""
    num_docs = len(state.get("documents", []))
    num_facts = len(state.get("facts", []))
    revision_count = state.get("revision_count", 0)
    num_conflicts = len(state.get("conflicts", []))
    resolved_conflicts = sum(
        1 for c in state.get("conflicts", [])
        if c.get("resolution_status") == "RESOLVED"
    )
    num_gaps = len(state.get("evidence_gaps", []))
    num_risks = len(state.get("risks", []))

    # Confidence scoring
    facts = state.get("facts", [])
    avg_confidence = 0.0
    if facts:
        avg_confidence = sum(f.get("confidence", 0.0) for f in facts) / len(facts)

    conflict_resolution_ratio = 0.0
    if num_conflicts > 0:
        conflict_resolution_ratio = resolved_conflicts / num_conflicts

    # Overall confidence: weighted average of fact confidence and conflict resolution
    overall_confidence = (avg_confidence * 0.6) + (conflict_resolution_ratio * 0.4) if facts else 0.0

    # Errors
    errors = state.get("errors", [])

    header = f"""---
## Report Metadata
| Metric | Value |
|--------|-------|
| Documents Analyzed | {num_docs} |
| Facts Extracted | {num_facts} |
| Revision Cycles | {revision_count} |
| Conflicts Found | {num_conflicts} |
| Conflicts Resolved | {resolved_conflicts} |
| Evidence Gaps | {num_gaps} |
| Risks Identified | {num_risks} |
| Avg Fact Confidence | {avg_confidence:.2f} |
| Overall Confidence | {overall_confidence:.2f} |
---
"""
    if errors:
        header += "\n### Processing Notes\n"
        for err in errors:
            header += f"- **{err.get('agent', 'unknown')}**: {err.get('error', 'Unknown error')}\n"
        header += "\n"

    return header


def final_judge(state: InvestigatorState) -> Dict[str, Any]:
    """
    Synthesizes the Final Legal Intelligence Report.
    Generates sections independently to avoid context window overflow.
    """
    llm = get_llm_with_retry(task_tier="powerful")

    # Build metadata header
    metadata_header = _build_report_metadata(state)

    prompt = ChatPromptTemplate.from_template(
        """
        You are the Chief Legal Investigator.
        Compile the Final Legal Intelligence Report based on all the work done.

        STRUCTURE:
        1. Case Overview
        2. Parties & Relationships
        3. Timeline of Events
        4. Key Facts & Connections
        5. Contradictions & Challenges (Resolved & Unresolved)
        6. Missing Evidence (CRITICAL)
        7. Legal Analysis (Laws & Precedents)
        8. Strategic Assessment (Strengths, Weaknesses, Risks, Recommendations)

        DATA:
        Narrative: {narrative}
        Timeline: {timeline}
        Entities: {entities}
        Facts: {facts}
        Challenges: {challenges}
        Gaps: {gaps}
        Legal Issues: {legal_issues}
        Risks: {risks}

        Output Markdown formatted text.
        """
    )

    chain = prompt | llm

    try:
        rate_limiter.wait()
        response = chain.invoke({
            "narrative": smart_truncate(state.get("case_narrative", ""), 4000),
            "timeline": smart_truncate(format_timeline(state.get("timeline", [])), 3000),
            "entities": smart_truncate(", ".join(state.get("entities", [])), 2000),
            "facts": smart_truncate(format_facts(state.get("facts", [])), 4000),
            "challenges": format_challenges(state.get("challenges", [])),
            "gaps": format_evidence_gaps(state.get("evidence_gaps", [])),
            "legal_issues": format_legal_issues(state.get("legal_issues", [])),
            "risks": format_risks(state.get("risks", []))
        })

        report = metadata_header + "\n" + response.content
        return {"final_report": report}
    except Exception as e:
        print(f"Error in Final Judge: {e}")
        return {
            "final_report": metadata_header + "\n\n**Error generating detailed report:** " + str(e),
            "errors": [{"agent": "final_judge", "error": str(e)}]
        }
