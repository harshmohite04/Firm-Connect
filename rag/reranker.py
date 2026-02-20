import os
from sentence_transformers import CrossEncoder

# Multilingual cross-encoder for re-ranking (supports Hindi and other languages)
RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")

_cross_encoder = CrossEncoder(RERANKER_MODEL)


def rerank(query: str, documents: list[str], top_k: int | None = None) -> list[tuple[int, float]]:
    """
    Re-rank documents against a query using a cross-encoder.

    Args:
        query: The search query.
        documents: List of document texts to re-rank.
        top_k: Number of top results to return. None returns all.

    Returns:
        List of (original_index, score) tuples sorted by score descending.
    """
    if not documents:
        return []

    pairs = [[query, doc] for doc in documents]
    scores = _cross_encoder.predict(pairs)

    indexed_scores = [(i, float(s)) for i, s in enumerate(scores)]
    indexed_scores.sort(key=lambda x: x[1], reverse=True)

    if top_k is not None:
        indexed_scores = indexed_scores[:top_k]

    return indexed_scores
