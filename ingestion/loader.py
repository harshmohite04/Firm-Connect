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


def load_pdf_with_pages(file_path: str) -> list[dict]:
    """Load PDF returning per-page chunks with page numbers."""
    pages = []
    try:
        reader = pypdf.PdfReader(file_path)
        for i, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                pages.append({"text": page_text, "page_number": i})
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
    return pages

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


def get_file_type(file_path: str) -> str:
    """Return a human-readable file type label."""
    ext = os.path.splitext(file_path)[1].lower()
    type_map = {
        ".pdf": "PDF",
        ".txt": "Text",
        ".docx": "Word", ".doc": "Word",
        ".jpg": "Image/OCR", ".jpeg": "Image/OCR",
        ".png": "Image/OCR", ".bmp": "Image/OCR", ".tiff": "Image/OCR",
    }
    return type_map.get(ext, "Other")


def parse_file_with_pages(file_path: str) -> list[dict]:
    """
    Parse a file returning a list of dicts with keys: text, page_number (optional), file_type.
    For PDFs, returns per-page entries. For others, returns a single entry.
    """
    ext = os.path.splitext(file_path)[1].lower()
    file_type = get_file_type(file_path)

    if ext == ".pdf":
        pages = load_pdf_with_pages(file_path)
        for p in pages:
            p["file_type"] = file_type
        return pages if pages else [{"text": "", "file_type": file_type}]
    else:
        text = parse_file(file_path)
        return [{"text": text, "file_type": file_type}]
