"""
LLM-based metadata enrichment for document chunks.

Processes chunks in batches and generates:
  - summary, keywords, hypothetical_questions, document_type, document_date
"""

import json
import os

from utils.llm import get_llm_client, get_model_name

BATCH_SIZE = int(os.getenv("ENRICHMENT_BATCH_SIZE", "5"))

_ENRICHMENT_PROMPT = """You are a legal document analysis assistant. For each chunk of text below, generate structured metadata.

Return a JSON array with one object per chunk, in the same order. Each object must have exactly these keys:
- "summary": 1-2 sentence summary of the chunk
- "keywords": list of key terms, entity names, dates, legal concepts (3-10 items)
- "hypothetical_questions": 2-3 questions that this chunk could answer
- "document_type": one of: Contract, FIR, Legal Notice, Email, Court Order, Affidavit, Agreement, Judgment, Petition, Complaint, Power of Attorney, Will, Deed, Receipt, Letter, Report, Other
- "document_date": ISO date (YYYY-MM-DD) if any date is mentioned in the chunk, otherwise null

Respond with ONLY the JSON array, no markdown fencing, no explanation.

Chunks:
{chunks_text}
"""


def _parse_enrichment_response(raw: str, count: int) -> list[dict]:
    """Parse LLM response into a list of enrichment dicts, with fallbacks."""
    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n", 1)
        text = lines[1] if len(lines) > 1 else text
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        # Handle ```json prefix
        if text.startswith("json"):
            text = text[4:].strip()

    try:
        result = json.loads(text)
        if isinstance(result, list) and len(result) == count:
            return result
        if isinstance(result, list):
            # Pad or trim to match count
            while len(result) < count:
                result.append(_empty_enrichment())
            return result[:count]
        # Single dict instead of array
        if isinstance(result, dict):
            return [result] + [_empty_enrichment() for _ in range(count - 1)]
    except json.JSONDecodeError:
        pass

    return [_empty_enrichment() for _ in range(count)]


def _empty_enrichment() -> dict:
    return {
        "summary": "",
        "keywords": [],
        "hypothetical_questions": [],
        "document_type": "Other",
        "document_date": None,
    }


def enrich_chunks(chunks: list[dict]) -> list[dict]:
    """
    Enrich a list of chunk dicts with LLM-generated metadata.

    Each chunk dict must have a 'text' key. The function adds:
        summary, keywords, hypothetical_questions, document_type, document_date

    Processes in batches to minimize API calls.
    Returns the same list with enrichment fields added in-place.
    """
    if not chunks:
        return chunks

    client = get_llm_client()
    model = get_model_name()

    for batch_start in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[batch_start:batch_start + BATCH_SIZE]
        batch_texts = []
        for i, chunk in enumerate(batch):
            text = chunk.get("text", "")
            # Truncate very long chunks for the prompt
            if len(text) > 2000:
                text = text[:2000] + "..."
            batch_texts.append(f"--- Chunk {i + 1} ---\n{text}")

        chunks_text = "\n\n".join(batch_texts)
        prompt = _ENRICHMENT_PROMPT.format(chunks_text=chunks_text)

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=4000,
            )
            raw = response.choices[0].message.content or ""
            enrichments = _parse_enrichment_response(raw, len(batch))
        except Exception as e:
            print(f"[WARN] Enrichment LLM call failed: {e}")
            enrichments = [_empty_enrichment() for _ in batch]

        # Apply enrichments to chunks
        for i, enrichment in enumerate(enrichments):
            idx = batch_start + i
            chunks[idx]["summary"] = enrichment.get("summary", "")
            chunks[idx]["keywords"] = enrichment.get("keywords", [])
            chunks[idx]["hypothetical_questions"] = enrichment.get("hypothetical_questions", [])
            chunks[idx]["document_type"] = enrichment.get("document_type", "Other")
            chunks[idx]["document_date"] = enrichment.get("document_date")

        print(f"[ENRICH] Batch {batch_start // BATCH_SIZE + 1}: enriched {len(batch)} chunks")

    return chunks
