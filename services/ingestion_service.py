import os
import shutil
import asyncio
import zipfile
import tempfile
from datetime import datetime

from ingestion.injector import ingest_document
from ingestion.loader import parse_file_with_pages
from database import document_status_collection, precedent_cache_collection
from utils.error_handler import logger
from utils.validation import sanitize_filename


async def run_ingestion_background(
    ingest_fn, db_case_id, db_filename, **kwargs
):
    """Run ingestion in the background and update document status on completion/failure."""
    try:
        await asyncio.to_thread(ingest_fn, **kwargs)
        document_status_collection.update_one(
            {"case_id": db_case_id, "filename": db_filename},
            {"$set": {"status": "Ready", "last_updated": datetime.utcnow()}}
        )
        logger.info(f"Background ingestion complete: {db_filename} for case {db_case_id}")
        precedent_cache_collection.delete_one({"case_id": db_case_id})
    except Exception as e:
        logger.error(f"Background ingestion failed for {db_filename}: {e}", exc_info=True)
        document_status_collection.update_one(
            {"case_id": db_case_id, "filename": db_filename},
            {"$set": {"status": "Failed", "error": str(e)[:200], "last_updated": datetime.utcnow()}}
        )


def process_zip_file(file_content, safe_filename, caseId, user_id):
    """Process a zip file: extract and start background ingestion for each entry.
    Returns (ingested_files, failed_files).
    """
    ingested_files = []
    failed_files = []

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_path = os.path.join(temp_dir, safe_filename)
        with open(zip_path, 'wb') as f:
            f.write(file_content)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        for root, dirs, files in os.walk(temp_dir):
            for extracted_file in files:
                if extracted_file == safe_filename:
                    continue
                if extracted_file.startswith('.') or extracted_file.startswith('__'):
                    continue

                extracted_path = os.path.join(root, extracted_file)
                extracted_safe_name = sanitize_filename(extracted_file)

                try:
                    document_status_collection.update_one(
                        {"case_id": caseId, "filename": extracted_safe_name},
                        {
                            "$set": {
                                "status": "Processing",
                                "filename": extracted_safe_name,
                                "case_id": caseId,
                                "user_id": user_id,
                                "last_updated": datetime.utcnow()
                            }
                        },
                        upsert=True
                    )

                    dest_path = f"documents/{extracted_safe_name}"
                    shutil.copy2(extracted_path, dest_path)

                    page_data = parse_file_with_pages(dest_path)
                    text = "\n".join(p.get("text", "") for p in page_data)

                    if text.strip():
                        document_status_collection.update_one(
                            {"case_id": caseId, "filename": extracted_safe_name},
                            {"$set": {"extracted_pages": page_data}}
                        )
                        asyncio.create_task(run_ingestion_background(
                            ingest_document,
                            caseId,
                            extracted_safe_name,
                            text=text,
                            source_name=extracted_safe_name,
                            case_id=caseId,
                            page_metadata=page_data
                        ))
                        ingested_files.append(extracted_safe_name)
                        logger.info(f"Started background ingestion for zip entry: {extracted_safe_name}")
                    else:
                        document_status_collection.update_one(
                            {"case_id": caseId, "filename": extracted_safe_name},
                            {"$set": {"status": "Failed", "error": "Empty file", "last_updated": datetime.utcnow()}}
                        )
                        failed_files.append(extracted_safe_name)

                except Exception as e:
                    logger.error(f"Failed to ingest {extracted_file}: {e}")
                    document_status_collection.update_one(
                        {"case_id": caseId, "filename": extracted_safe_name},
                        {"$set": {"status": "Failed", "error": str(e)[:100], "last_updated": datetime.utcnow()}}
                    )
                    failed_files.append(extracted_safe_name)

    return ingested_files, failed_files


async def process_single_file(file_content, safe_filename, caseId, user_id):
    """Process a single uploaded file: save, parse, and start background ingestion."""
    document_status_collection.update_one(
        {"case_id": caseId, "filename": safe_filename},
        {
            "$set": {
                "status": "Processing",
                "filename": safe_filename,
                "case_id": caseId,
                "user_id": user_id,
                "last_updated": datetime.utcnow()
            }
        },
        upsert=True
    )

    file_location = f"documents/{safe_filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file_content)

    page_data = parse_file_with_pages(file_location)
    text = "\n".join(p.get("text", "") for p in page_data)

    if not text.strip():
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from file or file is empty."
        )

    document_status_collection.update_one(
        {"case_id": caseId, "filename": safe_filename},
        {"$set": {"extracted_pages": page_data}}
    )

    asyncio.create_task(run_ingestion_background(
        ingest_document,
        caseId,
        safe_filename,
        text=text,
        source_name=safe_filename,
        case_id=caseId,
        page_metadata=page_data
    ))

    logger.info(f"Started background ingestion: {safe_filename} for case {caseId}")
