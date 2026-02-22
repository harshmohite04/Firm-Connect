import os
import uuid
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter

from utils.embeddings import embedder
from ingestion.enrichment import enrich_chunks

# ------------------ LOAD ENV ------------------
load_dotenv()

# ------------------ CONFIG ------------------
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "chunks"

# Whether to run LLM enrichment (can be disabled for speed/cost)
ENABLE_ENRICHMENT = os.getenv("ENABLE_ENRICHMENT", "true").lower().strip() == "true"

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


def ensure_payload_indexes(client: QdrantClient, collection_name: str):
    """Create payload indexes for filtering and full-text search."""
    _indexes = [
        ("text", models.TextIndexParams(
            type="text",
            tokenizer=models.TokenizerType.MULTILINGUAL,
            min_token_len=2,
            max_token_len=20,
        )),
        ("keywords", models.TextIndexParams(
            type="text",
            tokenizer=models.TokenizerType.MULTILINGUAL,
            min_token_len=2,
            max_token_len=30,
        )),
        ("hypothetical_questions", models.TextIndexParams(
            type="text",
            tokenizer=models.TokenizerType.MULTILINGUAL,
            min_token_len=2,
            max_token_len=20,
        )),
        ("document_type", models.PayloadSchemaType.KEYWORD),
        ("case_id", models.PayloadSchemaType.KEYWORD),
        ("source", models.PayloadSchemaType.KEYWORD),
        ("document_date", models.PayloadSchemaType.KEYWORD),
    ]

    for field_name, field_schema in _indexes:
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=field_schema,
            )
            print(f"[INDEX] Created index on '{field_name}'")
        except Exception as e:
            # Index may already exist – that's fine
            if "already exists" in str(e).lower() or "409" in str(e):
                pass
            else:
                print(f"[WARN] Index creation for '{field_name}' failed: {e}")


def qdrant_upsert(client: QdrantClient, collection: str, vectors: list[list[float]], payloads: list[dict]):
    """
    Upsert points into Qdrant.
    """
    if not vectors:
        print("[WARN] No vectors to upsert.")
        return

    vector_dim = len(vectors[0])
    ensure_qdrant_collection(client, collection, vector_dim)
    ensure_payload_indexes(client, collection)

    points = []
    for vec, payload in zip(vectors, payloads):
        chunk_id = payload["chunk_id"]
        points.append(
            models.PointStruct(
                id=chunk_id,
                vector=vec,
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
def ingest_document(
    text: str,
    source_name: str,
    case_id: str,
    page_metadata: list[dict] | None = None,
    file_path: str | None = None,
):
    """
    Ingest document text into Qdrant + Neo4j.

    Uses section-aware chunking when a file_path is provided, falling back to
    page-aware or legacy character-based splitting otherwise.

    Args:
        text: Full document text (fallback when file_path is None).
        source_name: Filename of the source document.
        case_id: Case ID for filtering.
        page_metadata: Optional list of dicts with keys: text, page_number, file_type.
        file_path: Original file path – when provided, enables section-aware chunking.
    """
    print(f"\n=== Ingesting: {source_name} for Case: {case_id} ===")

    # ---------- Build chunk dicts ----------
    chunk_dicts: list[dict] = []

    # Try section-aware chunking first (if file_path is available)
    if file_path and os.path.exists(file_path):
        try:
            from ingestion.loader import parse_file_sections
            sections = parse_file_sections(file_path)
            if sections and any(s.get("text", "").strip() for s in sections):
                for sec in sections:
                    if not sec.get("text", "").strip():
                        continue
                    chunk_dicts.append({
                        "text": sec["text"],
                        "section_title": sec.get("section_title", ""),
                        "section_number": sec.get("section_number", ""),
                        "parent_section": sec.get("parent_section", ""),
                        "page_number": sec.get("page_number"),
                        "file_type": sec.get("file_type"),
                    })
                print(f"[INFO] Section-aware chunking produced {len(chunk_dicts)} chunks")
        except Exception as e:
            print(f"[WARN] Section-aware chunking failed, falling back: {e}")
            chunk_dicts = []

    # Fallback: page-aware or legacy character-based splitting
    if not chunk_dicts:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )

        if page_metadata:
            for page_info in page_metadata:
                page_text = page_info.get("text", "")
                if not page_text.strip():
                    continue
                page_chunks = splitter.split_text(page_text)
                for ct in page_chunks:
                    chunk_dicts.append({
                        "text": ct,
                        "section_title": "",
                        "section_number": "",
                        "parent_section": "",
                        "page_number": page_info.get("page_number"),
                        "file_type": page_info.get("file_type"),
                    })
        else:
            chunks = splitter.split_text(text)
            for ct in chunks:
                chunk_dicts.append({
                    "text": ct,
                    "section_title": "",
                    "section_number": "",
                    "parent_section": "",
                })

    if not chunk_dicts:
        print("[WARN] No chunks produced. Skipping ingestion.")
        return

    print(f"[INFO] Total chunks: {len(chunk_dicts)}")

    # ---------- LLM Enrichment ----------
    if ENABLE_ENRICHMENT:
        try:
            enrich_chunks(chunk_dicts)
        except Exception as e:
            print(f"[WARN] Enrichment failed, continuing without: {e}")

    # ---------- Embed + Build Payloads ----------
    vectors: list[list[float]] = []
    payloads: list[dict] = []

    # Generate a shared parent_chunk_id per section_title group
    section_group_ids: dict[str, str] = {}

    for idx, cd in enumerate(chunk_dicts):
        chunk_id = str(uuid.uuid4())
        print(f"[EMBED] Chunk {idx + 1}/{len(chunk_dicts)}...")
        embedding = embedder.embed_query(cd["text"])
        vectors.append(embedding)

        # Parent chunk linking
        sec_title = cd.get("section_title", "")
        if sec_title and sec_title not in section_group_ids:
            section_group_ids[sec_title] = str(uuid.uuid4())
        parent_chunk_id = section_group_ids.get(sec_title, "")

        payload = {
            "chunk_id": chunk_id,
            "text": cd["text"],
            "source": source_name,
            "case_id": case_id,
            # Section metadata
            "section_title": cd.get("section_title", ""),
            "section_number": cd.get("section_number", ""),
            "parent_chunk_id": parent_chunk_id,
            # Enrichment metadata (may be empty if enrichment disabled/failed)
            "summary": cd.get("summary", ""),
            "keywords": cd.get("keywords", []),
            "hypothetical_questions": cd.get("hypothetical_questions", []),
            "document_type": cd.get("document_type", ""),
            "document_date": cd.get("document_date"),
        }

        if cd.get("page_number") is not None:
            payload["page_number"] = cd["page_number"]
        if cd.get("file_type") is not None:
            payload["file_type"] = cd["file_type"]

        payloads.append(payload)

        create_chunk_node(driver, chunk_id, cd["text"], source_name, case_id)
        create_entity_relations(driver, chunk_id, cd["text"])

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

    ingest_document(text, source_name="sample1.txt", case_id=case_id_arg, file_path=file_path)


# ------------------ DELETE DOCUMENT ------------------
def delete_document(case_id: str, filename: str):
    """
    Deletes a document from both Neo4j and Qdrant based on case_id and filename.
    """
    print(f"\n=== Deleting: {filename} for Case: {case_id} ===")

    # 1. Delete from Neo4j
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
