import os
import io
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

def generate_report(text_content: str, source_type: str = "Audio Transcript") -> str:
    """
    Generates a professional report/summary from the provided text using Groq.
    """
    if not client:
        return "Error: Groq API Key not configured."

    if not text_content or not text_content.strip():
        return "Error: No text content to report on."

    prompt = f"""
    You are a professional legal and medical analyst for a Law Firm. 
    Analyze the following {source_type} and generate a detailed, structured report.
    
    Structure the report as follows:
    1. **Executive Summary**: Brief overview of the content.
    2. **Key Entities**: Names, Dates, Locations mentioned.
    3. **Key Details**: Bulleted list of important facts.
    4. **Action Items/Next Steps**: Derived from the context.
    5. **Full Analysis**: A comprehensive paragraph summarizing the situation.

    Here is the content:
    {text_content}
    """

    try:
        completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that generates structured reports."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama3-8b-8192", # Using a fast, capable model
            temperature=0.3,
        )

        return completion.choices[0].message.content

    except Exception as e:
        print(f"Error generating report: {e}")
        return f"Error generating report: {str(e)}"
