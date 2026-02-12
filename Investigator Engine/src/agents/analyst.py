from typing import List, Dict, Any, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.state import InvestigatorState, Document, Fact
from src.utils import get_llm_with_retry, get_json_parser, smart_truncate, rate_limiter
from pydantic import BaseModel, Field

# --- Document Analyst ---

class DocAnalysisOutput(BaseModel):
    doc_type: str = Field(description="Type of the document e.g. Contract, Email, FIR")
    summary: str = Field(description="Brief summary of content")
    parties: List[str] = Field(description="Names of parties involved")
    dates: List[str] = Field(description="Key dates mentioned")
    key_claims: List[str] = Field(description="Important claims or obligations")

def document_analyst(state: InvestigatorState) -> Dict[str, Any]:
    """
    Reads each document, identifies type, extracts key metadata.
    """
    llm = get_llm_with_retry(task_tier="fast")
    parser = get_json_parser(pydantic_object=DocAnalysisOutput)

    prompt = ChatPromptTemplate.from_template(
        """
        You are an expert Document Analyst for a legal investigation.
        Analyze the following document and extract structured metadata.

        Document Content:
        {content}

        format_instructions: {format_instructions}
        """
    )

    chain = prompt | llm | parser

    updated_documents = []
    errors = []

    for doc in state["documents"]:
        rate_limiter.wait()
        # If already analyzed, skip
        if doc.get("analysis"):
            updated_documents.append(doc)
            continue

        try:
            result = chain.invoke({
                "content": smart_truncate(doc["content"], 4000),
                "format_instructions": parser.get_format_instructions()
            })
            doc["analysis"] = result
        except Exception as e:
            print(f"Error analyzing document {doc['id']}: {e}")
            doc["analysis"] = {"error": str(e)}
            errors.append({"agent": "document_analyst", "error": f"Failed to analyze {doc['id']}: {e}"})

        updated_documents.append(doc)

    result = {"documents": updated_documents}
    if errors:
        result["errors"] = errors
    return result

# --- Deep Fact Extractor ---

class FactModel(BaseModel):
    description: str = Field(description="The factual statement")
    source_quote: str = Field(description="Direct verbatim quote from the text supporting this fact")
    entities: List[str] = Field(description="Entities involved in this fact")
    date: Optional[str] = Field(description="The date of the event, if mentioned (YYYY-MM-DD format if possible)")
    confidence: float = Field(description="Confidence score (0.0 to 1.0)")

class DeepExtractionOutput(BaseModel):
    facts: List[FactModel] = Field(description="List of extracted facts with citations")

def entity_fact_extractor(state: InvestigatorState) -> Dict[str, Any]:
    """
    Performs deep extraction of facts from raw document text.
    Ensures every fact has a direct quote and source.
    """
    llm = get_llm_with_retry(task_tier="fast")
    parser = get_json_parser(pydantic_object=DeepExtractionOutput)

    prompt = ChatPromptTemplate.from_template(
        """
        You are a Legal Forensics Expert specializing in SURGICAL EVIDENCE EXTRACTION.
        Your goal is to extract EVERY factual statement from the document with 100% precision.

        DOCUMENT ID: {doc_id}
        DOCUMENT CONTENT:
        {content}

        STRICT RULES:
        1. NO SUMMARIZATION. Extract discrete, specific facts.
        2. EVERY fact must have an EXACT, VERBATIM "source_quote". If you cannot find a quote, do not extract the fact.
        3. Extract all DATES, AMOUNTS, NAMES, and CLAIMS.
        4. Dates MUST be in YYYY-MM-DD format. If only a year is given, use YYYY-01-01.
        5. "confidence" should reflect the clarity of the text (1.0 for typed, 0.5 for ambiguous/handwritten).

        {format_instructions}
        """
    )

    chain = prompt | llm | parser

    all_facts = []
    all_entities = set()
    errors = []

    for doc in state["documents"]:
        try:
            print(f"--- Deep Extracting Facts from {doc['id']} ---")
            rate_limiter.wait()
            result = chain.invoke({
                "doc_id": doc["id"],
                "content": smart_truncate(doc["content"], 6000),
                "format_instructions": parser.get_format_instructions()
            })

            # Map result to state format
            extracted_facts = result.facts if hasattr(result, "facts") else result.get("facts", [])

            for f in extracted_facts:
                # Handle both Pydantic and raw dict if parser varied
                f_dict = f.dict() if hasattr(f, "dict") else f

                fact_entry = {
                    "id": f"fact_{len(all_facts)}",
                    "source_doc_id": doc["id"],
                    "source_quote": f_dict.get("source_quote", ""),
                    "description": f_dict.get("description", ""),
                    "entities": f_dict.get("entities", []),
                    "date": f_dict.get("date"),
                    "confidence": f_dict.get("confidence", 1.0)
                }
                all_facts.append(fact_entry)
                for ent in f_dict.get("entities", []):
                    all_entities.add(ent)

        except Exception as e:
            print(f"Error in deep extraction for {doc['id']}: {e}")
            errors.append({"agent": "entity_fact_extractor", "error": f"Failed on {doc['id']}: {e}"})

    result = {
        "facts": all_facts,
        "entities": list(all_entities)
    }
    if errors:
        result["errors"] = errors
    return result
