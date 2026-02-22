"""
Query understanding and retrieval planning.

Analyzes the user query + chat history to produce a structured RetrievalPlan
that drives hybrid search filters and query expansion.
"""

import json
import os
from dataclasses import dataclass, field

from utils.llm import get_llm_client, get_model_name


@dataclass
class RetrievalPlan:
    search_queries: list[str] = field(default_factory=list)
    document_types: list[str] = field(default_factory=list)
    date_range: dict | None = None          # {"after": "YYYY-MM-DD", "before": "YYYY-MM-DD"}
    source_files: list[str] = field(default_factory=list)
    top_k: int = 15
    search_strategy: str = "focused"        # "focused" | "broad" | "exhaustive"


_PLANNER_PROMPT = """You are a retrieval planner for a legal document Q&A system.

Given the user's query and optional conversation history, produce a JSON retrieval plan.

Rules:
- "search_queries": list of 1-3 rewritten queries optimised for semantic search. Always include the original query. Add expanded or rephrased variants when the query is complex or ambiguous.
- "document_types": list of document type filters if the user mentions a specific type (Contract, FIR, Legal Notice, Email, Court Order, Affidavit, Agreement, Judgment, Petition, Complaint, Power of Attorney, Will, Deed, Receipt, Letter, Report). Empty list if no specific type mentioned.
- "date_range": {"after": "YYYY-MM-DD", "before": "YYYY-MM-DD"} only if the user asks about a specific time period. null otherwise.
- "source_files": list of filenames if the user references specific documents. Empty list otherwise.
- "top_k": number of chunks to retrieve. Use 15 for normal queries, 30 for broad queries, 50 for "summary/report/everything" queries.
- "search_strategy": "focused" for specific questions, "broad" for exploratory questions, "exhaustive" for summary/report requests.

Respond with ONLY the JSON object, no markdown fencing.

Conversation history (last few messages):
{history}

User query: {query}
"""


def plan_retrieval(query: str, history: list[dict] | None = None) -> RetrievalPlan:
    """
    Analyze the query and produce a RetrievalPlan.
    Falls back to a sensible default if the LLM call fails.
    """
    # Format history
    history_text = ""
    if history:
        for msg in history[-6:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if len(content) > 200:
                content = content[:200] + "..."
            history_text += f"{role}: {content}\n"
    if not history_text:
        history_text = "(no prior conversation)"

    prompt = _PLANNER_PROMPT.format(history=history_text, query=query)

    try:
        client = get_llm_client()
        model = get_model_name()
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=500,
        )
        raw = (response.choices[0].message.content or "").strip()

        # Strip code fences
        if raw.startswith("```"):
            lines = raw.split("\n", 1)
            raw = lines[1] if len(lines) > 1 else raw
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()

        data = json.loads(raw)
        plan = RetrievalPlan(
            search_queries=data.get("search_queries", [query]),
            document_types=data.get("document_types", []),
            date_range=data.get("date_range"),
            source_files=data.get("source_files", []),
            top_k=data.get("top_k", 15),
            search_strategy=data.get("search_strategy", "focused"),
        )
        # Ensure original query is always included
        if query not in plan.search_queries:
            plan.search_queries.insert(0, query)
        return plan

    except Exception as e:
        print(f"[WARN] Planner LLM call failed: {e}. Using default plan.")
        return _default_plan(query)


def _default_plan(query: str) -> RetrievalPlan:
    """Heuristic-based fallback when LLM planner is unavailable."""
    lower = query.lower()
    top_k = 15
    strategy = "focused"

    if any(kw in lower for kw in ["report", "summary", "detailed", "everything", "full", "all"]):
        top_k = 50
        strategy = "exhaustive"
    elif any(kw in lower for kw in ["compare", "difference", "overview", "list"]):
        top_k = 30
        strategy = "broad"

    return RetrievalPlan(
        search_queries=[query],
        top_k=top_k,
        search_strategy=strategy,
    )
