import os
import uuid
import json as json_module
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict
from datetime import datetime

from dependencies import limiter, create_graph
from database import investigation_reports_collection, investigation_jobs_collection
from schemas.investigation import InvestigatorRequest, InvestigatorResponse
from services.investigation_service import (
    STEP_LABELS, STEP_ORDER,
    fetch_docs_for_case, build_structured_results,
    run_investigation_background,
)
from utils.auth import get_current_user, get_user_id
from utils.validation import validate_case_id
from utils.error_handler import logger

router = APIRouter()


@router.post("/investigation/run", response_model=InvestigatorResponse)
@limiter.limit("5/minute")
async def run_investigation(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    try:
        validate_case_id(body.caseId)
        doc_list = fetch_docs_for_case(body.caseId)

        if not doc_list:
            raise HTTPException(status_code=404, detail="No documents found for this case. Please upload and process documents before running investigation.")

        user_id = get_user_id(current_user)
        initial_state = {
            "documents": doc_list,
            "entities": [],
            "facts": [],
            "timeline": [],
            "revision_count": 0,
            "errors": [],
            "focus_questions": body.focusQuestions or [],
            "user_id": user_id,
        }

        workflow = create_graph()
        final_state = await asyncio.to_thread(workflow.invoke, initial_state)

        report = final_state.get("final_report", "Analysis completed but no report was generated.")

        report_doc = {
            "case_id": body.caseId,
            "user_id": current_user.get("user_id", "unknown"),
            "final_report": report,
            "focus_questions": body.focusQuestions or [],
            "metadata": {
                "fact_count": len(final_state.get("facts", [])),
                "revision_count": final_state.get("revision_count", 0),
                "conflict_count": len(final_state.get("conflicts", [])),
                "document_count": len(doc_list),
                "errors": final_state.get("errors", []),
            },
            "created_at": datetime.utcnow(),
        }
        insert_result = investigation_reports_collection.insert_one(report_doc)
        report_id = str(insert_result.inserted_id)

        return InvestigatorResponse(final_report=report, reportId=report_id)

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")


@router.post("/investigation/run-stream")
@limiter.limit("5/minute")
async def run_investigation_stream(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    """SSE endpoint for investigation with real-time progress updates."""
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    validate_case_id(body.caseId)
    doc_list = fetch_docs_for_case(body.caseId)

    if not doc_list:
        raise HTTPException(status_code=404, detail="No documents found for this case.")

    user_id = get_user_id(current_user)
    initial_state = {
        "documents": doc_list,
        "entities": [],
        "facts": [],
        "timeline": [],
        "revision_count": 0,
        "errors": [],
        "focus_questions": body.focusQuestions or [],
        "user_id": user_id,
    }

    async def event_generator():
        try:
            workflow = create_graph()
            total_steps = len(STEP_ORDER)

            def run_stream():
                return list(workflow.stream(initial_state))

            stream_results = await asyncio.to_thread(run_stream)

            completed_steps = 0
            final_state = initial_state.copy()

            for chunk in stream_results:
                for node_name, node_output in chunk.items():
                    if node_output and isinstance(node_output, dict):
                        final_state.update(node_output)
                    completed_steps += 1
                    step_index = STEP_ORDER.index(node_name) if node_name in STEP_ORDER else completed_steps
                    progress = min(int((step_index + 1) / total_steps * 100), 99)
                    label = STEP_LABELS.get(node_name, f"Processing {node_name}...")

                    yield f"data: {json_module.dumps({'type': 'progress', 'step': node_name, 'label': label, 'progress': progress})}\n\n"

            report, structured_data, metadata = build_structured_results(final_state, doc_list)

            report_doc = {
                "case_id": body.caseId,
                "user_id": current_user.get("user_id", "unknown"),
                "final_report": report,
                "focus_questions": body.focusQuestions or [],
                "structured_data": structured_data,
                "metadata": metadata,
                "created_at": datetime.utcnow(),
            }
            insert_result = investigation_reports_collection.insert_one(report_doc)
            report_id = str(insert_result.inserted_id)

            yield f"data: {json_module.dumps({'type': 'complete', 'progress': 100, 'final_report': report, 'reportId': report_id, 'structured_data': structured_data, 'stats': metadata})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json_module.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/investigation/reports/{caseId}")
@limiter.limit("30/minute")
async def get_investigation_reports(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Fetch past investigation reports for a case."""
    validate_case_id(caseId)
    reports = list(
        investigation_reports_collection.find(
            {"case_id": caseId},
            {"final_report": 1, "metadata": 1, "created_at": 1, "focus_questions": 1, "structured_data": 1}
        ).sort("created_at", -1).limit(20)
    )
    for r in reports:
        r["_id"] = str(r["_id"])
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
    return reports


@router.post("/investigation/run-background")
@limiter.limit("5/minute")
async def run_investigation_background_endpoint(
    request: Request,
    body: InvestigatorRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Start investigation as a background task. Returns a jobId immediately."""
    if not create_graph:
        raise HTTPException(status_code=500, detail="Investigator Engine not loaded properly.")

    validate_case_id(body.caseId)
    doc_list = fetch_docs_for_case(body.caseId)

    if not doc_list:
        raise HTTPException(status_code=404, detail="No documents found for this case.")

    user_id = get_user_id(current_user)

    job_id = str(uuid.uuid4())
    investigation_jobs_collection.insert_one({
        "_id": job_id,
        "case_id": body.caseId,
        "user_id": user_id,
        "status": "running",
        "progress": 0,
        "progress_label": "Starting investigation...",
        "current_step": "",
        "focus_questions": body.focusQuestions or [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    asyncio.create_task(
        run_investigation_background(
            job_id, body.caseId, body.focusQuestions or [], user_id, doc_list
        )
    )

    return {"jobId": job_id}


@router.get("/investigation/status/{jobId}")
@limiter.limit("60/minute")
async def get_investigation_status(
    request: Request,
    jobId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Poll the status of a background investigation job."""
    job = investigation_jobs_collection.find_one({"_id": jobId})
    if not job:
        raise HTTPException(status_code=404, detail="Investigation job not found.")

    result = {
        "jobId": job["_id"],
        "status": job["status"],
        "progress": job.get("progress", 0),
        "progressLabel": job.get("progress_label", ""),
        "currentStep": job.get("current_step", ""),
    }

    if job["status"] == "completed":
        result["reportId"] = job.get("report_id")
        result["finalReport"] = job.get("final_report")
        result["structuredData"] = job.get("structured_data")
        result["stats"] = job.get("stats")

    if job["status"] == "error":
        result["error"] = job.get("error", "Unknown error")

    return result


@router.get("/investigation/active-job/{caseId}")
@limiter.limit("30/minute")
async def get_active_investigation_job(
    request: Request,
    caseId: str,
    current_user: Dict = Depends(get_current_user)
):
    """Check if there's a running investigation job for this case."""
    validate_case_id(caseId)
    job = investigation_jobs_collection.find_one(
        {"case_id": caseId, "status": "running"},
        sort=[("created_at", -1)]
    )
    if not job:
        return {"hasActiveJob": False}

    return {
        "hasActiveJob": True,
        "jobId": job["_id"],
        "progress": job.get("progress", 0),
        "progressLabel": job.get("progress_label", ""),
        "currentStep": job.get("current_step", ""),
    }
