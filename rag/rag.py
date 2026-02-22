import os
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models

from neo4j_graphrag.generation import GraphRAG
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.retrievers.external.qdrant.qdrant import QdrantNeo4jRetriever
from neo4j_graphrag.types import LLMMessage, RetrieverResultItem

from utils.embeddings import embedder, embed_text
from utils.llm import get_llm_client, get_model_name
from rag.planner import plan_retrieval


load_dotenv()


# ----- CONFIG -----
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = "chunks"

# Whether to use the LLM planner before retrieval
ENABLE_PLANNER = os.getenv("ENABLE_PLANNER", "true").lower().strip() == "true"

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)

# Build OpenAILLM using the shared toggle
_use_openai = os.getenv("USE_OPENAI", "false").lower().strip() == "true"
_llm_kwargs = {
    "model_name": get_model_name(),
    "model_params": {"temperature": 0.1},
    "api_key": os.getenv("OPENAI_API_KEY") if _use_openai else os.getenv("DEEPSEEK_API_KEY"),
}
if not _use_openai:
    _llm_kwargs["base_url"] = "https://api.deepseek.com"
llm = OpenAILLM(**_llm_kwargs)


from neo4j_graphrag.generation.prompts import RagTemplate
custom_prompt = RagTemplate(
    system_instructions=(
        """
        You are a legal assistant and law firm operations expert. Answer ALL questions using ONLY the provided CONTEXT chunks.

        RULES:
        1. If context describes "Law Firm Connect" or specific cases, use that data.
        2. NEVER say "I don't know" or "no information" if context has relevant data.
        3. For workflows: use case-specific details and legal procedures.
        4. For data fields/tables: extract exact field names from context tables.
        5. List ALL items mentioned (judges, lawyers, documents, etc.) - don't summarize.
        6. Structure answers clearly with bullet points/tables when listing.
        7. CITE your sources using [N] markers that correspond to the numbered context chunks. Place citations inline at the end of the relevant sentence or claim. Example: "The court ruled in favor of the plaintiff [1]."

        CONTEXT FORMAT: Each chunk is numbered [N] with its source filename. Use highest scoring chunks first.

        Answer format: Direct, factual, structured with inline [N] citations. No disclaimers.
        """
    ),
    template="""Context:
{context}

Examples:
{examples}

Question:
{query_text}

Answer (include [N] citations):
""",
)


# ============================================================
# Reciprocal Rank Fusion
# ============================================================
def _rrf_fuse(ranked_lists: list[list], k: int = 60) -> list:
    """
    Fuse multiple ranked lists using Reciprocal Rank Fusion.
    Each list is a list of (point, original_score) tuples.
    Returns a deduplicated list of points sorted by RRF score descending.
    """
    scores: dict[str, float] = {}
    point_map: dict[str, object] = {}

    for ranked in ranked_lists:
        for rank, (point, _score) in enumerate(ranked):
            pid = point.id
            scores[pid] = scores.get(pid, 0.0) + 1.0 / (k + rank + 1)
            point_map[pid] = point

    sorted_ids = sorted(scores.keys(), key=lambda pid: scores[pid], reverse=True)
    return [(point_map[pid], scores[pid]) for pid in sorted_ids]


# ============================================================
# Hybrid Search
# ============================================================
def _build_qdrant_filter(case_id: str, plan=None) -> models.Filter:
    """Build a Qdrant filter from case_id and optional planner output."""
    must = [
        models.FieldCondition(
            key="case_id",
            match=models.MatchValue(value=case_id),
        )
    ]

    if plan:
        # Document type filter
        if plan.document_types:
            must.append(
                models.FieldCondition(
                    key="document_type",
                    match=models.MatchAny(any=plan.document_types),
                )
            )
        # Source file filter
        if plan.source_files:
            must.append(
                models.FieldCondition(
                    key="source",
                    match=models.MatchAny(any=plan.source_files),
                )
            )

    return models.Filter(must=must)


def hybrid_search(
    query_text: str,
    case_id: str,
    top_k: int = 15,
    plan=None,
) -> list[tuple]:
    """
    Perform hybrid search: vector + keyword, fuse with RRF, return top_k (point, score) tuples.
    """
    from rag.reranker import rerank

    qdrant_filter = _build_qdrant_filter(case_id, plan)

    # Determine all search queries (from planner or just the original)
    search_queries = [query_text]
    if plan and plan.search_queries:
        search_queries = plan.search_queries

    fetch_k = top_k * 3  # headroom for reranking
    all_ranked_lists: list[list] = []

    for sq in search_queries:
        # --- Vector search ---
        query_vector = embedder.embed_query(sq)
        try:
            vec_result = qdrant.query_points(
                collection_name=COLLECTION,
                query=query_vector,
                query_filter=qdrant_filter,
                limit=fetch_k,
                with_payload=True,
            )
            vec_ranked = [(p, p.score) for p in vec_result.points]
        except Exception:
            vec_ranked = []

        if vec_ranked:
            all_ranked_lists.append(vec_ranked)

        # --- Keyword search via full-text match on 'text' field ---
        base_must = list(qdrant_filter.must) if qdrant_filter.must else []
        try:
            kw_filter = models.Filter(
                must=base_must + [
                    models.FieldCondition(
                        key="text",
                        match=models.MatchText(text=sq),
                    )
                ]
            )
            kw_results, _next = qdrant.scroll(
                collection_name=COLLECTION,
                scroll_filter=kw_filter,
                limit=fetch_k,
                with_payload=True,
                with_vectors=False,
            )
            # Assign descending scores by position (first match = highest)
            kw_ranked = [(p, 1.0 / (i + 1)) for i, p in enumerate(kw_results)]
        except Exception:
            kw_ranked = []

        if kw_ranked:
            all_ranked_lists.append(kw_ranked)

        # --- Keyword search on hypothetical_questions field ---
        try:
            hq_filter = models.Filter(
                must=base_must + [
                    models.FieldCondition(
                        key="hypothetical_questions",
                        match=models.MatchText(text=sq),
                    )
                ]
            )
            hq_results, _ = qdrant.scroll(
                collection_name=COLLECTION,
                scroll_filter=hq_filter,
                limit=fetch_k // 2,
                with_payload=True,
                with_vectors=False,
            )
            hq_ranked = [(p, 1.0 / (i + 1)) for i, p in enumerate(hq_results)]
        except Exception:
            hq_ranked = []

        if hq_ranked:
            all_ranked_lists.append(hq_ranked)

    # If no results from any search, return empty
    if not all_ranked_lists:
        return []

    # Fuse all lists with RRF
    fused = _rrf_fuse(all_ranked_lists)

    # Take more than top_k for reranking
    candidates = fused[:fetch_k]

    # Cross-encoder reranking on the fused set
    doc_texts = [p.payload.get("text", "") for p, _ in candidates]
    reranked = rerank(query_text, doc_texts, top_k=top_k)

    result = []
    for orig_idx, rerank_score in reranked:
        point, _rrf_score = candidates[orig_idx]
        result.append((point, rerank_score))

    return result


# ============================================================
# ASK (non-streaming, backwards-compatible)
# ============================================================
def ask(query: str, case_id: str, history: list = [], top_k=5):
    print(f"Generating answer for Case: {case_id}...\n")

    # --- Planner ---
    plan = None
    if ENABLE_PLANNER:
        try:
            plan = plan_retrieval(query, history)
            top_k = plan.top_k
            print(f"[PLAN] strategy={plan.search_strategy}, top_k={top_k}, queries={len(plan.search_queries)}, doc_types={plan.document_types}")
        except Exception as e:
            print(f"[WARN] Planner failed: {e}")

    # Fallback dynamic top_k (if planner not used)
    if plan is None:
        lower_query = query.lower()
        if any(kw in lower_query for kw in ["report", "summary", "detailed", "everything", "full"]):
            top_k = max(top_k, 50)
        else:
            top_k = max(top_k, 15)

    qdrant_filter = _build_qdrant_filter(case_id, plan)

    # Custom Retriever with Hybrid Search
    class CustomRetriever(QdrantNeo4jRetriever):
        def __init__(self, client, collection, embedder_inst, q_filter, retrieval_plan):
            super().__init__(
                driver=driver,
                client=client,
                collection_name=collection,
                embedder=embedder_inst,
                id_property_external="chunk_id",
                id_property_neo4j="id"
            )
            self.q_filter = q_filter
            self.collection = collection
            self.client = client
            self.embedder = embedder_inst
            self._plan = retrieval_plan

        def search(self, query_text: str, top_k: int = 5, **kwargs):
            from neo4j_graphrag.types import RetrieverResult

            # Use hybrid search
            results = hybrid_search(
                query_text=query_text,
                case_id=case_id,
                top_k=top_k,
                plan=self._plan,
            )

            # Format results with numbered citations
            items = []
            for citation_idx, (point, score) in enumerate(results, 1):
                content = point.payload.get("text", "")
                src = point.payload.get("source", "")
                page_num = point.payload.get("page_number")
                file_type = point.payload.get("file_type")
                final_score = score if score > 0 else (point.score or 0)
                numbered_content = f"[{citation_idx}] (Source: {src}) {content}"
                metadata = {"score": final_score, "source": src, "citation_index": citation_idx}
                if page_num is not None:
                    metadata["page_number"] = page_num
                if file_type is not None:
                    metadata["file_type"] = file_type
                items.append(RetrieverResultItem(content=numbered_content, metadata=metadata))

            return RetrieverResult(items=items)

    retriever = CustomRetriever(
        client=qdrant,
        collection=COLLECTION,
        embedder_inst=embedder,
        q_filter=qdrant_filter,
        retrieval_plan=plan,
    )

    rag = GraphRAG(
        retriever=retriever,
        llm=llm,
        prompt_template=custom_prompt
    )

    formatted_history = []
    if history:
        for msg in history:
            formatted_history.append(LLMMessage(role=msg["role"], content=msg["content"]))

    try:
        result = rag.search(
            query_text=query,
            message_history=formatted_history,
            retriever_config={
                "top_k": top_k,
                "query_filter": qdrant_filter
            },
            return_context=True
        )
    except Exception as e:
        error_msg = str(e)
        if "doesn't exist" in error_msg or "Not found: Collection" in error_msg or "404" in error_msg:
            print(f"WARN: Collection '{COLLECTION}' not found. Returning friendly message.")
            class MockResult:
                def __init__(self):
                    self.answer = "I cannot answer yet because no documents have been uploaded for this case. Please upload a document to the 'Documents' tab to start chatting."
                    self.retriever_result = None
            return MockResult()
        else:
            raise e

    print("\n========== ANSWER ==========")
    print(result.answer)

    return result


# ============================================================
# ASK STREAM (SSE streaming generator)
# ============================================================
SYSTEM_PROMPT = """You are a legal assistant and law firm operations expert. Answer ALL questions using ONLY the provided CONTEXT chunks.

RULES:
1. If context describes "Law Firm Connect" or specific cases, use that data.
2. NEVER say "I don't know" or "no information" if context has relevant data.
3. For workflows: use case-specific details and legal procedures.
4. For data fields/tables: extract exact field names from context tables.
5. List ALL items mentioned (judges, lawyers, documents, etc.) - don't summarize.
6. Structure answers clearly with bullet points/tables when listing.
7. CITE your sources using [N] markers that correspond to the numbered context chunks. Place citations inline at the end of the relevant sentence or claim. Example: "The court ruled in favor of the plaintiff [1]."

CONTEXT FORMAT: Each chunk is numbered [N] with its source filename. Use highest scoring chunks first.

Answer format: Direct, factual, structured with inline [N] citations. No disclaimers."""


def ask_stream(query: str, case_id: str, history: list = [], top_k=5):
    """
    Generator that yields SSE events:
      {"type": "contexts", "contexts": [...]}
      {"type": "token", "content": "..."}
      {"type": "done", "full_response": "..."}
    """
    import json

    # --- Planner ---
    plan = None
    if ENABLE_PLANNER:
        try:
            plan = plan_retrieval(query, history)
            top_k = plan.top_k
        except Exception:
            pass

    if plan is None:
        lower_query = query.lower()
        if any(kw in lower_query for kw in ["report", "summary", "detailed", "everything", "full"]):
            top_k = max(top_k, 50)
        else:
            top_k = max(top_k, 15)

    # --- Retrieval (non-streaming, fast) ---
    try:
        results = hybrid_search(
            query_text=query,
            case_id=case_id,
            top_k=top_k,
            plan=plan,
        )
    except Exception as e:
        error_msg = str(e)
        if "doesn't exist" in error_msg or "Not found: Collection" in error_msg or "404" in error_msg:
            yield json.dumps({"type": "contexts", "contexts": []})
            no_docs_msg = "I cannot answer yet because no documents have been uploaded for this case. Please upload a document to the 'Documents' tab to start chatting."
            yield json.dumps({"type": "done", "full_response": no_docs_msg})
            return
        raise

    # Build context items for the frontend
    contexts = []
    context_text_parts = []
    score_threshold = float(os.getenv("SOURCE_SCORE_THRESHOLD", "0.3"))

    for citation_idx, (point, score) in enumerate(results, 1):
        content = point.payload.get("text", "")
        src = point.payload.get("source", "")
        page_num = point.payload.get("page_number")
        file_type = point.payload.get("file_type")
        final_score = score if score > 0 else (point.score or 0)

        context_text_parts.append(f"[{citation_idx}] (Source: {src}) {content}")

        if final_score >= score_threshold:
            ctx = {
                "content": content,
                "source": src,
                "metadata": {"score": final_score, "source": src, "citation_index": citation_idx},
                "score": final_score,
            }
            if page_num is not None:
                ctx["metadata"]["page_number"] = page_num
            if file_type is not None:
                ctx["metadata"]["file_type"] = file_type
            contexts.append(ctx)

    contexts.sort(key=lambda c: c.get("score", 0), reverse=True)

    # Yield contexts as the first event
    yield json.dumps({"type": "contexts", "contexts": contexts})

    # --- Build messages for LLM ---
    context_block = "\n\n".join(context_text_parts) if context_text_parts else "(No relevant documents found)"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        for msg in history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({
        "role": "user",
        "content": f"Context:\n{context_block}\n\nQuestion:\n{query}\n\nAnswer (include [N] citations):",
    })

    # --- Stream LLM response ---
    client = get_llm_client()
    model = get_model_name()

    full_response = ""
    try:
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.1,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                token = delta.content
                full_response += token
                yield json.dumps({"type": "token", "content": token})
    except Exception as e:
        full_response = f"Error generating response: {e}"
        yield json.dumps({"type": "token", "content": full_response})

    # Final event with complete response
    yield json.dumps({"type": "done", "full_response": full_response})


if __name__ == "__main__":
    print(qdrant.count("chunks"))
