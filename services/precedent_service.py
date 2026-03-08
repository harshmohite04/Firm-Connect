import os
import json
import asyncio
from datetime import datetime

import httpx

from database import document_status_collection, precedent_cache_collection
from dependencies import INDIAN_KANOON_API_TOKEN, INDIAN_KANOON_BASE_URL
from utils.error_handler import logger


async def find_precedents(caseId: str, force: bool = False):
    """
    Use case document embeddings to find relevant Indian Kanoon precedents.
    1. Fetch top chunks from Qdrant for this case
    2. Use LLM to extract targeted legal search queries
    3. Search Indian Kanoon with those queries
    4. Return deduplicated results
    """
    # --- Cache check ---
    ready_count = document_status_collection.count_documents({"case_id": caseId, "status": "Ready"})
    if not force:
        cached = precedent_cache_collection.find_one({"case_id": caseId})
        if cached and cached.get("doc_fingerprint") == ready_count:
            logger.info(f"Returning cached precedents for case {caseId}")
            return {
                "queries": cached["queries"],
                "docs": cached["docs"],
                "total": cached["total"],
            }

    from qdrant_client import QdrantClient, models as qmodels
    from groq import Groq

    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_key = os.getenv("QDRANT_API_KEY")
    qdrant_client = QdrantClient(url=qdrant_url, api_key=qdrant_key)
    COLLECTION = "chunks"

    # 1. Scroll Qdrant for this case's chunks
    from fastapi import HTTPException
    try:
        scroll_result = qdrant_client.scroll(
            collection_name=COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="case_id",
                        match=qmodels.MatchValue(value=caseId),
                    )
                ]
            ),
            limit=20,
            with_payload=True,
            with_vectors=False,
        )
        points = scroll_result[0]
    except Exception as e:
        logger.warning(f"Qdrant scroll failed for case {caseId}: {e}")
        raise HTTPException(
            status_code=503,
            detail="Vector database (Qdrant) is unavailable. Please ensure Qdrant is running."
        )

    if not points:
        raise HTTPException(
            status_code=404,
            detail="No document embeddings found for this case. Please upload documents first."
        )

    # 2. Combine chunk texts for LLM analysis
    chunk_texts = [p.payload.get("text", "") for p in points if p.payload.get("text")]
    combined_text = "\n---\n".join(chunk_texts)
    if len(combined_text) > 12000:
        combined_text = combined_text[:12000]

    # 3. Use Groq LLM to extract legal search queries
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    llm_response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an Indian legal research assistant. Given excerpts from case documents, "
                    "extract 3 to 5 specific search queries for finding relevant precedents on Indian Kanoon. "
                    "Each query should target a distinct legal issue, section, act, or principle mentioned in the documents. "
                    "Return ONLY a JSON array of strings, nothing else. Example: "
                    '[\"Section 498A IPC dowry harassment\", \"Supreme Court maintenance under Section 125 CrPC\"]'
                )
            },
            {
                "role": "user",
                "content": f"Extract legal search queries from these case documents:\n\n{combined_text}"
            }
        ],
        temperature=0.2,
        max_tokens=500,
    )

    raw_queries = llm_response.choices[0].message.content.strip()
    try:
        if raw_queries.startswith("```"):
            raw_queries = raw_queries.split("```")[1]
            if raw_queries.startswith("json"):
                raw_queries = raw_queries[4:]
        search_queries = json.loads(raw_queries)
        if not isinstance(search_queries, list):
            search_queries = [raw_queries]
    except json.JSONDecodeError:
        search_queries = [q.strip().strip('"').strip("'") for q in raw_queries.split("\n") if q.strip()]

    search_queries = search_queries[:5]

    logger.info(f"Generated {len(search_queries)} search queries for case {caseId}: {search_queries}")

    # 4. Search Indian Kanoon with each query and deduplicate
    seen_doc_ids = set()
    all_results = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in search_queries:
            if not query.strip():
                continue
            try:
                resp = await client.post(
                    f"{INDIAN_KANOON_BASE_URL}/search/",
                    data={"formInput": query, "pagenum": 0},
                    headers={"Authorization": f"Token {INDIAN_KANOON_API_TOKEN}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for doc in data.get("docs", []):
                        tid = doc.get("tid")
                        if tid and tid not in seen_doc_ids:
                            seen_doc_ids.add(tid)
                            doc["_matched_query"] = query
                            all_results.append(doc)
            except Exception as e:
                logger.warning(f"IK search failed for query '{query}': {e}")
                continue

    result_payload = {
        "queries": search_queries,
        "docs": all_results[:30],
        "total": len(all_results),
    }

    # --- Cache the result ---
    precedent_cache_collection.update_one(
        {"case_id": caseId},
        {"$set": {
            "case_id": caseId,
            "queries": result_payload["queries"],
            "docs": result_payload["docs"],
            "total": result_payload["total"],
            "doc_fingerprint": ready_count,
            "cached_at": datetime.utcnow(),
        }},
        upsert=True,
    )

    return result_payload
