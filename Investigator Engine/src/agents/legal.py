from typing import Dict, Any, List, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState
from src.utils import get_llm, get_json_parser
from pydantic import BaseModel, Field

# --- Legal Researcher ---

class ResearchOutput(BaseModel):
    issues: List[Dict[str, Any]] = Field(description="Identified legal issues with mock research")

def legal_researcher(state: InvestigatorState) -> Dict[str, Any]:
    """
    Identifies legal issues and simulates finding precedents.
    """
    llm = get_llm()
    parser = get_json_parser(pydantic_object=ResearchOutput)
    
    prompt = ChatPromptTemplate.from_template(
        """
        You are a Legal Research Assistant.
        Analyze the case facts and narrative to identify key Legal Issues.
        
        Narrative: {narrative}
        
        For each issue, cite RELEVANT LAWS (Mock them if needed, e.g. "Section X of Contract Act") and PRECEDENTS.
        
        return a list of "issues".
        Each issue has: "description", "relevant_laws" (list), "precedents" (list of case names).
        
        {format_instructions}
        """
    )
    
    try:
        result = (prompt | llm | parser).invoke({
            "narrative": state.get("case_narrative", ""),
            "format_instructions": parser.get_format_instructions()
        })
        
        if isinstance(result, list):
            return {"legal_issues": result}
            
        return {"legal_issues": result.get("issues", [])}
    except Exception as e:
        print(f"Error in Legal Researcher: {e}")
        return {}

# --- Risk Assessor ---

class RiskOutput(BaseModel):
    risks: List[Dict[str, str]] = Field(description="List of strategic risks")

def risk_assessor(state: InvestigatorState) -> Dict[str, Any]:
    """
    Identifies vulnerabilities.
    """
    llm = get_llm()
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
        result = (prompt | llm | parser).invoke({
            "challenges": str(state.get("challenges", [])),
            "gaps": str(state.get("evidence_gaps", [])),
            "format_instructions": parser.get_format_instructions()
        })
        
        if isinstance(result, list):
            return {"risks": result}
            
        return {"risks": result.get("risks", [])}
    except Exception as e:
        print(f"Error in Risk Assessor: {e}")
        return {}

# --- Final Judge ---

def final_judge(state: InvestigatorState) -> Dict[str, Any]:
    """
    Synthesizes the Final Legal Intelligence Report.
    """
    llm = get_llm()
    
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
        response = chain.invoke({
            "narrative": state.get("case_narrative", "")[:4000],
            "timeline": str(state.get("timeline", []))[:4000],
            "entities": str(state.get("entities", []))[:2000],
            "facts": str(state.get("facts", []))[:4000],
            "challenges": str(state.get("challenges", [])),
            "gaps": str(state.get("evidence_gaps", [])),
            "legal_issues": str(state.get("legal_issues", [])),
            "risks": str(state.get("risks", []))
        })
        return {"final_report": response.content}
    except Exception as e:
        print(f"Error in Final Judge: {e}")
        return {"final_report": "Error generating report."}
