import os
import re
import tempfile
import zipfile

# Parsers
import pypdf
from docx import Document
from PIL import Image
from sarvamai import SarvamAI
from langchain_text_splitters import RecursiveCharacterTextSplitter

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


# ============================================================
# Section-Aware Parsing
# ============================================================

# Regex patterns for common legal document section headers
_SECTION_PATTERNS = [
    # Numbered sections: "1.", "1.1", "Section 1", "SECTION 1"
    re.compile(r"^(?:Section|SECTION)\s+\d+[\.\:]?\s*.*$", re.MULTILINE),
    re.compile(r"^\d+\.\d*\s+[A-Z].*$", re.MULTILINE),
    # ARTICLE patterns: "ARTICLE I", "ARTICLE 1", "Article III"
    re.compile(r"^(?:ARTICLE|Article)\s+[IVXLCDM\d]+[\.\:]?\s*.*$", re.MULTILINE),
    # All-caps lines (likely headings, at least 3 chars, at most 120)
    re.compile(r"^[A-Z][A-Z\s\-\&\,]{2,119}$", re.MULTILINE),
    # Common legal headers
    re.compile(r"^(?:WHEREAS|NOW THEREFORE|IN WITNESS WHEREOF|SCHEDULE|ANNEXURE|APPENDIX|EXHIBIT|PART)\s*.*$", re.MULTILINE | re.IGNORECASE),
    # Clause patterns: "Clause 1", "(a)", "(i)"
    re.compile(r"^(?:Clause|CLAUSE)\s+\d+[\.\:]?\s*.*$", re.MULTILINE),
]

# Sub-split fallback settings
_MAX_SECTION_CHARS = 3000
_MIN_SECTION_CHARS = 100
_FALLBACK_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=200)


def _detect_section_boundaries(text: str) -> list[dict]:
    """
    Detect section boundaries in text using regex heuristics.
    Returns list of {title, start, end, number} sorted by start position.
    """
    boundaries: list[dict] = []

    for pattern in _SECTION_PATTERNS:
        for m in pattern.finditer(text):
            title = m.group(0).strip()
            # Skip very short matches that are likely false positives
            if len(title) < 3:
                continue
            # Skip lines that are just numbers
            if title.replace(".", "").replace(" ", "").isdigit():
                continue
            boundaries.append({
                "title": title,
                "start": m.start(),
            })

    # Deduplicate overlapping boundaries (keep earliest at each position)
    seen_starts: set[int] = set()
    unique: list[dict] = []
    for b in sorted(boundaries, key=lambda x: x["start"]):
        if b["start"] not in seen_starts:
            seen_starts.add(b["start"])
            unique.append(b)

    return unique


def _extract_section_number(title: str) -> str:
    """Try to extract a section number from a title string."""
    m = re.match(r"(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE)\s+([IVXLCDM\d]+[\.\d]*)", title, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.match(r"^(\d+[\.\d]*)\s+", title)
    if m:
        return m.group(1)
    return ""


def parse_text_sections(text: str) -> list[dict]:
    """
    Split text into section-aware chunks.

    Returns list of dicts:
        {text, section_title, section_number, parent_section}

    For sections > MAX chars, sub-splits using RecursiveCharacterTextSplitter.
    For sections < MIN chars, merges with adjacent sections.
    """
    if not text or not text.strip():
        return []

    boundaries = _detect_section_boundaries(text)

    # If no structure detected, fall back to simple splitting
    if len(boundaries) < 2:
        chunks = _FALLBACK_SPLITTER.split_text(text)
        return [{"text": c, "section_title": "", "section_number": "", "parent_section": ""} for c in chunks]

    # Build raw sections from boundaries
    raw_sections: list[dict] = []
    for i, b in enumerate(boundaries):
        start = b["start"]
        end = boundaries[i + 1]["start"] if i + 1 < len(boundaries) else len(text)
        section_text = text[start:end].strip()
        if section_text:
            raw_sections.append({
                "text": section_text,
                "section_title": b["title"],
                "section_number": _extract_section_number(b["title"]),
            })

    # Prepend text before first section (preamble)
    if boundaries[0]["start"] > 0:
        preamble = text[:boundaries[0]["start"]].strip()
        if preamble:
            raw_sections.insert(0, {
                "text": preamble,
                "section_title": "Preamble",
                "section_number": "",
            })

    # Merge small sections with next section
    merged: list[dict] = []
    buffer = None
    for sec in raw_sections:
        if buffer:
            buffer["text"] += "\n\n" + sec["text"]
            # Use the later section's title if the buffer was a stub
            if len(buffer["section_title"]) < len(sec["section_title"]):
                buffer["section_title"] = sec["section_title"]
                buffer["section_number"] = sec["section_number"]
            if len(buffer["text"]) >= _MIN_SECTION_CHARS:
                merged.append(buffer)
                buffer = None
        elif len(sec["text"]) < _MIN_SECTION_CHARS:
            buffer = dict(sec)
        else:
            merged.append(sec)

    if buffer:
        if merged:
            merged[-1]["text"] += "\n\n" + buffer["text"]
        else:
            merged.append(buffer)

    # Sub-split oversized sections
    final: list[dict] = []
    for sec in merged:
        if len(sec["text"]) > _MAX_SECTION_CHARS:
            sub_chunks = _FALLBACK_SPLITTER.split_text(sec["text"])
            for j, sc in enumerate(sub_chunks):
                final.append({
                    "text": sc,
                    "section_title": sec["section_title"],
                    "section_number": sec["section_number"],
                    "parent_section": sec["section_title"] if j > 0 else "",
                })
        else:
            final.append({
                "text": sec["text"],
                "section_title": sec["section_title"],
                "section_number": sec["section_number"],
                "parent_section": "",
            })

    return final


def parse_docx_sections(file_path: str) -> list[dict]:
    """
    Parse a DOCX file using paragraph styles to identify sections.
    Uses Heading styles (Heading 1, Heading 2, etc.) as section markers.
    """
    try:
        doc = Document(file_path)
    except Exception as e:
        print(f"Error reading DOCX {file_path}: {e}")
        return []

    sections: list[dict] = []
    current_title = ""
    current_number = ""
    current_text_parts: list[str] = []

    def flush_section():
        nonlocal current_text_parts, current_title, current_number
        text = "\n".join(current_text_parts).strip()
        if text:
            sections.append({
                "text": text,
                "section_title": current_title,
                "section_number": current_number,
                "parent_section": "",
            })
        current_text_parts = []

    for para in doc.paragraphs:
        style_name = (para.style.name or "").lower() if para.style else ""
        is_heading = "heading" in style_name

        if is_heading and para.text.strip():
            flush_section()
            current_title = para.text.strip()
            current_number = _extract_section_number(current_title)
            current_text_parts.append(para.text)
        else:
            if para.text.strip():
                current_text_parts.append(para.text)

    flush_section()

    # If no headings found, fall back to text-based section detection
    if len(sections) < 2:
        full_text = "\n".join(p.text for p in doc.paragraphs)
        return parse_text_sections(full_text)

    # Handle oversized / undersized sections same as text parser
    final: list[dict] = []
    buffer = None
    for sec in sections:
        if buffer:
            buffer["text"] += "\n\n" + sec["text"]
            if len(buffer["text"]) >= _MIN_SECTION_CHARS:
                final.append(buffer)
                buffer = None
        elif len(sec["text"]) < _MIN_SECTION_CHARS:
            buffer = dict(sec)
        else:
            final.append(sec)
    if buffer:
        if final:
            final[-1]["text"] += "\n\n" + buffer["text"]
        else:
            final.append(buffer)

    result: list[dict] = []
    for sec in final:
        if len(sec["text"]) > _MAX_SECTION_CHARS:
            sub_chunks = _FALLBACK_SPLITTER.split_text(sec["text"])
            for j, sc in enumerate(sub_chunks):
                result.append({
                    "text": sc,
                    "section_title": sec["section_title"],
                    "section_number": sec["section_number"],
                    "parent_section": sec["section_title"] if j > 0 else "",
                })
        else:
            result.append(sec)

    return result


def parse_file_sections(file_path: str) -> list[dict]:
    """
    Parse any supported file into section-aware chunks.

    Returns list of dicts with keys:
        text, section_title, section_number, parent_section, page_number (optional), file_type
    """
    ext = os.path.splitext(file_path)[1].lower()
    file_type = get_file_type(file_path)

    if ext in [".docx", ".doc"]:
        sections = parse_docx_sections(file_path)
        for s in sections:
            s["file_type"] = file_type
        return sections if sections else [{"text": "", "section_title": "", "section_number": "", "parent_section": "", "file_type": file_type}]

    if ext == ".pdf":
        # For PDFs, combine all page text then do section detection
        pages = load_pdf_with_pages(file_path)
        page_texts = []
        page_offsets = []  # (start_offset, page_number) for mapping chunks back to pages
        offset = 0
        for p in pages:
            t = p.get("text", "")
            page_offsets.append((offset, p.get("page_number", 1)))
            page_texts.append(t)
            offset += len(t) + 1  # +1 for newline join

        if not page_texts:
            # Fallback to OCR text
            text = parse_file(file_path)
            sections = parse_text_sections(text)
            for s in sections:
                s["file_type"] = file_type
            return sections

        full_text = "\n".join(page_texts)
        sections = parse_text_sections(full_text)

        # Map each section chunk to its most likely page number
        for sec in sections:
            sec["file_type"] = file_type
            # Find which page this chunk's start falls in
            chunk_start = full_text.find(sec["text"][:80]) if sec["text"] else 0
            if chunk_start < 0:
                chunk_start = 0
            best_page = 1
            for po_start, po_page in reversed(page_offsets):
                if chunk_start >= po_start:
                    best_page = po_page
                    break
            sec["page_number"] = best_page

        return sections

    # TXT, images, and other formats
    text = parse_file(file_path)
    sections = parse_text_sections(text)
    for s in sections:
        s["file_type"] = file_type
    return sections if sections else [{"text": "", "section_title": "", "section_number": "", "parent_section": "", "file_type": file_type}]
