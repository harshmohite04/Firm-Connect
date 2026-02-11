import os
import operator
from typing import Annotated, Any, Dict, List
from dotenv import load_dotenv

load_dotenv()

from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage

from src.state import InvestigatorState
from src.agents.analyst import document_analyst, entity_fact_extractor
from src.agents.investigator import primary_investigator
from src.agents.auditor import audit_timeline
from src.agents.critic import cross_examiner, evidence_validator, gap_detector, resolve_conflicts
from src.agents.legal import legal_researcher, risk_assessor, final_judge

# --- Graph Construction ---

def create_graph():
    workflow = StateGraph(InvestigatorState)
    
    # 1. Document Processing & Fact Extraction
    workflow.add_node("document_analyst", document_analyst)
    workflow.add_node("entity_extractor", entity_fact_extractor)
    
    # 2. Timeline & Audit (New)
    workflow.add_node("auditor", audit_timeline)
    
    # 3. Investigation Core
    workflow.add_node("primary_investigator", primary_investigator)
    
    # 4. Critics, Conflict Resolution & Research (Parallel/Sequential)
    workflow.add_node("cross_examiner", cross_examiner)
    workflow.add_node("conflict_resolver", resolve_conflicts)
    workflow.add_node("evidence_validator", evidence_validator)
    workflow.add_node("gap_detector", gap_detector)
    workflow.add_node("legal_researcher", legal_researcher)
    
    # 5. Final Assessment
    workflow.add_node("risk_assessor", risk_assessor)
    workflow.add_node("final_judge", final_judge)
    
    # Edges
    workflow.set_entry_point("document_analyst")
    workflow.add_edge("document_analyst", "entity_extractor")
    workflow.add_edge("entity_extractor", "auditor") # Audit after facts are extracted
    workflow.add_edge("auditor", "primary_investigator")
    
    # Fan out from Investigator to Critics
    workflow.add_edge("primary_investigator", "cross_examiner")
    workflow.add_edge("primary_investigator", "evidence_validator")
    workflow.add_edge("primary_investigator", "gap_detector")
    workflow.add_edge("primary_investigator", "legal_researcher")
    
    # Conditional logic node for synchronization
    def hub_node(state):
        return {} 
    
    workflow.add_node("debate_hub", hub_node)
    
    workflow.add_edge("cross_examiner", "conflict_resolver") # Sequential check for contradictions
    workflow.add_edge("conflict_resolver", "debate_hub")
    
    workflow.add_edge("evidence_validator", "debate_hub")
    workflow.add_edge("gap_detector", "debate_hub")
    workflow.add_edge("legal_researcher", "debate_hub")
    
    # Conditional Logic for Debate Loop
    def debate_check(state: InvestigatorState) -> str:
        challenges = state.get("challenges", [])
        revision_count = state.get("revision_count", 0)
        max_revisions = 2 
        
        print(f"--- DEBUG: Revision Count: {revision_count} ---")
        high_severity = any(str(c.get("severity", "")).upper() == "HIGH" for c in challenges)
        
        if high_severity and revision_count < max_revisions:
            print(f"--- LOOPING BACK: Found HIGH intensity challenges (Rev {revision_count}) ---")
            return "primary_investigator"
        
        print("--- PROCEEDING TO FINAL ASSESSMENT ---")
        return "risk_assessor"

    workflow.add_conditional_edges(
        "debate_hub",
        debate_check,
        {
            "primary_investigator": "primary_investigator",
            "risk_assessor": "risk_assessor"
        }
    )
    
    workflow.add_edge("risk_assessor", "final_judge")
    workflow.add_edge("final_judge", END)
    
    return workflow.compile()

# --- Execution ---

if __name__ == "__main__":
    import uuid
    
    # --- Document Loading ---
    import glob
    from pypdf import PdfReader
    
    docs_dir = "documents"
    files = glob.glob(f"{docs_dir}/*.txt") + glob.glob(f"{docs_dir}/*.md") + glob.glob(f"{docs_dir}/*.pdf")
    
    doc_list = []
    if files:
        print(f"--- Loading {len(files)} documents from '{docs_dir}' ---")
        for file_path in files:
            try:
                content = ""
                if file_path.endswith(".pdf"):
                    reader = PdfReader(file_path)
                    for page in reader.pages:
                        content += page.extract_text() + "\n"
                else:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                
                if content.strip():
                    doc_list.append({
                        "id": os.path.basename(file_path),
                        "content": content,
                        "metadata": {"source": file_path}
                    })
            except Exception as e:
                print(f"Failed to read {file_path}: {e}")
    else:
        print("--- No files found in 'documents/' directory. Using MOCK data. ---")
        # Sample Mock Documents
        doc_list = [
            {
                "id": "doc_001",
                "content": "CONTRACT AGREEMENT. Date: 2023-01-15. Parties: Alpha Corp (Buyer) and Beta Ltd (Seller). Beta Ltd agrees to supply 500 widgets by 2023-03-01. Payment of $50,000 due upon delivery. Late delivery penalty: 5% per week.",
                "metadata": {"source": "upload"}
            },
            {
                "id": "doc_002",
                "content": "EMAIL. From: Beta Ltd CEO. To: Alpha Corp. Date: 2023-02-28. Subject: Delay. We are facing supply chain issues. Widgets will be delivered on 2023-03-15. We hope this is acceptable.",
                "metadata": {"source": "upload"}
            },
            {
                "id": "doc_003",
                "content": "INVOICE #999. Date: 2023-03-15. Amount: $50,000. For 500 widgets. Due Date: Immediate.",
                "metadata": {"source": "upload"}
            },
            {
                "id": "doc_004",
                "content": "EMAIL. From: Alpha Corp Legal. To: Beta Ltd. Date: 2023-03-20. We are deducting the penalty for 2 weeks delay ($5000) from the payment. Transferring $45,000.",
                "metadata": {"source": "upload"}
            }
        ]
    
    print("--- STARTING INVESTIGATOR ENGINE ---")
    app = create_graph()
    
    initial_state = {
        "documents": doc_list,
        "entities": [],
        "facts": [],
        "timeline": [],
        "revision_count": 0,
        "errors": [],
        "focus_questions": [],
    }
    
    final_state = app.invoke(initial_state)
    
    print("\n\n=== FINAL REPORT ===\n")
    print(final_state.get("final_report", "No report generated."))
    
    # Optional: Save to file
    with open("final_report.md", "w", encoding="utf-8") as f:
        f.write(final_state.get("final_report", ""))
