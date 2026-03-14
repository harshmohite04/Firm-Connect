import os
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models
from groq import Groq
from openai import OpenAI

from neo4j_graphrag.generation import GraphRAG
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.retrievers.external.qdrant.qdrant import QdrantNeo4jRetriever
from neo4j_graphrag.types import LLMMessage, RetrieverResultItem

from utils.embeddings import embedder, embed_text
from utils.system_settings import load_provider_preset, get_effective_preset


load_dotenv()




# ----- CONFIG -----
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = "chunks"
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Static config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
RAG_MODEL = os.getenv("RAG_MODEL", "gpt-4o-mini")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)

def _get_llm_provider(user_id=None):
    """Get LLM provider based on current preset (dynamic), with optional per-user override"""
    provider = get_effective_preset(user_id)

    if provider == "openai" and OPENAI_API_KEY:
        return OpenAILLM(
            model_name="gpt-4o",
            model_params={"temperature": 0.1},
            api_key=OPENAI_API_KEY,
        )
    else:
        return OpenAILLM(
            model_name=DEEPSEEK_MODEL,
            model_params={"temperature": 0.1},
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )

def _get_stream_client(user_id=None, model_override=None):
    """Get streaming client based on current preset (dynamic), with optional per-user or model override"""
    if model_override:
        # Model override: determine client from model name
        if model_override.startswith("gpt-") or model_override.startswith("o1") or model_override.startswith("o3"):
            return OpenAI(api_key=OPENAI_API_KEY), model_override
        elif "deepseek" in model_override.lower():
            return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com"), model_override
        # Fallback to default provider with overridden model
        provider = get_effective_preset(user_id)
        if provider == "openai" and OPENAI_API_KEY:
            return OpenAI(api_key=OPENAI_API_KEY), model_override
        else:
            return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com"), model_override

    provider = get_effective_preset(user_id)

    if provider == "openai" and OPENAI_API_KEY:
        return OpenAI(api_key=OPENAI_API_KEY), "gpt-4o"
    else:
        return OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com"), DEEPSEEK_MODEL

def _classify_intent(query: str, history: list, client, model: str) -> str:
    """Classify whether the query needs RAG retrieval or is conversational."""
    classify_messages = [
        {
            "role": "system",
            "content": (
                "Classify this message. Reply ONLY with RETRIEVE if user asks about "
                "case/legal/document content, or CONVERSATIONAL if it's a greeting, "
                "acknowledgment, follow-up opinion, or casual reply."
            ),
        }
    ]
    # Add last 2 history messages for context
    for msg in history[-2:]:
        classify_messages.append({"role": msg["role"], "content": msg["content"]})
    classify_messages.append({"role": "user", "content": query})

    try:
        resp = client.chat.completions.create(
            model=model,
            messages=classify_messages,
            max_tokens=5,
            temperature=0,
        )
        label = (resp.choices[0].message.content or "").strip().upper()
        return "conversational" if "CONVERSATIONAL" in label else "retrieve"
    except Exception:
        return "retrieve"  # Default to RAG on failure


CONVERSATIONAL_SYSTEM_PROMPT = (
    "You are a helpful legal assistant. Respond naturally and conversationally "
    "based on the conversation history. Be concise and friendly. If the user "
    "references something from earlier, use the conversation history to respond."
)

# Available models for the model picker
AVAILABLE_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "deepseek-chat", "name": "DeepSeek Chat", "provider": "deepseek"},
]

# Initialize defaults (will be overridden at request time)
llm = _get_llm_provider()
stream_client, stream_model = _get_stream_client()


from neo4j_graphrag.generation.prompts import RagTemplate
custom_prompt = RagTemplate(
    system_instructions=(

        """
        You are a legal assistant and law firm operations expert. Answer ALL questions using ONLY the provided CONTEXT chunks.

        RULES:
        1. If context describes "LawFirmAI" or specific cases, use that data.
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


# ---------- ASK FUNCTION ----------
def ask(query: str, case_id: str, history: list = [], top_k=5, user_id=None):
    print(f"Generating answer for Case: {case_id}...\n")

    # Get fresh LLM based on current preset (with per-user override)
    current_llm = _get_llm_provider(user_id)

    # Define Qdrant Filter
    qdrant_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="case_id",
                match=models.MatchValue(value=case_id),
            )
        ]
    )

    # Custom Retriever to Enforce Filtering
    class CustomRetriever(QdrantNeo4jRetriever):
        def __init__(self, client, collection, embedder, q_filter):
            # Initialize parent to satisfy strict typing/validation if needed
            # We explicitly pass None for driver if not used in custom logic, but parent might require it.
            # However, QdrantNeo4jRetriever.__init__ requires driver.
            # We can pass the global 'driver' available in scope.
            super().__init__(
                driver=driver, 
                client=client, 
                collection_name=collection, 
                embedder=embedder,
                id_property_external="chunk_id",
                id_property_neo4j="id"
            )
            self.q_filter = q_filter
            self.collection = collection # Ensure this is set
            self.client = client
            self.embedder = embedder
            
        def search(self, query_text: str, top_k: int = 5, **kwargs):
            from neo4j_graphrag.types import RetrieverResult
            from rag.reranker import rerank

            # 1. Embed
            query_vector = self.embedder.embed_query(query_text)

            # 2. Search Qdrant with 3x top_k for re-ranking headroom
            fetch_k = min(top_k * 3, 80)
            result = self.client.query_points(
                collection_name=self.collection,
                query=query_vector,
                query_filter=self.q_filter,
                limit=fetch_k,
                with_payload=True
            )
            points = result.points

            # 3. Cross-encoder re-ranking
            doc_texts = [p.payload.get("text", "") for p in points]
            reranked = rerank(query_text, doc_texts, top_k=top_k)

            # 4. Format re-ranked results with numbered citations
            items = []
            for citation_idx, (orig_idx, rerank_score) in enumerate(reranked, 1):
                point = points[orig_idx]
                content = point.payload.get("text", "")
                src = point.payload.get("source", "")
                page_num = point.payload.get("page_number")
                file_type = point.payload.get("file_type")
                # Use reranker score but keep Qdrant score as fallback
                final_score = rerank_score if rerank_score > 0 else point.score
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
        embedder=embedder,
        q_filter=qdrant_filter
    )

    rag = GraphRAG(
        retriever=retriever,
        llm=current_llm,
        prompt_template=custom_prompt
    )

    # Format history for prompt as LLMMessage objects
    # history is list of dicts: {"role": "...", "content": "..."}
    formatted_history = []
    if history:
         for msg in history:
             formatted_history.append(LLMMessage(role=msg["role"], content=msg["content"]))

    # Dynamic Top-K Adjustment
    # If the user asks for a "report", "summary", or "detailed", we need MORE context.
    lower_query = query.lower()
    if any(keyword in lower_query for keyword in ["report", "summary", "detailed", "everything", "full"]):
        print("[INFO] Detailed query detected. Boosting top_k to 50.")
        top_k = max(top_k, 50)
    else:
        # Minimum baseline for good context
        top_k = max(top_k, 15)

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

# ---------- STREAMING ASK FUNCTION ----------

SYSTEM_INSTRUCTIONS = """You are a legal assistant and law firm operations expert. Answer ALL questions using ONLY the provided CONTEXT chunks.

RULES:
1. If context describes "LawFirmAI" or specific cases, use that data.
2. NEVER say "I don't know" or "no information" if context has relevant data.
3. For workflows: use case-specific details and legal procedures.
4. For data fields/tables: extract exact field names from context tables.
5. List ALL items mentioned (judges, lawyers, documents, etc.) - don't summarize.
6. Structure answers clearly with bullet points/tables when listing.
7. CITE your sources using [N] markers that correspond to the numbered context chunks. Place citations inline at the end of the relevant sentence or claim. Example: "The court ruled in favor of the plaintiff [1]."

CONTEXT FORMAT: Each chunk is numbered [N] with its source filename. Use highest scoring chunks first.

Answer format: Direct, factual, structured with inline [N] citations. No disclaimers."""


def ask_stream(query: str, case_id: str, history: list = [], top_k=5, user_id=None,
               context_summary: str = None, custom_instructions: str = None,
               model_override: str = None, session_id: str = None):
    """Generator that yields SSE-formatted events: contexts, token, done, or error."""
    import json as json_module
    import re as _re
    import hashlib

    print(f"[STREAM] Generating answer for Case: {case_id}...\n")

    # Get fresh stream client based on current preset (with per-user override)
    current_stream_client, current_stream_model = _get_stream_client(user_id, model_override)

    # --- Intent classification ---
    intent = _classify_intent(query, history[-4:] if history else [], current_stream_client, current_stream_model)
    print(f"[STREAM] Intent: {intent}")

    if intent == "conversational":
        # Skip retrieval entirely — yield empty contexts
        yield f"data: {json_module.dumps({'type': 'contexts', 'contexts': []})}\n\n"

        # Build conversational LLM messages
        llm_messages = [{"role": "system", "content": CONVERSATIONAL_SYSTEM_PROMPT}]
        if context_summary:
            llm_messages.append({"role": "system", "content": f"Previous conversation summary:\n{context_summary}"})
        if history:
            for msg in history:
                llm_messages.append({"role": msg["role"], "content": msg["content"]})
        llm_messages.append({"role": "user", "content": query})

        # Stream LLM response
        full_answer = ""
        usage_data = None
        try:
            stream = current_stream_client.chat.completions.create(
                model=current_stream_model,
                messages=llm_messages,
                temperature=0.3,
                stream=True,
                stream_options={"include_usage": True},
            )
            for chunk in stream:
                if hasattr(chunk, 'usage') and chunk.usage:
                    usage_data = {
                        "prompt_tokens": chunk.usage.prompt_tokens or 0,
                        "completion_tokens": chunk.usage.completion_tokens or 0,
                        "total_tokens": chunk.usage.total_tokens or 0,
                    }
                if chunk.choices and chunk.choices[0].delta.content:
                    token_text = chunk.choices[0].delta.content
                    full_answer += token_text
                    yield f"data: {json_module.dumps({'type': 'token', 'content': token_text})}\n\n"

            done_event = {'type': 'done', 'answer': full_answer}
            if usage_data:
                done_event['usage'] = usage_data
            yield f"data: {json_module.dumps(done_event)}\n\n"
        except Exception as e:
            yield f"data: {json_module.dumps({'type': 'error', 'detail': str(e)})}\n\n"
        return

    # --- Retrieval (same logic as ask()) ---
    # Build Qdrant filter: always filter by case_id.
    # If session_id is provided, also include session-scoped docs (OR: session_id=="" OR session_id==current)
    if session_id:
        qdrant_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="case_id",
                    match=models.MatchValue(value=case_id),
                )
            ],
            should=[
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=""),
                ),
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=session_id),
                ),
            ]
        )
    else:
        qdrant_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="case_id",
                    match=models.MatchValue(value=case_id),
                )
            ]
        )

    class CustomRetriever(QdrantNeo4jRetriever):
        def __init__(self, client, collection, embedder_inst, q_filter):
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

        def search(self, query_text: str, top_k: int = 5, **kwargs):
            from neo4j_graphrag.types import RetrieverResult
            from rag.reranker import rerank

            query_vector = self.embedder.embed_query(query_text)
            fetch_k = min(top_k * 3, 80)
            result = self.client.query_points(
                collection_name=self.collection,
                query=query_vector,
                query_filter=self.q_filter,
                limit=fetch_k,
                with_payload=True
            )
            points = result.points
            doc_texts = [p.payload.get("text", "") for p in points]
            reranked = rerank(query_text, doc_texts, top_k=top_k)

            items = []
            for citation_idx, (orig_idx, rerank_score) in enumerate(reranked, 1):
                point = points[orig_idx]
                content = point.payload.get("text", "")
                src = point.payload.get("source", "")
                page_num = point.payload.get("page_number")
                file_type = point.payload.get("file_type")
                final_score = rerank_score if rerank_score > 0 else point.score
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
        q_filter=qdrant_filter
    )

    # Dynamic top_k
    lower_query = query.lower()
    if any(kw in lower_query for kw in ["report", "summary", "detailed", "everything", "full"]):
        top_k = max(top_k, 50)
    else:
        top_k = max(top_k, 15)

    # 1. Retrieve contexts
    try:
        retriever_result = retriever.search(query_text=query, top_k=top_k)
    except Exception as e:
        error_msg = str(e)
        if "doesn't exist" in error_msg or "Not found: Collection" in error_msg or "404" in error_msg:
            yield f"data: {json_module.dumps({'type': 'token', 'content': 'I cannot answer yet because no documents have been uploaded for this case. Please upload a document to the Documents tab to start chatting.'})}\n\n"
            yield f"data: {json_module.dumps({'type': 'done', 'answer': 'I cannot answer yet because no documents have been uploaded for this case. Please upload a document to the Documents tab to start chatting.'})}\n\n"
            return
        yield f"data: {json_module.dumps({'type': 'error', 'detail': str(e)})}\n\n"
        return

    # 2. Extract and yield contexts
    score_threshold = float(os.getenv("SOURCE_SCORE_THRESHOLD", "0.3"))
    contexts = []
    for item in retriever_result.items:
        metadata = item.metadata or {}
        source = metadata.get("source")
        score = metadata.get("score")
        raw_content = item.content if isinstance(item.content, str) else str(item.content)
        text_content = _re.sub(r'^\[\d+\]\s*\(Source:\s*[^)]*\)\s*', '', raw_content)

        if score is not None and score < score_threshold:
            continue

        contexts.append({
            "content": text_content,
            "source": source,
            "metadata": metadata,
            "score": score
        })

    contexts.sort(key=lambda c: c.get("score") or 0, reverse=True)
    yield f"data: {json_module.dumps({'type': 'contexts', 'contexts': contexts})}\n\n"

    # Check response cache
    import hashlib as _hashlib
    query_normalized = query.strip().lower()
    cache_key = _hashlib.sha256(f"{case_id}:{query_normalized}:{top_k}".encode()).hexdigest()

    try:
        from database import response_cache_collection
        cached = response_cache_collection.find_one({"cache_key": cache_key})
        if cached:
            print(f"[STREAM] Cache hit for query: {query[:50]}...")
            # Stream cached contexts
            if cached.get("contexts"):
                yield f"data: {json_module.dumps({'type': 'contexts', 'contexts': cached['contexts']})}\n\n"
            # Stream cached answer token by token (fast)
            cached_answer = cached.get("answer", "")
            # Send in chunks for smooth UX
            chunk_size = 20
            for i in range(0, len(cached_answer), chunk_size):
                yield f"data: {json_module.dumps({'type': 'token', 'content': cached_answer[i:i+chunk_size]})}\n\n"
            yield f"data: {json_module.dumps({'type': 'done', 'answer': cached_answer, 'usage': cached.get('usage'), 'cached': True})}\n\n"
            return
    except Exception:
        pass  # Cache miss or error, proceed normally

    # 3. Build LLM messages
    context_text = "\n\n".join(item.content for item in retriever_result.items)
    user_prompt = f"Context:\n{context_text}\n\nExamples:\n\n\nQuestion:\n{query}\n\nAnswer (include [N] citations):\n"

    # Build system instructions with optional custom instructions
    system_content = SYSTEM_INSTRUCTIONS
    if custom_instructions:
        system_content = f"{custom_instructions}\n\n{SYSTEM_INSTRUCTIONS}"

    llm_messages = [{"role": "system", "content": system_content}]

    # Add context summary for long conversations
    if context_summary:
        llm_messages.append({"role": "system", "content": f"Previous conversation summary:\n{context_summary}"})

    if history:
        for msg in history:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})
    llm_messages.append({"role": "user", "content": user_prompt})

    # 4. Stream from LLM with token tracking
    full_answer = ""
    usage_data = None
    try:
        stream_kwargs = {
            "model": current_stream_model,
            "messages": llm_messages,
            "temperature": 0.1,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        stream = current_stream_client.chat.completions.create(**stream_kwargs)
        for chunk in stream:
            # Check for usage in the final chunk
            if hasattr(chunk, 'usage') and chunk.usage:
                usage_data = {
                    "prompt_tokens": chunk.usage.prompt_tokens or 0,
                    "completion_tokens": chunk.usage.completion_tokens or 0,
                    "total_tokens": chunk.usage.total_tokens or 0,
                }
            if chunk.choices and chunk.choices[0].delta.content:
                token_text = chunk.choices[0].delta.content
                full_answer += token_text
                yield f"data: {json_module.dumps({'type': 'token', 'content': token_text})}\n\n"

        done_event = {'type': 'done', 'answer': full_answer}
        if usage_data:
            done_event['usage'] = usage_data
        yield f"data: {json_module.dumps(done_event)}\n\n"

        # Store in response cache
        try:
            from database import response_cache_collection
            from datetime import datetime
            response_cache_collection.update_one(
                {"cache_key": cache_key},
                {"$set": {
                    "cache_key": cache_key,
                    "case_id": case_id,
                    "answer": full_answer,
                    "contexts": contexts,
                    "usage": usage_data,
                    "created_at": datetime.utcnow(),
                }},
                upsert=True
            )
        except Exception:
            pass  # Non-critical

    except Exception as e:
        yield f"data: {json_module.dumps({'type': 'error', 'detail': str(e)})}\n\n"


if __name__ == "__main__":

    # ask("Can you name all the board members")
    print(qdrant.count("chunks"))
    

