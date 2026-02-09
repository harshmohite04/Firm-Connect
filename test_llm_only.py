
import os
import sys
from dotenv import load_dotenv
from neo4j_graphrag.llm import OpenAILLM

# Load env vars
load_dotenv()

api_key = os.getenv("DEEPSEEK_API_KEY")
model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

print(f"Testing Deepseek LLM: {model}")

try:
    llm = OpenAILLM(
        model_name=model,
        model_params={"temperature": 0.1},
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )

    response = llm.invoke("Say 'Deepseek is working' and nothing else.")
    print(f"Response: {response.content}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
