import os
import io
from typing import Optional

import shutil

# Parsers
import pypdf
from docx import Document
from PIL import Image
import pytesseract

# New imports for Zip and Audio
import zipfile
import tempfile
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Configure Tesseract Path for Windows if not in PATH
TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if not shutil.which("tesseract") and os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

def load_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def load_pdf_file(file_path: str) -> str:
    text = ""
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return ""
    return text

def load_docx_file(file_path: str) -> str:
    text = ""
    try:
        doc = Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX {file_path}: {e}")
        return ""
    return text

def load_image_file(file_path: str) -> str:
    """
    Requires Tesseract to be installed on the system and in PATH.
    """
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print(f"Error performing OCR on {file_path}: {e}")
        if "tesseract is not installed" in str(e).lower() or "not found" in str(e).lower():
            return "OCR Failed: Tesseract binary not found on server. Please install Tesseract-OCR."
        return ""

def load_zip_file(file_path: str) -> str:
    """
    Extracts zip file to a temp dir, recursively parses all supported files inside,
    concatenates their text, and cleans up.
    """
    text_content = []
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            # Extract all
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            
            # Walk through extracted files
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_p = os.path.join(root, file)
                    # Ignore hidden files or macOS metadata
                    if file.startswith(".") or "__MACOSX" in file_p:
                        continue
                        
                    # Recurse: call parse_file on extracted items
                    # We pass the full path. The logic in parse_file handles picking the right loader.
                    extracted_text = parse_file(file_p)
                    
                    if extracted_text and not extracted_text.startswith("Unsupported"):
                        text_content.append(f"\n--- FILE: {file} ---\n")
                        text_content.append(extracted_text)
            
            final_text = "\n".join(text_content)
            if not final_text.strip():
                return "Zip file was empty or contained no supported readable files."
            return final_text

    except Exception as e:
        print(f"Error processing ZIP {file_path}: {e}")
        return f"Error processing ZIP file: {str(e)}"

def load_audio_file(file_path: str) -> str:
    """
    Transcribes audio using Groq Whisper API. 
    Requires GROQ_API_KEY in env.
    """
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            return "Error: GROQ_API_KEY not found. Cannot transcribe audio."

        client = Groq(api_key=api_key)
        
        with open(file_path, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(file_path), file.read()),
                model="whisper-large-v3",
                response_format="json",
                language="en", 
                temperature=0.0
            )
        
        return f"[Audio Transcription]\n{transcription.text}"

    except Exception as e:
        print(f"Error transcribing audio {file_path}: {e}")
        return f"Error transcribing audio: {str(e)}"

def parse_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".txt":
        return load_text_file(file_path)
    elif ext == ".pdf":
        return load_pdf_file(file_path)
    elif ext in [".docx", ".doc"]:
        return load_docx_file(file_path)
    elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
        return load_image_file(file_path)
    elif ext == ".zip":
        return load_zip_file(file_path)
    elif ext in [".mp3", ".wav", ".m4a", ".ogg", ".mpeg"]:
        return load_audio_file(file_path)
    else:
        # Fallback to text
        try:
            return load_text_file(file_path)
        except:
            return f"Unsupported file format: {ext}"
