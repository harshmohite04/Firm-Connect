import sys
import os
import json
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
# Adjust path to point to root .env file which is 3 levels up from src/utils
# backend/src/utils -> backend/src -> backend -> root
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
load_dotenv(dotenv_path)

def transcribe_audio(file_path):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY not found in environment"}

    client = Groq(api_key=api_key)

    try:
        # 1. Transcribe Audio
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(file_path), file.read()),
                model="distil-whisper-large-v3-en",
                response_format="json",
                temperature=0.0
            )
        
        raw_text = transcription.text

        # 2. Format with LLM
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a professional legal transcriptionist. Format the following raw audio transcript into a clean, well-structured document. Use headings, bullet points, and speaker labels (if discernable) to make it readable and professional. Do NOT add any preamble or conversational text, just output the formatted document in Markdown."
                },
                {
                    "role": "user", 
                    "content": f"Raw Transcript:\n\n{raw_text}"
                }
            ],
            temperature=0.3,
            max_tokens=4096,
        )

        formatted_text = completion.choices[0].message.content

        return {
            "success": True,
            "raw_transcript": raw_text,
            "formatted_transcript": formatted_text
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    result = transcribe_audio(file_path)
    print(json.dumps(result))
