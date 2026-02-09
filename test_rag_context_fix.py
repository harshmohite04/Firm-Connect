import sys
import os
from rag.rag import ask

# Simple test query to check the persona
query = "Who are you and what do you do?"
case_id = "test_case_123" # Dummy case ID

print(f"Query: {query}")
try:
    result = ask(query, case_id)
    print("\nResponse:")
    print(result.answer)
except Exception as e:
    print(f"Error: {e}")
