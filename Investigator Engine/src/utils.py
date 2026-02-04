import os
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
try:
    from langchain_ollama import ChatOllama
except ImportError:
    ChatOllama = None
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from dotenv import load_dotenv

load_dotenv()

def mock_llm_func(input_val):
    print("  [MockLLM] Processing request...")
    return AIMessage(content="{}")

def get_llm(model_name: str = "openai/gpt-oss-120b"):
    # Check for Ollama preference
    use_ollama = str(os.getenv("USE_OLLAMA", "")).lower().replace('"', '').replace("'", "")
    if use_ollama == "true":
        if ChatOllama is None:
            print("Warning: langchain_ollama not installed. Falling back to other providers.")
        else:
            target_model = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
            return ChatOllama(model=target_model, temperature=0.1)

    # Check for DeepSeek
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_api_key:
        target_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        # Allow override if specific model requested and not generic defaults
        if model_name != "gpt-4-turbo" and model_name != "openai/gpt-oss-120b":
             target_model = model_name
             
        # print(f"Using DeepSeek Model: {target_model}")
        return ChatOpenAI(
            model=target_model, 
            api_key=deepseek_api_key, 
            base_url="https://api.deepseek.com",
            temperature=0.1
        )

    # Check for Groq next
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        # Default from env, fallback to hardcoded if not set
        target_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        
        # If the caller requested a specific model that is NOT the default gpt-4-turbo, use it.
        # Otherwise, use the Groq preference.
        if model_name != "gpt-4-turbo" and model_name != "openai/gpt-oss-120b":
             target_model = model_name
             
        # print(f"Using Groq Model: {target_model}")
        return ChatGroq(model_name=target_model, temperature=0.1)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Warning: No API Keys (DEEPSEEK/GROQ/OPENAI) and USE_OLLAMA not set. Using MOCK LLM.")
        return RunnableLambda(mock_llm_func)
    
    return ChatOpenAI(model=model_name, temperature=0.1)

class MockParser(RunnableLambda):
    def __init__(self, pyd_obj):
        self.pyd_obj = pyd_obj
        super().__init__(func=self._invoke)
        
    def get_format_instructions(self):
        return ""
        
    def _invoke(self, input_val):
        if self.pyd_obj:
            try:
                schema = self.pyd_obj.schema()
                title = schema.get("title")
                
                if title == "DocAnalysisOutput":
                    return {
                        "doc_type": "Contract",
                        "summary": "Mock summary",
                        "parties": ["Party A", "Party B"],
                        "dates": ["2023-01-01"],
                        "key_claims": ["Claim 1"]
                    }
                elif title == "ExtractionOutput":
                    return {
                        "entities": ["Alpha Corp", "Beta Ltd"],
                        "facts": [{"source_doc_id": "doc_001", "description": "Mock Fact", "entities": ["Alpha"], "confidence": 0.9}]
                    }
                elif title == "InvestigatorOutput":
                    return {
                        "narrative": "Based on the facts, Alpha Corp owes money.",
                        "timeline": [{"date": "2023-01-01", "event": "Contract Signed"}],
                        "hypotheses": [{"description": "Breach of contract", "supporting_facts": ["fact_1"]}]
                    }
                elif title == "CritiqueOutput":
                    return {"challenges": [{"description": "Missing payment proof", "severity": "HIGH", "counter_evidence": None}]}
                elif title == "ValidationOutput":
                    return {"validation_status": {"hyp_1": "supported"}}
                elif title == "GapOutput":
                    return {"gaps": [{"description": "Bank statement", "importance": "HIGH"}]}
                elif title == "ResearchOutput":
                    return {"issues": [{"description": "Late fee validity", "relevant_laws": ["Contract Act"], "precedents": ["Case X v Y"]}]}
                elif title == "RiskOutput":
                    return {"risks": [{"description": "Counter-suit", "impact": "High", "mitigation": "Settle"}]}
            except:
                pass
        return {}

def get_json_parser(pydantic_object=None):
    # Check if ANY valid key OR Ollama is present to use real parser
    use_ollama = str(os.getenv("USE_OLLAMA", "")).lower().replace('"', '').replace("'", "")
    if os.getenv("OPENAI_API_KEY") is None and os.getenv("GROQ_API_KEY") is None and use_ollama != "true":
        if pydantic_object:
            return MockParser(pydantic_object)
        else:
            return RunnableLambda(lambda x: {})
    
    if pydantic_object:
        return JsonOutputParser(pydantic_object=pydantic_object)
    return JsonOutputParser()
