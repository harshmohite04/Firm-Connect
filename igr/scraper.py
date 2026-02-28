"""
IGR Maharashtra Web Scraper
Handles search and PDF download from Maharashtra IGR websites.

NOTE: The Maharashtra government IGR website URL may change. Common URLs include:
- https://mahabhumi.maharashtra.gov.in (current as of 2024)
- https://freesearchigrservice.maharashtra.gov.in (older)

Configure via environment variables:
- IGR_BASE_URL: Base URL of the IGR service
- IGR_SEARCH_URL: Full search endpoint URL
"""

import httpx
import asyncio
import os
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from datetime import datetime
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# IGR Maharashtra website constants
# Official IGR website: https://igrmaharashtra.gov.in/
IGR_BASE_URL = os.getenv("IGR_BASE_URL", "https://igrmaharashtra.gov.in")
IGR_SEARCH_URL = os.getenv("IGR_SEARCH_URL", f"{IGR_BASE_URL}/eservices/searchDocument")

IGR_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Maharashtra districts
MAHARASHTRA_DISTRICTS = [
    "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
    "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
    "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
    "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmananad", "Palghar",
    "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
    "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
]


class IGRRecord:
    """Represents a single IGR search result record."""

    def __init__(self, **kwargs):
        self.doc_number = kwargs.get("doc_number", "")
        self.year = kwargs.get("year", 0)
        self.district = kwargs.get("district", "")
        self.taluka = kwargs.get("taluka", "")
        self.village = kwargs.get("village", "")
        self.party_name_1 = kwargs.get("party_name_1", "")
        self.party_name_2 = kwargs.get("party_name_2", "")
        self.property_description = kwargs.get("property_description", "")
        self.consideration_amount = kwargs.get("consideration_amount", None)
        self.registration_date = kwargs.get("registration_date", None)
        self.doc_type = kwargs.get("doc_type", "")  # Sale Deed, Mortgage Deed, Index II, etc.
        self.pdf_url = kwargs.get("pdf_url", None)

    def to_dict(self) -> Dict:
        """Convert record to dictionary for JSON serialization."""
        return {
            "doc_number": self.doc_number,
            "year": self.year,
            "district": self.district,
            "taluka": self.taluka,
            "village": self.village,
            "party_name_1": self.party_name_1,
            "party_name_2": self.party_name_2,
            "property_description": self.property_description,
            "consideration_amount": self.consideration_amount,
            "registration_date": self.registration_date,
            "doc_type": self.doc_type,
            "pdf_url": self.pdf_url,
        }


async def search_igr(
    district: str,
    taluka: str,
    year_from: int,
    year_to: int,
    party_name: str = "",
    survey_number: str = "",
    timeout: int = 30
) -> List[Dict]:
    """
    Search for property documents on IGR Maharashtra website.

    Args:
        district: District name (e.g., "Pune")
        taluka: Taluka/Tahsil name
        year_from: Starting year for search
        year_to: Ending year for search
        party_name: Party name (optional, fuzzy match)
        survey_number: Survey number (optional)
        timeout: Request timeout in seconds

    Returns:
        List of IGRRecord dictionaries
    """
    try:
        headers = {
            "User-Agent": IGR_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": IGR_SEARCH_URL,
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        async with httpx.AsyncClient(headers=headers, timeout=timeout) as client:
            # Step 1: GET the search page to capture ViewState and CSRF token
            logger.info(f"Fetching IGR search page for {district}/{taluka}")
            search_page = await client.get(IGR_SEARCH_URL)
            search_page.raise_for_status()

            soup = BeautifulSoup(search_page.content, "html.parser")

            # Extract __VIEWSTATE and __EVENTVALIDATION if they exist (WebForms)
            viewstate = ""
            eventvalidation = ""

            viewstate_input = soup.find("input", {"name": "__VIEWSTATE"})
            if viewstate_input:
                viewstate = viewstate_input.get("value", "")

            eventval_input = soup.find("input", {"name": "__EVENTVALIDATION"})
            if eventval_input:
                eventvalidation = eventval_input.get("value", "")

            # Step 2: Prepare POST data for search
            search_payload = {
                "ctl00$MainContent$ddlDistrict": district,
                "ctl00$MainContent$ddlTaluka": taluka,
                "ctl00$MainContent$ddlFromYear": str(year_from),
                "ctl00$MainContent$ddlToYear": str(year_to),
            }

            if party_name:
                search_payload["ctl00$MainContent$txtPartyName"] = party_name
            if survey_number:
                search_payload["ctl00$MainContent$txtSurveyNumber"] = survey_number

            if viewstate:
                search_payload["__VIEWSTATE"] = viewstate
            if eventvalidation:
                search_payload["__EVENTVALIDATION"] = eventvalidation

            # Add the search button click
            search_payload["ctl00$MainContent$btnSearch"] = "Search"

            # Step 3: POST search request
            logger.info(f"Posting search: {district}/{taluka} ({year_from}-{year_to})")
            search_result = await client.post(
                IGR_SEARCH_URL,
                data=search_payload,
            )
            search_result.raise_for_status()

            # Step 4: Parse results table
            result_soup = BeautifulSoup(search_result.content, "html.parser")
            records = _parse_search_results(result_soup, district)

            logger.info(f"Found {len(records)} records for {district}/{taluka}")
            return [r.to_dict() for r in records]

    except httpx.HTTPError as e:
        logger.error(f"HTTP error during IGR search: {e}")
        return []
    except Exception as e:
        logger.error(f"Error searching IGR: {e}", exc_info=True)
        return []


def _parse_search_results(soup: BeautifulSoup, district: str) -> List[IGRRecord]:
    """Parse HTML table of search results into IGRRecord objects."""
    records = []

    # Find results table (adjust selector based on actual HTML structure)
    # Common selectors: GridView, gvDocuments, results-table
    table = soup.find("table", {"class": ["GridView", "gvDocuments", "results-table"]})

    if not table:
        # Try generic table search if no class match
        tables = soup.find_all("table")
        if tables and len(tables) > 0:
            table = tables[-1]  # Usually the last table is results

    if not table:
        logger.warning("No results table found in response")
        return records

    # Parse table rows
    rows = table.find_all("tr")

    # Skip header row (first row)
    for row in rows[1:]:
        cells = row.find_all("td")
        if len(cells) < 6:
            continue

        try:
            # Expected column order may vary - try to be flexible
            # Typical: Doc No, Year, Party 1, Party 2, Property, Date, Doc Type, Amount
            record = IGRRecord(
                doc_number=cells[0].get_text(strip=True),
                year=int(cells[1].get_text(strip=True)) if cells[1].get_text(strip=True).isdigit() else 0,
                district=district,
                taluka=cells[2].get_text(strip=True) if len(cells) > 2 else "",
                village=cells[3].get_text(strip=True) if len(cells) > 3 else "",
                party_name_1=cells[4].get_text(strip=True) if len(cells) > 4 else "",
                party_name_2=cells[5].get_text(strip=True) if len(cells) > 5 else "",
                property_description=cells[6].get_text(strip=True) if len(cells) > 6 else "",
                doc_type=cells[7].get_text(strip=True) if len(cells) > 7 else "Document",
                registration_date=cells[8].get_text(strip=True) if len(cells) > 8 else None,
                consideration_amount=_parse_amount(cells[9].get_text(strip=True)) if len(cells) > 9 else None,
            )

            # Try to extract PDF download link from row
            pdf_link = row.find("a", string="Download")
            if pdf_link and pdf_link.get("href"):
                record.pdf_url = pdf_link["href"]
                if not record.pdf_url.startswith("http"):
                    record.pdf_url = IGR_BASE_URL + record.pdf_url

            records.append(record)
        except Exception as e:
            logger.warning(f"Error parsing row: {e}")
            continue

    return records


def _parse_amount(text: str) -> Optional[int]:
    """Parse amount string to integer."""
    if not text:
        return None
    try:
        # Remove common separators
        text = text.replace(",", "").strip()
        if text.lower() in ["none", "null", "-", ""]:
            return None
        return int(float(text))
    except (ValueError, AttributeError):
        return None


async def download_igr_pdf(
    doc_number: str,
    year: int,
    district: str,
    dest_path: str,
    record: Dict,
    timeout: int = 60
) -> bool:
    """
    Download IGR PDF document or create text summary fallback.

    Args:
        doc_number: Document number
        year: Document year
        district: District name
        dest_path: Destination file path (should include filename)
        record: IGRRecord dictionary with pdf_url
        timeout: Request timeout in seconds

    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure parent directory exists
        Path(dest_path).parent.mkdir(parents=True, exist_ok=True)

        pdf_url = record.get("pdf_url")

        # Attempt PDF download if URL available
        if pdf_url:
            try:
                logger.info(f"Downloading IGR PDF: {doc_number} from {pdf_url}")
                async with httpx.AsyncClient(timeout=timeout) as client:
                    headers = {"User-Agent": IGR_USER_AGENT}
                    response = await client.get(pdf_url, headers=headers, follow_redirects=True)
                    response.raise_for_status()

                    # Check if content is actually PDF
                    if response.headers.get("content-type", "").lower().startswith("application/pdf"):
                        with open(dest_path, "wb") as f:
                            f.write(response.content)
                        logger.info(f"Successfully downloaded PDF to {dest_path}")
                        return True
                    else:
                        logger.warning(f"URL returned non-PDF content for {doc_number}")
            except Exception as e:
                logger.warning(f"PDF download failed, using text fallback: {e}")

        # Fallback: Create text summary
        text_summary = _build_igr_text_summary(record)

        # Save as .txt instead of .pdf
        txt_path = dest_path.replace(".pdf", ".txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text_summary)

        logger.info(f"Created text summary at {txt_path}")
        return True

    except Exception as e:
        logger.error(f"Error downloading/creating IGR document: {e}", exc_info=True)
        return False


def _build_igr_text_summary(record: Dict) -> str:
    """Create a structured text summary of IGR record for RAG ingestion."""
    return f"""IGR PROPERTY REGISTRATION RECORD
========================================

Document Number: {record.get('doc_number', 'N/A')}
Year: {record.get('year', 'N/A')}
Document Type: {record.get('doc_type', 'N/A')}
Registration Date: {record.get('registration_date', 'N/A')}

LOCATION DETAILS
================
District: {record.get('district', 'N/A')}
Taluka: {record.get('taluka', 'N/A')}
Village: {record.get('village', 'N/A')}

PARTIES INVOLVED
================
Party 1: {record.get('party_name_1', 'N/A')}
Party 2: {record.get('party_name_2', 'N/A')}

PROPERTY DETAILS
================
Description: {record.get('property_description', 'N/A')}
Consideration Amount: {record.get('consideration_amount', 'N/A')}

SOURCE
======
Source: IGR Maharashtra Free Search Service
URL: https://freesearchigrservice.maharashtra.gov.in
Retrieved: {datetime.now().isoformat()}
"""


async def search_igr_with_playwright(
    district: str,
    taluka: str,
    year_from: int,
    year_to: int,
    party_name: str = "",
    survey_number: str = "",
) -> List[Dict]:
    """
    Fallback scraper using Playwright for JavaScript-heavy pages.
    Only used if httpx scraper fails.

    Note: Requires 'pip install playwright' and browser installation.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.error("Playwright not installed. Install with: pip install playwright")
        return []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            logger.info(f"Loading IGR page with Playwright for {district}/{taluka}")
            await page.goto(IGR_SEARCH_URL, wait_until="networkidle")

            # Fill form fields
            await page.select_option('select[name="ctl00$MainContent$ddlDistrict"]', district)
            await page.select_option('select[name="ctl00$MainContent$ddlTaluka"]', taluka)
            await page.select_option('select[name="ctl00$MainContent$ddlFromYear"]', str(year_from))
            await page.select_option('select[name="ctl00$MainContent$ddlToYear"]', str(year_to))

            if party_name:
                await page.fill('input[name="ctl00$MainContent$txtPartyName"]', party_name)
            if survey_number:
                await page.fill('input[name="ctl00$MainContent$txtSurveyNumber"]', survey_number)

            # Click search button
            await page.click('input[name="ctl00$MainContent$btnSearch"]')
            await page.wait_for_load_state("networkidle")

            # Get HTML and parse
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            records = _parse_search_results(soup, district)

            await browser.close()
            return [r.to_dict() for r in records]

    except Exception as e:
        logger.error(f"Playwright fallback failed: {e}", exc_info=True)
        return []
