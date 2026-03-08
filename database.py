import os
from pymongo import MongoClient
from utils.error_handler import logger

MONGO_URI = os.getenv("MONGO_URI")
mongo_client = MongoClient(MONGO_URI)
try:
    db = mongo_client.get_database()
except Exception:
    db = mongo_client["lawfirmDB"]
logger.info(f"MongoDB database: {db.name}")

chat_collection = db["chat_history"]
document_status_collection = db["document_status"]
draft_sessions_collection = db["draft_sessions"]
draft_versions_collection = db["draft_versions"]
investigation_reports_collection = db["investigation_reports"]
investigation_jobs_collection = db["investigation_jobs"]
case_law_bookmarks_collection = db["case_law_bookmarks"]
precedent_cache_collection = db["precedent_cache"]
