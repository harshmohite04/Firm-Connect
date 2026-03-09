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

# --- MongoDB Indexes (idempotent — safe to call on every startup) ---
chat_collection.create_index("session_id")
chat_collection.create_index([("case_id", 1), ("user_id", 1)])
document_status_collection.create_index([("case_id", 1), ("filename", 1)], unique=True)
investigation_jobs_collection.create_index([("case_id", 1), ("status", 1)])
investigation_reports_collection.create_index([("case_id", 1), ("created_at", -1)])
draft_sessions_collection.create_index([("case_id", 1), ("user_id", 1)])
draft_versions_collection.create_index([("session_id", 1), ("version_number", -1)])
precedent_cache_collection.create_index("case_id", unique=True)
case_law_bookmarks_collection.create_index([("user_id", 1), ("doc_id", 1)], unique=True)
logger.info("MongoDB indexes ensured.")
