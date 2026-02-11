import os
from sentence_transformers import SentenceTransformer

# Upgraded embedding model (768-dim, better accuracy than all-MiniLM-L6-v2's 384-dim)
EMBED_MODEL = os.getenv("EMBED_MODEL", "BAAI/bge-base-en-v1.5")

_sentence_transformer = SentenceTransformer(EMBED_MODEL)


class LocalEmbedder:
    """Wrapper for SentenceTransformers to match the embedder interface."""
    def __init__(self, model: SentenceTransformer):
        self.model = model

    def embed_query(self, text: str) -> list:
        return self.model.encode(text).tolist()


# Shared singleton embedder instance
embedder = LocalEmbedder(_sentence_transformer)


def embed_text(text: str) -> list[float]:
    """Generate vector embeddings using SentenceTransformers (local, no Ollama)."""
    return embedder.embed_query(text)
