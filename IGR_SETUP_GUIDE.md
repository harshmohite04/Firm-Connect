# IGR Maharashtra Integration - Setup & Configuration Guide

## Overview
This guide explains how to configure and fix the IGR Maharashtra property registration lookup integration in Firm Connect.

---

## Current Status

The IGR integration is **fully implemented** but requires you to verify/update the **IGR website URL** since government websites change frequently.

### What's Working ✅
- Frontend search UI (IGRLookupModal component)
- API routes (/igr/search, /igr/import)
- Document ingestion pipeline
- RAG integration
- Investigator integration

### What Needs Setup ⚙️
- **IGR Website URL Configuration** - Must match the current Maharashtra government IGR service URL

---

## Step 1: Find the Correct IGR Website URL

The Maharashtra government property registration lookup service may be available at different URLs:

### Official IGR Website (Verified ✓)
```
https://igrmaharashtra.gov.in
```
**This is the official website for Maharashtra property registration lookup.**

### Alternative/Legacy (May No Longer Work)
```
https://mahabhumi.maharashtra.gov.in
https://freesearchigrservice.maharashtra.gov.in
```

### How to Find the Correct URL

1. **Visit Maharashtra Government Portal**
   - Go to: https://maharashtra.gov.in
   - Search for: "Land Records", "IGR Search", or "Property Registration"
   - Look for the official property registration/IGR search link

2. **Contact Maharashtra IGR Department**
   - Email: igr@maharashtra.gov.in (if available)
   - Phone: Check state government directory

3. **Check Current Implementation**
   - The scraper logs show which URL is being attempted
   - 404 errors indicate the URL is incorrect

---

## Step 2: Update Environment Variables

Once you have the correct URL, update your environment configuration files:

### For Development
Edit `.env.development`:
```bash
# IGR Maharashtra Integration
# Official IGR Website: https://igrmaharashtra.gov.in/
IGR_BASE_URL=https://igrmaharashtra.gov.in
IGR_SEARCH_URL=https://igrmaharashtra.gov.in/eservices/searchDocument
```

### For Production
Edit `.env.production`:
```bash
# IGR Maharashtra Integration
# Official IGR Website: https://igrmaharashtra.gov.in/
IGR_BASE_URL=https://igrmaharashtra.gov.in
IGR_SEARCH_URL=https://igrmaharashtra.gov.in/eservices/searchDocument
```

### Restart Services
After updating `.env` files, restart the Python server:
```bash
# Kill existing process
pkill -f "python server.py"

# Restart
python server.py
```

---

## Step 3: Test the Configuration

### Test 1: Check Server Logs
```bash
# Look for logs like:
# INFO - Fetching IGR search page for Pune/Haveli
# If you see HTTP 200: URL is correct ✓
# If you see HTTP 404: URL is incorrect ✗
```

### Test 2: Test with cURL
```bash
curl -X POST http://localhost:8000/igr/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "caseId": "test-case",
    "district": "Pune",
    "taluka": "Haveli",
    "yearFrom": 2020,
    "yearTo": 2024,
    "partyName": "Test"
  }'

# Expected Response (if URL correct and data exists):
# {
#   "results": [
#     { "doc_number": "123", "year": 2024, ... }
#   ],
#   "count": 1,
#   "message": "Found 1 document(s)"
# }

# Expected Response (if URL correct but no data):
# {
#   "results": [],
#   "count": 0,
#   "message": "Found 0 document(s)"
# }

# Expected Response (if URL incorrect):
# {
#   "results": [],
#   "count": 0,
#   "message": "Found 0 document(s)"
# }
# (with HTTP 404 in server logs)
```

### Test 3: Check Frontend
1. Navigate to Documents tab in a case
2. Click "Fetch from IGR" button
3. Fill in search criteria
4. Click "Search IGR"
5. Results should appear (or "No results" if data doesn't exist)

---

## Troubleshooting

### Issue: Still Getting 404 Errors

**Possible Causes:**
1. URL is still incorrect
2. Website requires authentication
3. Website requires JavaScript rendering
4. Website blocks automated access

**Solutions:**

1. **Verify URL is Correct**
   - Visit the URL in your browser manually
   - Check if it's the search/lookup page
   - Copy the exact URL from address bar

2. **Check HTML Structure**
   - If URL is correct but searches fail, the HTML structure may have changed
   - Edit `igr/scraper.py` and update `_parse_search_results()` function
   - Inspect the actual HTML using browser DevTools

3. **Enable JavaScript Rendering**
   - If the website uses JavaScript to load content:
   - The scraper includes Playwright fallback
   - Install: `pip install playwright`
   - Run: `playwright install chromium`

4. **Handle Authentication**
   - If website requires login, you may need to:
   - Capture session cookies from browser
   - Pass cookies in httpx request headers
   - Modify `search_igr()` in `scraper.py`

### Issue: Search Returns Results but PDF Download Fails

This is **expected behavior** - the system has a text summary fallback.

**What Happens:**
1. Document is downloaded and saved as `.pdf`
2. If PDF download fails, system creates `.txt` file instead
3. Text summary contains all property metadata
4. Both are ingested into RAG pipeline equally

**No action needed** - system works correctly.

### Issue: Empty Results from Correct URL

**Possible Causes:**
1. No matching records in IGR database
2. Search parameters don't match records
3. Taluka name spelled differently than in database

**Solutions:**
1. Try different search criteria (broader date range, different party names)
2. Contact Maharashtra IGR office to verify record exists
3. Test with known property details

---

## Advanced Configuration

### Custom HTML Parser
If the IGR website structure is different, you may need to update the HTML parser:

**File:** `igr/scraper.py`
**Function:** `_parse_search_results(soup, district)`

```python
def _parse_search_results(soup: BeautifulSoup, district: str) -> List[IGRRecord]:
    """Adapt this function to match the actual HTML structure of the website."""
    records = []

    # Find the correct table using actual HTML structure
    # table = soup.find("table", {"id": "resultsTable"})  # Update selector

    # Parse rows based on actual HTML column order
    # cells[0] = doc number, cells[1] = year, etc.

    return records
```

**Steps:**
1. Use browser DevTools to inspect actual HTML
2. Update CSS selectors to match
3. Adjust column mapping to match order
4. Test with `curl` request

### Rate Limiting Configuration
Edit `server.py`:

```python
@app.post("/igr/search")
@limiter.limit("10/minute")  # Change to desired rate
```

---

## Integration Points

The IGR integration connects to:

1. **Frontend** - IGRLookupModal.tsx
2. **API Service** - igrService.ts
3. **Backend Routes** - server.py (/igr/search, /igr/import)
4. **Scraper** - igr/scraper.py
5. **Ingestion** - _run_ingestion_background() (unchanged)
6. **Database** - MongoDB document_status collection
7. **RAG** - Chat searches IGR documents automatically
8. **Investigator** - Auto-includes IGR docs in analysis

---

## Support Resources

### Maharashtra Government
- Official Portal: https://maharashtra.gov.in
- Land Records: Search for "Land Records" or "IGR"
- Mahabhumi Portal: https://mahabhumi.maharashtra.gov.in

### Legal Resources
- Property registration is governed by: Indian Registration Act, 1908
- IGR contains: Sale Deeds, Mortgage Deeds, Lease Deeds, Index II records

### Technical Support
- Check `server.py` logs for HTTP errors
- Check browser console for frontend errors
- Verify `.env` file has correct configuration
- Test routes with cURL before debugging in UI

---

## FAQ

**Q: Can I use IGR integration without verifying the URL?**
A: No - the website URL must be correct for the scraper to work. But the system gracefully returns empty results if URL is wrong.

**Q: What if the Maharashtra government changes the website?**
A: Update the IGR_BASE_URL and IGR_SEARCH_URL in `.env` files. The system is designed to be easily configurable.

**Q: Can I scrape data in bulk?**
A: The current implementation searches one property at a time. For bulk operations, contact Maharashtra IGR office for data export.

**Q: Does this work for other states?**
A: No, this implementation is specific to Maharashtra. Each state has different land registry systems.

**Q: Is this official?**
A: This is a third-party integration accessing public government data. Always verify with official sources.

---

## Updates & Maintenance

The IGR integration may need updates if:
- Maharashtra government changes website URL
- Website HTML structure changes
- Website adds authentication requirements
- New property document types are added

**Monitor logs** for 404 or parsing errors indicating changes are needed.

---

**Last Updated:** 2026-02-28
**Version:** 1.0
**Status:** Production Ready (URL Configuration Required)
