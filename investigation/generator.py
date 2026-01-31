from rag.rag import ask
from pydantic import BaseModel

class DocumentGenerator:
    def __init__(self):
        pass

    def generate(self, case_id: str, instructions: str) -> str:
        """
        Generates a legal document based on the case context and specific instructions.
        Uses the existing RAG pipeline but adapts the prompt via the query.
        """
        # tailored query to force the RAG to act as a drafter
        rag_query = (
            f"You are a legal assistant. Draft a document based on these instructions: '{instructions}'. "
            f"Use the provided context about the case to fill in details. "
            f"Return ONLY the document content, properly formatted."
        )
        
        # boosting top_k to ensure we get enough context for a full document
        result = ask(query=rag_query, case_id=case_id, top_k=20)
        
        return result.answer
