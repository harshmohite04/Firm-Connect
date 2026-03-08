import os
import asyncio
from datetime import datetime

from database import (
    document_status_collection,
    investigation_reports_collection,
    investigation_jobs_collection,
)
from dependencies import create_graph
from utils.error_handler import logger


# Node name to user-friendly step labels
STEP_LABELS = {
    "document_analyst": "Analyzing documents...",
    "entity_extractor": "Extracting facts & entities...",
    "auditor": "Auditing timeline...",
    "primary_investigator": "Building case narrative...",
    "cross_examiner": "Cross-examining narrative...",
    "conflict_resolver": "Resolving conflicts...",
    "evidence_validator": "Validating evidence...",
    "gap_detector": "Detecting evidence gaps...",
    "legal_researcher": "Researching legal issues...",
    "debate_hub": "Synchronizing analysis...",
    "risk_assessor": "Assessing risks...",
    "final_judge": "Generating final report...",
}

STEP_ORDER = list(STEP_LABELS.keys())


def fetch_docs_for_case(case_id: str) -> list:
    """Helper to fetch documents for a case (shared by all investigation endpoints)."""
    from ingestion.loader import parse_file
    docs_status = list(document_status_collection.find({"case_id": case_id, "status": "Ready"}))
    doc_list = []
    for doc in docs_status:
        filename = doc["filename"]
        file_path = f"documents/{filename}"
        if os.path.exists(file_path):
            try:
                content = parse_file(file_path)
                if content.strip():
                    doc_list.append({
                        "id": filename,
                        "content": content,
                        "metadata": {"source": filename}
                    })
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    return doc_list


def build_structured_results(final_state, doc_list):
    """Extract structured data and metadata from final investigation state.
    Returns (report, structured_data, metadata).
    """
    report = final_state.get("final_report", "Analysis completed but no report was generated.")
    facts = final_state.get("facts", [])
    entities = list(set(final_state.get("entities", [])))
    timeline = final_state.get("timeline", [])
    conflicts = final_state.get("conflicts", [])
    risks = final_state.get("risks", [])
    evidence_gaps = final_state.get("evidence_gaps", [])
    hypotheses = final_state.get("hypotheses", [])
    legal_issues = final_state.get("legal_issues", [])
    avg_confidence = round(sum(f.get("confidence", 0) for f in facts) / len(facts), 2) if facts else 0.0
    risk_level = "CRITICAL" if len(risks) >= 5 else "HIGH" if len(risks) >= 3 else "MEDIUM" if len(risks) >= 1 else "LOW"

    structured_data = {
        "entities": entities,
        "facts": facts,
        "timeline": timeline,
        "conflicts": conflicts,
        "risks": risks,
        "evidence_gaps": evidence_gaps,
        "hypotheses": hypotheses,
        "legal_issues": legal_issues,
    }
    metadata = {
        "fact_count": len(facts),
        "entity_count": len(entities),
        "conflict_count": len(conflicts),
        "risk_count": len(risks),
        "timeline_count": len(timeline),
        "evidence_gap_count": len(evidence_gaps),
        "document_count": len(doc_list),
        "revision_count": final_state.get("revision_count", 0),
        "avg_confidence": avg_confidence,
        "overall_risk_level": risk_level,
        "errors": final_state.get("errors", []),
    }
    return report, structured_data, metadata


async def run_investigation_background(job_id: str, case_id: str, focus_questions: list, user_id: str, doc_list: list):
    """Runs the full investigation pipeline as a background task, updating progress in MongoDB."""
    try:
        workflow = create_graph()
        initial_state = {
            "documents": doc_list,
            "entities": [],
            "facts": [],
            "timeline": [],
            "revision_count": 0,
            "errors": [],
            "focus_questions": focus_questions,
            "user_id": user_id,
        }

        total_steps = len(STEP_ORDER)

        def run_stream():
            return list(workflow.stream(initial_state))

        stream_results = await asyncio.to_thread(run_stream)

        final_state = initial_state.copy()
        completed_steps = 0

        for chunk in stream_results:
            for node_name, node_output in chunk.items():
                if node_output and isinstance(node_output, dict):
                    final_state.update(node_output)
                completed_steps += 1
                step_index = STEP_ORDER.index(node_name) if node_name in STEP_ORDER else completed_steps
                progress = min(int((step_index + 1) / total_steps * 100), 99)
                label = STEP_LABELS.get(node_name, f"Processing {node_name}...")

                investigation_jobs_collection.update_one(
                    {"_id": job_id},
                    {"$set": {
                        "status": "running",
                        "current_step": node_name,
                        "progress": progress,
                        "progress_label": label,
                        "updated_at": datetime.utcnow(),
                    }}
                )

        report, structured_data, metadata = build_structured_results(final_state, doc_list)

        report_doc = {
            "case_id": case_id,
            "user_id": user_id,
            "final_report": report,
            "focus_questions": focus_questions,
            "structured_data": structured_data,
            "metadata": metadata,
            "created_at": datetime.utcnow(),
        }
        insert_result = investigation_reports_collection.insert_one(report_doc)
        report_id = str(insert_result.inserted_id)

        investigation_jobs_collection.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "progress_label": "Investigation complete",
                "report_id": report_id,
                "final_report": report,
                "structured_data": structured_data,
                "stats": metadata,
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }}
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        investigation_jobs_collection.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "error",
                "error": str(e),
                "updated_at": datetime.utcnow(),
            }}
        )
