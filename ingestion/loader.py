import os
import io
from typing import Optional

import shutil

# Parsers
import pypdf
from docx import Document
from PIL import Image
import pytesseract

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
    else:
        # Fallback to text
        try:
            return load_text_file(file_path)
        except:
            return f"Unsupported file format: {ext}"
