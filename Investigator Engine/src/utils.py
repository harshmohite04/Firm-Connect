import os
import time
import logging
from typing import List, Dict, Any, Optional

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

logger = logging.getLogger("investigator_engine")

# ============================================================
# Formatting Helpers
# ============================================================

def format_hypotheses(hypotheses: List[Dict[str, Any]]) -> str:
    """Format hypotheses list into structured readable text."""
    if not hypotheses:
        return "No hypotheses generated yet."
    lines = []
    for i, h in enumerate(hypotheses):
        desc = h.get("description", "Unknown hypothesis")
        supporting = h.get("supporting_facts", [])
        lines.append(f"Hypothesis {i+1}: {desc}")
        if supporting:
            lines.append(f"  Supporting facts: {', '.join(str(s) for s in supporting)}")
    return "\n".join(lines)


def format_facts(facts: List[Dict[str, Any]]) -> str:
    """Format facts list into structured readable text."""
    if not facts:
        return "No facts extracted yet."
    lines = []
    for f in facts:
        fid = f.get("id", "?")
        desc = f.get("description", "")
        source = f.get("source_doc_id", "Unknown")
        conf = f.get("confidence", 0.0)
        quote = f.get("source_quote", "")
        line = f"- [{fid}] {desc} (Source: {source}, Confidence: {conf})"
        if quote:
            line += f'\n  Quote: "{quote[:200]}"'
        lines.append(line)
    return "\n".join(lines)


def format_challenges(challenges: List[Dict[str, Any]]) -> str:
    """Format challenges list into structured readable text."""
    if not challenges:
        return "No challenges identified."
    lines = []
    for i, c in enumerate(challenges):
        desc = c.get("description") or c.get("challenge") or c.get("issue") or str(c)
        severity = c.get("severity") or c.get("level") or "MEDIUM"
        lines.append(f"- [{severity}] {desc}")
    return "\n".join(lines)


def format_evidence_gaps(gaps: List[Dict[str, Any]]) -> str:
    """Format evidence gaps into structured readable text."""
    if not gaps:
        return "No evidence gaps identified."
    lines = []
    for g in gaps:
        desc = g.get("description", "Unknown gap")
        importance = g.get("importance", "MEDIUM")
        lines.append(f"- [{importance}] {desc}")
    return "\n".join(lines)


def format_timeline(timeline: List[Dict[str, Any]]) -> str:
    """Format timeline into structured readable text."""
    if not timeline:
        return "No timeline events."
    lines = []
    for event in timeline:
        date = event.get("date", "Unknown date")
        desc = event.get("event") or event.get("description", "")
        lines.append(f"- {date}: {desc}")
    return "\n".join(lines)


def format_legal_issues(issues: List[Dict[str, Any]]) -> str:
    """Format legal issues into structured readable text."""
    if not issues:
        return "No legal issues identified."
    lines = []
    for i, issue in enumerate(issues):
        desc = issue.get("description", "Unknown issue")
        laws = issue.get("relevant_laws", [])
        precedents = issue.get("precedents", [])
        lines.append(f"{i+1}. {desc}")
        if laws:
            lines.append(f"   Laws: {', '.join(laws)}")
        if precedents:
            lines.append(f"   Precedents: {', '.join(precedents)}")
    return "\n".join(lines)


def format_risks(risks: List[Dict[str, Any]]) -> str:
    """Format risks into structured readable text."""
    if not risks:
        return "No risks identified."
    lines = []
    for r in risks:
        desc = r.get("description", "Unknown risk")
        impact = r.get("impact", "Unknown")
        mitigation = r.get("mitigation", "N/A")
        lines.append(f"- {desc} (Impact: {impact}, Mitigation: {mitigation})")
    return "\n".join(lines)


# ============================================================
# Smart Truncation
# ============================================================

def smart_truncate(text: str, max_chars: int = 4000) -> str:
    """Truncate text at line boundaries with a truncation indicator."""
    if not text or len(text) <= max_chars:
        return text or ""

    # Find the last newline before the limit
    truncated = text[:max_chars]
    last_newline = truncated.rfind("\n")
    if last_newline > max_chars * 0.5:
        truncated = truncated[:last_newline]

    omitted = len(text) - len(truncated)
    return truncated + f"\n... [Truncated: ~{omitted} characters omitted]"


# ============================================================
# Adaptive Rate Limiter
# ============================================================

class AdaptiveRateLimiter:
    """Rate limiter with configurable delay via LLM_RATE_LIMIT_SECONDS env var."""

    def __init__(self):
        self._delay = float(os.getenv("LLM_RATE_LIMIT_SECONDS", "2"))
        self._last_call = 0.0

    def wait(self):
        """Wait the configured delay between LLM calls."""
        now = time.time()
        elapsed = now - self._last_call
        if elapsed < self._delay:
            sleep_time = self._delay - elapsed
            logger.debug(f"Rate limiter: sleeping {sleep_time:.1f}s")
            time.sleep(sleep_time)
        self._last_call = time.time()


# Global rate limiter instance
rate_limiter = AdaptiveRateLimiter()


# ============================================================
# LLM Provider Setup
# ============================================================

# Model tier mapping via environment variables
# LLM_TIER_FAST, LLM_TIER_STANDARD, LLM_TIER_POWERFUL
_TIER_DEFAULTS = {
    "fast": "LLM_TIER_FAST",
    "standard": "LLM_TIER_STANDARD",
    "powerful": "LLM_TIER_POWERFUL",
}

def mock_llm_func(input_val):
    print("  [MockLLM] Processing request...")
    return AIMessage(content="{}")

def get_llm(model_name: str = "openai/gpt-oss-120b", task_tier: str = "standard"):
    """
    Get an LLM instance.

    task_tier: "fast" (extraction), "standard" (analysis), "powerful" (synthesis)
    The tier can override the model via env vars LLM_TIER_FAST, LLM_TIER_STANDARD, LLM_TIER_POWERFUL.
    """
    # Check tier-based override from environment
    tier_env_key = _TIER_DEFAULTS.get(task_tier)
    if tier_env_key:
        tier_model = os.getenv(tier_env_key)
        if tier_model:
            model_name = tier_model

    # Check for Ollama preference
    use_ollama = str(os.getenv("USE_OLLAMA", "")).lower().replace('"', '').replace("'", "")
    if use_ollama == "true":
        if ChatOllama is None:
            print("Warning: langchain_ollama not installed. Falling back to other providers.")
        else:
            target_model = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
            return ChatOllama(model=target_model, temperature=0.1)

    # USE_OPENAI toggle (shared with utils/llm.py factory)
    use_openai_toggle = os.getenv("USE_OPENAI", "false").lower().strip() == "true"
    if use_openai_toggle:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            target_model = os.getenv("OPENAI_MODEL", "gpt-4o")
            return ChatOpenAI(model=target_model, api_key=api_key, temperature=0.1)

    # Check for DeepSeek
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    if deepseek_api_key:
        target_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        if model_name != "gpt-4-turbo" and model_name != "openai/gpt-oss-120b":
             target_model = model_name

        return ChatOpenAI(
            model=target_model,
            api_key=deepseek_api_key,
            base_url="https://api.deepseek.com",
            temperature=0.1
        )

    # Check for Groq next
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        target_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        if model_name != "gpt-4-turbo" and model_name != "openai/gpt-oss-120b":
             target_model = model_name

        return ChatGroq(model_name=target_model, temperature=0.1)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("Warning: No API Keys (DEEPSEEK/GROQ/OPENAI) and USE_OLLAMA not set. Using MOCK LLM.")
        return RunnableLambda(mock_llm_func)

    return ChatOpenAI(model=model_name, temperature=0.1)


def get_llm_with_retry(model_name: str = "openai/gpt-oss-120b", task_tier: str = "standard"):
    """Get an LLM instance with automatic retry on transient failures."""
    llm = get_llm(model_name=model_name, task_tier=task_tier)

    # Only apply .with_retry() if the LLM supports it (not mock)
    if hasattr(llm, "with_retry"):
        return llm.with_retry(
            stop_after_attempt=3,
            wait_exponential_jitter=True,
        )
    return llm


# ============================================================
# Mock Parser (for testing without API keys)
# ============================================================

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
    if os.getenv("OPENAI_API_KEY") is None and os.getenv("GROQ_API_KEY") is None and os.getenv("DEEPSEEK_API_KEY") is None and use_ollama != "true":
        if pydantic_object:
            return MockParser(pydantic_object)
        else:
            return RunnableLambda(lambda x: {})

    if pydantic_object:
        return JsonOutputParser(pydantic_object=pydantic_object)
    return JsonOutputParser()
