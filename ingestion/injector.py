import os
import uuid
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models
from langchain_text_splitters import RecursiveCharacterTextSplitter

from neo4j_graphrag.embeddings.ollama import OllamaEmbeddings

# ------------------ LOAD ENV ------------------
load_dotenv()

# ------------------ CONFIG ------------------
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = "chunks"

# Same model as in your ask() file
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# ------------------ CLIENTS ------------------
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)

# Use SAME embedder as in GraphRAG retriever
embedder = OllamaEmbeddings(
    model=EMBED_MODEL,  # "nomic-embed-text"
)


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



# ------------------ ENTITY EXTRACTION ------------------
from neo4j_graphrag.llm import OllamaLLM
import json
import re

# Initialize LLM for extraction (using same model as RAG for now, or lighter one)
llm = OllamaLLM(
    model_name=os.getenv("OLLAMA_LLM_MODEL", "llama3.2:latest"),
    model_params={"temperature": 0.0} # Deterministic for extraction
)

def extract_entities(text: str) -> dict:
    prompt = f"""
    Internalize the following text and extract ALL entities.
    Return ONLY a JSON object with keys: "People", "Organizations", "Locations", "Dates".
    Values should be lists of strings.
    
    Text:
    "{text[:2000]}" 
    
    JSON:
    """
    try:
        response = llm.invoke(prompt)
        # Attempt to parse JSON. LLM might add extra text, so we clean it.
        # Find first { and last }
        start = response.content.find('{')
        end = response.content.rfind('}') + 1
        if start != -1 and end != -1:
            json_str = response.content[start:end]
            return json.loads(json_str)
        return {"People": [], "Organizations": [], "Locations": [], "Dates": []}
    except Exception as e:
        print(f"[WARN] Entity extraction failed: {e}")
        return {"People": [], "Organizations": [], "Locations": [], "Dates": []}

def create_entity_relations(driver, chunk_id: str, text: str):
    """
    Extracts entities from text and creates (:Chunk)-[:MENTIONS]->(:Entity) relationships.
    """
    print(f"   [EXTRACT] finding entities in chunk...")
    entities = extract_entities(text)
    
    query = """
    MATCH (c:Chunk {id: $chunk_id})
    
    FOREACH (name IN $people | 
        MERGE (e:Entity:Person {name: name})
        MERGE (c)-[:MENTIONS]->(e)
    )
    FOREACH (name IN $orgs | 
        MERGE (e:Entity:Organization {name: name})
        MERGE (c)-[:MENTIONS]->(e)
    )
    FOREACH (name IN $locs | 
        MERGE (e:Entity:Location {name: name})
        MERGE (c)-[:MENTIONS]->(e)
    )
    FOREACH (name IN $dates | 
        MERGE (e:Entity:Date {name: name})
        MERGE (c)-[:MENTIONS]->(e)
    )
    """
    
    try:
        with driver.session() as s:
            s.run(query, 
                  chunk_id=chunk_id,
                  people=entities.get("People", []),
                  orgs=entities.get("Organizations", []),
                  locs=entities.get("Locations", []),
                  dates=entities.get("Dates", [])
            )
    except Exception as e:
        print(f"[ERROR] Failed to create entity relations: {e}")


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


# ------------------ INGEST DOCUMENT ------------------
def ingest_document(text: str, source_name: str, case_id: str):
    print(f"\n=== Ingesting: {source_name} for Case: {case_id} ===")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
    )
    chunks = splitter.split_text(text)
    print(f"[INFO] Total chunks: {len(chunks)}")

    vectors: list[list[float]] = []
    payloads: list[dict] = []

    for idx, chunk_text in enumerate(chunks):
        chunk_id = str(uuid.uuid4())

        print(f"[EMBED] Chunk {idx + 1}/{len(chunks)}...")
        # Use SAME embedder as retriever
        embedding = embedder.embed_query(chunk_text)

        vectors.append(embedding)
        payloads.append(
            {
                "chunk_id": chunk_id,   # used by QdrantNeo4jRetriever (id_property_external)
                "text": chunk_text,
                "source": source_name,
                "case_id": case_id      # Metadata for filtering
            }
        )

        # Store in Neo4j
        create_chunk_node(driver, chunk_id, chunk_text, source_name, case_id)
        
        # EXTRACT & LINK ENTITIES
        create_entity_relations(driver, chunk_id, chunk_text)

    # Upsert into Qdrant
    qdrant_upsert(qdrant, QDRANT_COLLECTION, vectors, payloads)

    print("[DONE] Ingestion completed!")


# ------------------ DELETE DOCUMENT ------------------
def delete_document(case_id: str, filename: str):
    """
    Deletes a document from both Neo4j and Qdrant based on case_id and filename.
    """
    print(f"\n=== Deleting: {filename} for Case: {case_id} ===")

    # 1. Delete from Neo4j
    # We match chunks that have BOTH caseId and source
    # Also delete orphan entities if needed? For now just chunks.
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
