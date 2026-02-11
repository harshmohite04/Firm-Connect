import os
import uuid
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter

from utils.embeddings import embedder

# ------------------ LOAD ENV ------------------
load_dotenv()

# ------------------ CONFIG ------------------
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "chunks"

# ------------------ CLIENTS ------------------
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)


# ------------------ NEO4J HELPERS ------------------
def create_chunk_node(driver, chunk_id: str, text: str, source: str, case_id: str):
    query = """
    MERGE (c:Chunk {id: $id})
    SET c.text = $text,
        c.source = $source,
        c.caseId = $case_id
    """
    with driver.session() as s:
        s.run(query, id=chunk_id, text=text, source=source, case_id=case_id)


def create_entity_relations(driver, chunk_id: str, text: str):
    # Placeholder – you can later add entity extraction here
    return


# ------------------ QDRANT HELPERS ------------------
def ensure_qdrant_collection(client: QdrantClient, collection_name: str, vector_dim: int):
    """
    Ensure the Qdrant collection exists with the correct vector schema.
    Vector name will be 'vector' (default used by many retrievers).
    """
    try:
        info = client.get_collection(collection_name)
        existing_dim = info.config.params.vectors.size \
            if hasattr(info.config.params.vectors, "size") \
            else list(info.config.params.vectors.values())[0].size

        if existing_dim != vector_dim:
            print(
                f"[WARN] Collection '{collection_name}' exists with dim={existing_dim}, "
                f"but embeddings are dim={vector_dim}. Recreating collection."
            )
            client.recreate_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_dim,
                    distance=models.Distance.COSINE,
                ),
            )
        else:
            print(f"[OK] Collection '{collection_name}' exists with correct dim={vector_dim}.")
    except Exception:
        print(f"[INFO] Collection '{collection_name}' does not exist. Creating it.")
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=vector_dim,
                distance=models.Distance.COSINE,
            ),
        )
    print(f"[OK] Qdrant collection '{collection_name}' ready.")


def qdrant_upsert(client: QdrantClient, collection: str, vectors: list[list[float]], payloads: list[dict]):
    """
    Upsert points into Qdrant using qdrant_client models.
    - We use 'chunk_id' in payload to match Neo4j's Chunk.id
    - Qdrant point ID can be same as chunk_id for simplicity
    """
    if not vectors:
        print("[WARN] No vectors to upsert.")
        return

    vector_dim = len(vectors[0])
    ensure_qdrant_collection(client, collection, vector_dim)

    points = []
    for vec, payload in zip(vectors, payloads):
        chunk_id = payload["chunk_id"]
        points.append(
            models.PointStruct(
                id=chunk_id,     # point ID == chunk_id (optional but neat)
                vector=vec,      # stored under default vector name
                payload=payload
            )
        )

    print(f"[INFO] Upserting {len(points)} points into Qdrant collection '{collection}'...")
    client.upsert(
        collection_name=collection,
        points=points,
        wait=True,
    )
    print("[OK] Qdrant upsert completed.")


# Configurable chunk sizes via environment variables
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "300"))

# ------------------ INGEST DOCUMENT ------------------
def ingest_document(text: str, source_name: str, case_id: str, page_metadata: list[dict] | None = None):
    """
    Ingest document text into Qdrant + Neo4j.

    Args:
        text: Full document text (used when page_metadata is None).
        source_name: Filename of the source document.
        case_id: Case ID for filtering.
        page_metadata: Optional list of dicts with keys: text, page_number, file_type.
                      When provided, chunks preserve page-level metadata.
    """
    print(f"\n=== Ingesting: {source_name} for Case: {case_id} ===")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    vectors: list[list[float]] = []
    payloads: list[dict] = []

    if page_metadata:
        # Page-aware chunking: chunk each page separately to preserve page numbers
        chunk_idx = 0
        for page_info in page_metadata:
            page_text = page_info.get("text", "")
            if not page_text.strip():
                continue
            page_chunks = splitter.split_text(page_text)
            for chunk_text in page_chunks:
                chunk_id = str(uuid.uuid4())
                chunk_idx += 1
                print(f"[EMBED] Chunk {chunk_idx}...")
                embedding = embedder.embed_query(chunk_text)

                vectors.append(embedding)
                payload = {
                    "chunk_id": chunk_id,
                    "text": chunk_text,
                    "source": source_name,
                    "case_id": case_id,
                }
                if "page_number" in page_info:
                    payload["page_number"] = page_info["page_number"]
                if "file_type" in page_info:
                    payload["file_type"] = page_info["file_type"]
                payloads.append(payload)

                create_chunk_node(driver, chunk_id, chunk_text, source_name, case_id)
                create_entity_relations(driver, chunk_id, chunk_text)

        print(f"[INFO] Total chunks (page-aware): {chunk_idx}")
    else:
        # Legacy path: no page metadata
        chunks = splitter.split_text(text)
        print(f"[INFO] Total chunks: {len(chunks)}")

        for idx, chunk_text in enumerate(chunks):
            chunk_id = str(uuid.uuid4())
            print(f"[EMBED] Chunk {idx + 1}/{len(chunks)}...")
            embedding = embedder.embed_query(chunk_text)

            vectors.append(embedding)
            payloads.append(
                {
                    "chunk_id": chunk_id,
                    "text": chunk_text,
                    "source": source_name,
                    "case_id": case_id,
                }
            )

            create_chunk_node(driver, chunk_id, chunk_text, source_name, case_id)
            create_entity_relations(driver, chunk_id, chunk_text)

    # Upsert into Qdrant
    qdrant_upsert(qdrant, QDRANT_COLLECTION, vectors, payloads)

    print("[DONE] Ingestion completed!")


# ------------------ MAIN ------------------
if __name__ == "__main__":
    file_path = "documents/sample1.txt"
    case_id_arg = "default_case"

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    ingest_document(text, source_name="sample1.txt", case_id=case_id_arg)


# ------------------ DELETE DOCUMENT ------------------
def delete_document(case_id: str, filename: str):
    """
    Deletes a document from both Neo4j and Qdrant based on case_id and filename.
    """
    print(f"\n=== Deleting: {filename} for Case: {case_id} ===")

    # 1. Delete from Neo4j
    # We match chunks that have BOTH caseId and source
    query = """
    MATCH (c:Chunk {caseId: $case_id, source: $filename})
    DETACH DELETE c
    """
    try:
        with driver.session() as s:
            s.run(query, case_id=case_id, filename=filename)
        print("[INFO] Deleted chunks from Neo4j.")
    except Exception as e:
        print(f"[ERROR] Failed to delete from Neo4j: {e}")

    # 2. Delete from Qdrant
    # We delete points where payload.case_id == case_id AND payload.source == filename
    try:
        qdrant.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="case_id",
                            match=models.MatchValue(value=case_id),
                        ),
                        models.FieldCondition(
                            key="source",
                            match=models.MatchValue(value=filename),
                        ),
                    ]
                )
            ),
        )
        print("[INFO] Deleted points from Qdrant.")
    except Exception as e:
        print(f"[ERROR] Failed to delete from Qdrant: {e}")

    print("[DONE] Deletion completed!")
