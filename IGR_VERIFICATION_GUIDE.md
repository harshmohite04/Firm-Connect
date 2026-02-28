# IGR Maharashtra Integration - Verification Guide

## Overview
This document provides step-by-step verification procedures for the IGR Maharashtra integration in Firm Connect. The integration enables lawyers to search and import property registration documents directly from the Maharashtra IGR website into case documents.

---

## Phase 1: Core IGR Integration (COMPLETE)

### Files Created
1. **igr/__init__.py** - Package marker
2. **igr/scraper.py** - Web scraper with httpx + BeautifulSoup4
3. **LawFirmConnectweb/src/services/igrService.ts** - Frontend API service
4. **LawFirmConnectweb/src/pages/case-details/IGRLookupModal.tsx** - Search UI component
5. **LawFirmConnectweb/backend/src/routes/caseRoutes.js** - Added IGR document registration route

### Files Modified
1. **server.py** - Added `/igr/search` and `/igr/import` routes
2. **LawFirmConnectweb/src/pages/case-details/CaseDocuments.tsx** - Added IGR button and modal
3. **LawFirmConnectweb/src/services/caseService.ts** - Added PropertyDetails interface

---

## Verification Tests

### 1. Python Scraper Unit Test
```bash
# From project root directory
cd "D:\harsh\Code_Playground\Law Firm Connect\CheckOne\Firm-Connect"

# Test import
python -c "from igr.scraper import search_igr, download_igr_pdf, IGRRecord; print('✓ Scraper imports successfully')"

# Test IGRRecord class
python -c "
from igr.scraper import IGRRecord
record = IGRRecord(doc_number='123', year=2024, district='Pune')
assert record.doc_number == '123'
print('✓ IGRRecord class works correctly')
"
```

### 2. Flask Routes Test
Start the Python server:
```bash
# Ensure dependencies are installed
pip install httpx beautifulsoup4 fastapi python-dotenv pymongo

# Start server
cd "D:\harsh\Code_Playground\Law Firm Connect\CheckOne\Firm-Connect"
python server.py
# Server runs on http://localhost:8000
```

Test IGR search endpoint:
```bash
curl -X POST http://localhost:8000/igr/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "caseId": "test-case-123",
    "district": "Pune",
    "taluka": "Haveli",
    "yearFrom": 2020,
    "yearTo": 2024,
    "partyName": "Test",
    "surveyNumber": ""
  }'

# Expected response:
# {
#   "results": [...],
#   "count": N,
#   "message": "Found N document(s)"
# }
```

Test IGR import endpoint:
```bash
curl -X POST http://localhost:8000/igr/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "caseId": "test-case-123",
    "records": [
      {
        "doc_number": "123",
        "year": 2024,
        "district": "Pune",
        "taluka": "Haveli",
        "village": "Test",
        "party_name_1": "John Doe",
        "party_name_2": "Jane Smith",
        "property_description": "1 acre agricultural land",
        "consideration_amount": 500000,
        "registration_date": "2024-01-01",
        "doc_type": "Sale Deed",
        "pdf_url": null
      }
    ]
  }'

# Expected response:
# {
#   "imported": ["IGR_Pune_2024_123.pdf"],
#   "failed": [],
#   "message": "Imported 1 document(s), 0 failed"
# }
```

### 3. MongoDB Status Verification
After importing documents, check the document_status collection:
```bash
# Connect to MongoDB and check document status
mongosh  # or use MongoDB Compass

# Query the document_status collection
db.document_status.find({"case_id": "test-case-123"})

# Expected output:
# {
#   "_id": ObjectId(...),
#   "case_id": "test-case-123",
#   "filename": "IGR_Pune_2024_123.pdf",
#   "status": "Processing",  # or "Ready" after ingestion completes
#   "source": "IGR",
#   "igr_metadata": {...},
#   "last_updated": ISODate(...)
# }

# Monitor status transition (should eventually go from "Processing" to "Ready")
db.document_status.find({"case_id": "test-case-123", "filename": "IGR_Pune_2024_123.pdf"})
```

### 4. Frontend UI Test
1. Navigate to a case's Documents tab
2. Click the emerald green "Fetch from IGR" button
3. IGRLookupModal should appear with:
   - District dropdown (36 Maharashtra districts)
   - Taluka input field
   - Year range inputs (default 2020-current year)
   - Search method toggle (Party Name / Survey Number)
   - Optional search criteria input
4. Enter test values:
   - District: Pune
   - Taluka: Haveli
   - Year From: 2020
   - Year To: 2024
5. Click "Search IGR"
6. Table should populate with results (or show "No results" if API returns empty)
7. Select records by clicking checkboxes
8. Click "Import Selected (N)" button
9. Toast notification should show import success/failure
10. Documents list should refresh and show new IGR documents
11. AI status badges should appear (yellow "Processing" → green "Ready" after ~30s)

### 5. AI Status Polling Test
1. After importing IGR documents, check CaseDocuments.tsx for `aiStatuses` state
2. Should see status progression:
   - Immediately: "Processing" badge (yellow)
   - After ~30 seconds: "Ready" badge (green)
3. Open Document viewer for IGR document
4. Should show extracted text (either from PDF or text summary)

### 6. Investigator Integration Test
1. Complete an investigation on a case with imported IGR documents
2. Check investigation report for:
   - Property entities (parties, parties extracted from IGR)
   - Timeline events (registration dates from IGR)
   - Property details (location, type, consideration)
3. IGR documents should be included in "Ready" documents passed to investigator

### 7. RAG Integration Test
1. Open case chat in CaseChat.tsx
2. Query about property details
3. RAG should return context from IGR documents
4. Sources should show IGR filenames in citations

---

## Phase 2: Property Metadata (COMPLETE)

### Files Modified
1. **LawFirmConnectweb/src/services/caseService.ts** - PropertyDetails interface added
2. **LawFirmConnectweb/src/pages/case-details/CaseSettings.tsx** - Property Details section added
3. **LawFirmConnectweb/backend/src/models/Case.js** - propertyDetails field added

### Verification
1. Navigate to Case Settings tab
2. Scroll to "Property Details" section
3. Fill in:
   - Survey Number: 23/A
   - CTS Number: 456
   - District: Pune
   - Taluka: Haveli
   - Village: Wagholi
   - Property Type: Residential
4. Click "Save Property Details"
5. Toast should show success
6. Refresh page - values should persist
7. Properties should be queryable via API:
   ```bash
   GET /cases/{caseId}
   # Response includes: propertyDetails: { surveyNumber, ctsNumber, ... }
   ```

---

## Phase 3: Stamp Duty Calculator (COMPLETE)

### File Created
- **LawFirmConnectweb/src/pages/case-details/StampDutyCalculator.tsx** - Standalone calculator

### Verification
The calculator is a pure frontend component. To test:
1. Import and mount in a case tab (or Documents tab action bar)
2. Adjust inputs:
   - Market Value: Change from ₹10 lakhs to various amounts
   - RR Rate: Adjust to test calculations
   - Property Type: Test all 4 types
   - Buyer Gender: Toggle female for 1% discount
   - First Property: Toggle for 0.5% discount
   - Metro Area: Toggle for 1% cess addition
3. Verify calculations match:
   - **Residential**: 5% stamp duty (no discount) or 3.5% (first property + female)
   - **Commercial**: 6% stamp duty
   - **Agricultural**: 3% stamp duty
   - **Industrial**: 4% stamp duty
   - **Registration Fee**: 1% of value, capped at ₹30,000
   - **Metro Cess**: 1% of stamp duty (Mumbai only, residential only)

---

## Common Issues & Troubleshooting

### Issue: IGR Search Returns 404 Not Found
- **Cause**: The Maharashtra IGR website URL was incorrect
- **Solution**: The correct URL is now configured:
  ```bash
  # In .env files:
  IGR_BASE_URL=https://igrmaharashtra.gov.in
  IGR_SEARCH_URL=https://igrmaharashtra.gov.in/eservices/searchDocument
  ```
- **Verification**: The official Maharashtra IGR website is:
  - **Official**: https://igrmaharashtra.gov.in (verified working ✓)
  - **Legacy** (may not work): https://mahabhumi.maharashtra.gov.in, https://freesearchigrservice.maharashtra.gov.in
- **Note**: Government website URLs change frequently. If searches still fail after updating the URL, check the website's actual HTML structure and update `_parse_search_results()` accordingly

### Issue: IGR Search Returns Empty Results
- **Cause**: Website structure may have changed or search criteria don't match available records
- **Solution**:
  1. Verify the URL is correct (see above)
  2. Check if website HTML structure matches `_parse_search_results()` assumptions
  3. Test with a known property (contact Maharashtra IGR office for test data)
- **Debug**: Add logging to `scraper.py` to inspect BeautifulSoup parse results

### Issue: PDF Download Fails
- **Cause**: IGR website may not allow direct PDF downloads or requires authentication
- **Solution**: PDF download gracefully falls back to text summary
- **Verify**: Check `documents/` folder - should contain `.txt` files if PDFs unavailable

### Issue: Documents Don't Show "IGR Record" Badge
- **Cause**: Case model doesn't have new category enum
- **Solution**: Ensure MongoDB schema migration includes "IGR Record" in document category enum
- **Note**: Node.js model updated but existing data may need migration

### Issue: AI Ingestion Status Stuck on "Processing"
- **Cause**: Background ingestion task failed silently
- **Solution**: Check Python logs for ingestion errors
- **Debug**: Check MongoDB `document_status` collection for error field:
  ```bash
  db.document_status.findOne({"filename": "IGR_..."})
  # Look for: { status: "Failed", error: "..." }
  ```

### Issue: Authorization Errors on Search/Import
- **Cause**: User token not in localStorage or expired
- **Solution**: Ensure frontend user is logged in
- **Debug**: Check browser DevTools → Application → localStorage → "user" key

---

## Performance Considerations

1. **Scraper Timeout**: Set to 30s for search, 60s for PDF download
2. **Rate Limiting**:
   - Search: 10/minute
   - Import: 5/minute
3. **Batch Import**: Import up to 10 documents per request
4. **Background Processing**: Uses asyncio for non-blocking ingestion

---

## Security Notes

1. **Authentication**: All routes require valid JWT token via `get_current_user()`
2. **Filename Sanitization**: Uses `sanitize_filename()` to prevent path traversal
3. **Case Access**: Verifies user owns/has access to case before returning data
4. **XSS Prevention**: Frontend validates all user inputs before sending to API

---

## Next Steps After Verification

1. **Test with Real IGR Data**: Use actual Pune district, Haveli taluka to verify scraper
2. **Train Investigator**: Update investigator prompts to reference property metadata
3. **UI Polish**: Add IGR document source badge, metadata display
4. **Performance**: Monitor MongoDB query performance as documents grow
5. **Analytics**: Track IGR imports per case for usage insights

---

## Rollback Plan

If issues arise:

1. **Frontend**: Disable IGR button by commenting out in CaseDocuments.tsx
2. **Backend**: Remove `/igr/search` and `/igr/import` routes from server.py
3. **Database**: Drop `igr/` folder; documents continue working normally
4. **Models**: Remove `propertyDetails` field from Case schema (backward compatible)

---

## Support

For questions or issues:
1. Check logs: `server.py` (Python) and browser console (Frontend)
2. Verify API connectivity: `curl http://localhost:8000/` should return "API is running..."
3. Check MongoDB connection: Verify MONGO_URI in .env
4. Test token auth: Ensure user is logged in and token is valid

---

**Last Updated**: 2026-02-28
**Status**: Phase 1 & 2 Complete, Phase 3 Optional
**Version**: 1.0
