import os
import functools
from sentence_transformers import SentenceTransformer

# Multilingual embedding model (1024-dim, supports Hindi and other Indian languages)
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-m3")

_sentence_transformer = SentenceTransformer(EMBED_MODEL)


# --- Cached query embedding (saves ~50-100ms per repeated query) ---
@functools.lru_cache(maxsize=512)
def _embed_cached(text: str) -> tuple:
    return tuple(_sentence_transformer.encode(text).tolist())


class LocalEmbedder:
    """Wrapper for SentenceTransformers to match the embedder interface."""
    def __init__(self, model: SentenceTransformer):
        self.model = model

    def embed_query(self, text: str) -> list:
        return list(_embed_cached(text))

    def embed_documents(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Batch-encode multiple texts at once (3-10x faster than per-chunk calls)."""
        if not texts:
            return []
        return self.model.encode(texts, batch_size=batch_size).tolist()


# Shared singleton embedder instance
embedder = LocalEmbedder(_sentence_transformer)


def embed_text(text: str) -> list[float]:
    """Generate vector embeddings using SentenceTransformers (local, no Ollama)."""
    return embedder.embed_query(text)
