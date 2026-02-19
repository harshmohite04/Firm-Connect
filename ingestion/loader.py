import os
import tempfile
import zipfile

# Parsers
import pypdf
from docx import Document
from PIL import Image
from sarvamai import SarvamAI

def _get_sarvam_key():
    return os.getenv("SARVAM_API_KEY", "")

def load_text_file(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def _sarvam_ocr(file_path: str) -> str:
    """Extract text from an image or scanned PDF using Sarvam Document Intelligence."""
    api_key = _get_sarvam_key()
    if not api_key:
        return "OCR Failed: SARVAM_API_KEY is not set. Please add it to your .env file."

    tmp_pdf_path = None
    try:
        client = SarvamAI(api_subscription_key=api_key)

        # Convert image files to PDF since Sarvam only accepts PDF/ZIP
        upload_path = file_path
        ext = os.path.splitext(file_path)[1].lower()
        if ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
            img = Image.open(file_path).convert("RGB")
            fd, tmp_pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd)
            img.save(tmp_pdf_path, "PDF")
            upload_path = tmp_pdf_path

        # Create a document intelligence job
        job = client.document_intelligence.create_job(
            language="en-IN",
            output_format="md",
        )

        # Upload the file, start, and wait for completion
        job.upload_file(upload_path)
        job.start()
        job.wait_until_complete()

        # Download output to a temp directory
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = os.path.join(tmp_dir, "output.zip")
            job.download_output(output_path)

            # Extract markdown text from the ZIP
            text = ""
            with zipfile.ZipFile(output_path, "r") as zf:
                for name in sorted(zf.namelist()):
                    if name.endswith(".md"):
                        text += zf.read(name).decode("utf-8") + "\n"

            return text.strip() if text.strip() else ""

    except Exception as e:
        print(f"Sarvam OCR error for {file_path}: {e}")
        return f"OCR Failed: {e}"
    finally:
        if tmp_pdf_path and os.path.exists(tmp_pdf_path):
            os.unlink(tmp_pdf_path)


def load_pdf_file(file_path: str) -> str:
    # First try pypdf for digital/text-based PDFs
    text = ""
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")

    # If pypdf got meaningful text, return it
    if text.strip() and len(text.strip()) > 50:
        return text

    # Otherwise fall back to Sarvam for scanned PDFs
    print(f"PDF appears to be scanned, falling back to Sarvam OCR: {file_path}")
    return _sarvam_ocr(file_path)


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
    """Extract text from an image file using Sarvam Document Intelligence."""
    return _sarvam_ocr(file_path)

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
