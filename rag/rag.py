import os
from dotenv import load_dotenv

from neo4j import GraphDatabase
from qdrant_client import QdrantClient, models
from groq import Groq

# from utils.embeddings import embed_text
from neo4j_graphrag.generation import GraphRAG
# from neo4j_graphrag.llm import LLM
from neo4j_graphrag.llm import OllamaLLM, OpenAILLM
# from neo4j_graphrag.integrations.qdrant import QdrantNeo4jRetriever
from neo4j_graphrag.retrievers.external.qdrant.qdrant import QdrantNeo4jRetriever
from neo4j_graphrag.types import LLMMessage, RetrieverResultItem
import os
import requests
from sentence_transformers import SentenceTransformer


load_dotenv()




# ----- CONFIG -----
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")
OLLAMA_LLM_MODEL = "llama3.2:latest"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION = "chunks"
# SentenceTransformers model (same as ingestion)
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
groq = Groq(api_key=os.getenv("GROQ_API_KEY"))


driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_KEY)

# Use SentenceTransformers for local embeddings (no Ollama dependency)
_sentence_transformer = SentenceTransformer(EMBED_MODEL)

class LocalEmbedder:
    """Wrapper for SentenceTransformers to match the embedder interface."""
    def __init__(self, model):
        self.model = model
    
    def embed_query(self, text: str) -> list:
        return self.model.encode(text).tolist()

embedder = LocalEmbedder(_sentence_transformer)


# ollama_llm = OllamaLLM(
#     model_name=OLLAMA_LLM_MODEL,
#     model_params={"temperature": 0.2},
# )

llm = OpenAILLM(
    model_name=DEEPSEEK_MODEL,
    model_params={
        "temperature": 0.1
    },
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com"
)

def embed_text(text: str) -> list[float]:
    """
    Generate vector embeddings using SentenceTransformers (local, no Ollama).
    """
    return embedder.embed_query(text)


from neo4j_graphrag.generation.prompts import RagTemplate
custom_prompt = RagTemplate(
    system_instructions=(
        
        """
        You are a hospital operations expert. Answer ALL questions using ONLY the provided CONTEXT chunks.
        
        RULES:
        1. If context describes "Sunrise Multi-Specialty Hospital" but question asks about "Horizon Valley" → use Sunrise data as the template hospital
        2. NEVER say "I don't know" or "no information" if context has relevant data
        3. For workflows: use department-specific sections, NOT generic daily schedules
        4. For data fields/tables: extract exact field names from context tables
        5. List ALL items mentioned (departments, ICUs, etc.) - don't summarize
        6. Structure answers clearly with bullet points/tables when listing
        
        CONTEXT FORMAT: Each chunk has score (higher = more relevant). Use highest scoring chunks first.
        
        Answer format: Direct, factual, structured. No disclaimers.
        """
    ),

    template="""Context:
{context}

Examples:
{examples}

Question:
{query_text}

Answer:
""",
)


# ---------- ASK FUNCTION ----------
def ask(query: str, case_id: str, history: list = [], top_k=5):
    print(f"Generating answer for Case: {case_id}...\n")

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
            # 1. Embed
            query_vector = self.embedder.embed_query(query_text)
            
            # 2. Search Qdrant with Filter
            # Using query_points as 'search' might be deprecated or missing in this client version
            result = self.client.query_points(
                collection_name=self.collection,
                query=query_vector,
                query_filter=self.q_filter,
                limit=top_k,
                with_payload=True
            )
            points = result.points
            
            # 3. Format Results
            from neo4j_graphrag.types import RetrieverResult
            items = []
            for point in points:
                # Payload contains 'text' from ingestion
                content = point.payload.get("text", "")
                src = point.payload.get("source", "")
                items.append(RetrieverResultItem(content=content, metadata={"score": point.score, "source": src}))
                
            return RetrieverResult(items=items)

    retriever = CustomRetriever(
        client=qdrant,
        collection=COLLECTION,
        embedder=embedder,
        q_filter=qdrant_filter
    )

    # We need to manually inject the filter because the current wrapper init might not expose it easily 
    # OR assuming the library supports 'retriever_config' in search to pass generic params?
    # Checking the library code isn't possible, but usually QdrantNeo4jRetriever in graphrag might not support explicit filters in init.
    # However, let's try to pass it if the library supports it, or check if we can subclass/patch.
    # WAIT, standard neo4j-graphrag Qdrant integration usually takes `client` and `collection`. 
    # If the `search` method allows kwargs that pass down to qdrant, we use that.
    
    # Looking at standard implementations, retrieval usually handles filters. 
    # If the library doesn't support it, we might need to do a raw qdrant search first.
    # But let's assume we can pass `retriever_config` in `rag.search`. 
    # If `QdrantNeo4jRetriever` doesn't handle filters in `search`, we are stuck.
    
    # RE-STRATEGY: The QdrantNeo4jRetriever usually does NOT support filters in the upstream library yet.
    # We might need to monkey-patch or use a CustomRetriever.
    # Let's try passing it in `retriever_config` assuming a good implementation.
    # IF NOT: I will implement a custom retriever that respects the filter.

    rag = GraphRAG(
        retriever=retriever,
        llm=llm,
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

if __name__ == "__main__":

    # ask("Can you name all the board members")
    print(qdrant.count("chunks"))
    

