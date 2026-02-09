
import sys
import os
# Add current directory to path so we can import rag
sys.path.append(os.getcwd())

from rag.rag import ask

if __name__ == "__main__":
    print("Testing Deepseek RAG integration...")
    try:
        # Use a dummy case_id. If no docs, it might return mock or empty.
        # But we want to see if LLM is initialized and called (even if context is empty).
        result = ask("What is the capital of France?", "test_case_001")
        print("\nTest Result:", result.answer)
    except Exception as e:
        print(f"\nTest Failed: {e}")
        import traceback
        traceback.print_exc()
