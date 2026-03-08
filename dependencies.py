import os
import sys
import importlib.util
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address
from investigation.generator import DocumentGenerator

limiter = Limiter(key_func=get_remote_address)
generator = DocumentGenerator()

# --- Investigator Engine Import Setup ---
investigator_path = Path(__file__).parent / "Investigator Engine"
sys.path.append(str(investigator_path))

try:
    from src.state import InvestigatorState
    spec = importlib.util.spec_from_file_location("investigator_main", investigator_path / "main.py")
    investigator_main = importlib.util.module_from_spec(spec)
    sys.modules["investigator_main"] = investigator_main
    spec.loader.exec_module(investigator_main)
    create_graph = investigator_main.create_graph
except ImportError as e:
    print(f"Warning: Could not import Investigator Engine: {e}")
    create_graph = None
    InvestigatorState = None

INDIAN_KANOON_API_TOKEN = os.getenv("INDIAN_KANOON_API_TOKEN", "")
INDIAN_KANOON_BASE_URL = "https://api.indiankanoon.org"
