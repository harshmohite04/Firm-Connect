import os
import re
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

# Parsers
import pypdf
from docx import Document
from PIL import Image
from sarvamai import SarvamAI

SARVAM_MAX_PAGES = 10


def _clean_ocr_markdown(text: str) -> str:
    """Strip OCR markdown noise to reduce chunk bloat."""
    text = re.sub(r'!\[.*?\]\(.*?\)', '', text)
    text = re.sub(r'^[-*_]{3,}\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


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
                        page_text = _clean_ocr_markdown(zf.read(name).decode("utf-8"))
                        text += page_text + "\n"

            return text.strip() if text.strip() else ""

    except Exception as e:
        print(f"Sarvam OCR error for {file_path}: {e}")
        return f"OCR Failed: {e}"
    finally:
        if tmp_pdf_path and os.path.exists(tmp_pdf_path):
            os.unlink(tmp_pdf_path)


def _sarvam_ocr_pages(file_path: str) -> list[str]:
    """Extract text from a PDF using Sarvam, returning a list of per-page texts."""
    api_key = _get_sarvam_key()
    if not api_key:
        print("SARVAM_API_KEY is not set.")
        return []

    try:
        client = SarvamAI(api_subscription_key=api_key)
        job = client.document_intelligence.create_job(
            language="en-IN",
            output_format="md",
        )
        job.upload_file(file_path)
        job.start()
        job.wait_until_complete()

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = os.path.join(tmp_dir, "output.zip")
            job.download_output(output_path)

            page_texts = []
            with zipfile.ZipFile(output_path, "r") as zf:
                for name in sorted(zf.namelist()):
                    if name.endswith(".md"):
                        page_texts.append(_clean_ocr_markdown(zf.read(name).decode("utf-8")))
            return page_texts

    except Exception as e:
        print(f"Sarvam OCR pages error for {file_path}: {e}")
        return []


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

    # Otherwise fall back to Sarvam for scanned PDFs (with chunking support)
    print(f"PDF appears to be scanned, falling back to Sarvam OCR: {file_path}")
    pages = load_pdf_with_pages(file_path, force_ocr=True)
    return "\n".join(p["text"] for p in pages) if pages else ""


def _ocr_chunk(reader_pages, chunk_start, chunk_end):
    """OCR a subset of pages. Returns (chunk_start, list_of_texts)."""
    writer = pypdf.PdfWriter()
    for pg in range(chunk_start, chunk_end):
        writer.add_page(reader_pages[pg])

    fd, chunk_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    try:
        with open(chunk_path, "wb") as f:
            writer.write(f)
        print(f"[Sarvam OCR] Processing chunk pages {chunk_start + 1}-{chunk_end}...")
        return (chunk_start, _sarvam_ocr_pages(chunk_path))
    except Exception as e:
        print(f"[Sarvam OCR] Chunk {chunk_start + 1}-{chunk_end} failed: {e}")
        return (chunk_start, [])
    finally:
        if os.path.exists(chunk_path):
            os.unlink(chunk_path)


def load_pdf_with_pages(file_path: str, force_ocr: bool = False) -> list[dict]:
    """Load PDF returning per-page chunks with page numbers."""
    if force_ocr:
        print(f"User marked as scanned, using Sarvam OCR: {file_path}")
        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)
        print(f"[Sarvam OCR] PDF has {total_pages} pages (max per job: {SARVAM_MAX_PAGES})")

        if total_pages <= SARVAM_MAX_PAGES:
            page_texts = _sarvam_ocr_pages(file_path)
            return [{"text": t, "page_number": i + 1} for i, t in enumerate(page_texts) if t.strip()]

        # Submit all chunks in parallel (max 3 concurrent Sarvam jobs)
        all_pages = []
        chunks_ranges = [
            (chunk_start, min(chunk_start + SARVAM_MAX_PAGES, total_pages))
            for chunk_start in range(0, total_pages, SARVAM_MAX_PAGES)
        ]

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(_ocr_chunk, reader.pages, start, end): (start, end)
                for start, end in chunks_ranges
            }
            for future in as_completed(futures):
                chunk_start, chunk_texts = future.result()
                for i, text in enumerate(chunk_texts):
                    if text.strip():
                        all_pages.append({"text": text, "page_number": chunk_start + i + 1})

        # Sort by page number since parallel execution returns in arbitrary order
        all_pages.sort(key=lambda p: p["page_number"])
        return all_pages

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


def parse_file_with_pages(file_path: str, force_ocr: bool = False) -> list[dict]:
    """
    Parse a file returning a list of dicts with keys: text, page_number (optional), file_type.
    For PDFs, returns per-page entries. For others, returns a single entry.
    """
    ext = os.path.splitext(file_path)[1].lower()
    file_type = get_file_type(file_path)

    if ext == ".pdf":
        pages = load_pdf_with_pages(file_path, force_ocr=force_ocr)
        for p in pages:
            p["file_type"] = file_type
        return pages if pages else [{"text": "", "file_type": file_type}]
    else:
        text = parse_file(file_path)
        return [{"text": text, "file_type": file_type}]
