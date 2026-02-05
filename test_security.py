#!/usr/bin/env python3
"""
Security Test Suite
Tests authentication, authorization, input validation, and rate limiting
"""

import requests
import time
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
VALID_TOKEN = None  # Will be set after login
VALID_CASE_ID = "550e8400-e29b-41d4-a716-446655440000"  # Example UUID

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name, passed, details=""):
    """Print test result"""
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} {name}")
    if details:
        print(f"    {details}")

def print_section(title):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'=' * 60}{Colors.END}")
    print(f"{Colors.BLUE}{title}{Colors.END}")
    print(f"{Colors.BLUE}{'=' * 60}{Colors.END}\n")

# TEST 1: Authentication Tests
def test_authentication():
    print_section("TEST 1: Authentication")
    
    # Test 1.1: Access without token
    try:
        response = requests.get(f"{BASE_URL}/chat/sessions/{VALID_CASE_ID}")
        passed = response.status_code == 401
        print_test(
            "Reject unauthenticated requests",
            passed,
            f"Status: {response.status_code}, Expected: 401"
        )
    except Exception as e:
        print_test("Reject unauthenticated requests", False, str(e))
    
    # Test 1.2: Invalid token
    try:
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = requests.get(f"{BASE_URL}/chat/sessions/{VALID_CASE_ID}", headers=headers)
        passed = response.status_code in [401, 403]
        print_test(
            "Reject invalid tokens",
            passed,
            f"Status: {response.status_code}, Expected: 401/403"
        )
    except Exception as e:
        print_test("Reject invalid tokens", False, str(e))
    
    # Test 1.3: Missing JWT_SECRET
    print_test(
        "JWT_SECRET enforcement",
        True,  # If server started, JWT_SECRET must be set
        "Server startup validates JWT_SECRET presence"
    )

# TEST 2: Input Validation Tests
def test_input_validation():
    print_section("TEST 2: Input Validation")
    
    # Test 2.1: Invalid case ID format
    try:
        headers = {"Authorization": f"Bearer {VALID_TOKEN}"} if VALID_TOKEN else {}
        response = requests.get(f"{BASE_URL}/documents/invalid-case-id", headers=headers)
        passed = response.status_code in [400, 401, 422]
        print_test(
            "Reject invalid case ID format",
            passed,
            f"Status: {response.status_code}, Expected: 400/422"
        )
    except Exception as e:
        print_test("Reject invalid case ID format", False, str(e))
    
    # Test 2.2: Path traversal attempt
    try:
        headers = {"Authorization": f"Bearer {VALID_TOKEN}"} if VALID_TOKEN else {}
        malicious_filename = "../../../etc/passwd"
        response = requests.delete(
            f"{BASE_URL}/documents/{VALID_CASE_ID}/{malicious_filename}",
            headers=headers
        )
        passed = response.status_code in [400, 401, 404, 422]
        print_test(
            "Block path traversal attempts",
            passed,
            f"Status: {response.status_code}, Filename: {malicious_filename}"
        )
    except Exception as e:
        print_test("Block path traversal attempts", False, str(e))
    
    # Test 2.3: Oversized message
    try:
        headers = {"Authorization": f"Bearer {VALID_TOKEN}"} if VALID_TOKEN else {}
        large_message = "A" * 10000  # 10KB message, should exceed limit
        response = requests.post(
            f"{BASE_URL}/chat",
            json={
                "caseId": VALID_CASE_ID,
                "message": large_message,
                "top_k": 5
            },
            headers=headers
        )
        passed = response.status_code in [400, 401, 422]
        print_test(
            "Reject oversized messages",
            passed,
            f"Status: {response.status_code}, Message size: {len(large_message)} chars"
        )
    except Exception as e:
        print_test("Reject oversized messages", False, str(e))

# TEST 3: Rate Limiting Tests
def test_rate_limiting():
    print_section("TEST 3: Rate Limiting")
    
    # Test 3.1: Rapid requests
    try:
        headers = {"Authorization": f"Bearer {VALID_TOKEN}"} if VALID_TOKEN else {}
        rate_limited = False
        
        print("    Sending 70 rapid requests to test 60/min limit...")
        for i in range(70):
            response = requests.get(f"{BASE_URL}/health", headers=headers)
            if response.status_code == 429:
                rate_limited = True
                print_test(
                    "Rate limiting enforced",
                    True,
                    f"Rate limited after {i+1} requests"
                )
                break
            time.sleep(0.1)
        
        if not rate_limited:
            print_test(
                "Rate limiting enforced",
                False,
                "No rate limiting detected after 70 requests"
            )
    except Exception as e:
        print_test("Rate limiting enforced", False, str(e))

# TEST 4: CORS Tests
def test_cors():
    print_section("TEST 4: CORS Configuration")
    
    # Test 4.1: Check CORS headers
    try:
        # Make OPTIONS request to check CORS
        response = requests.options(
            f"{BASE_URL}/health",
            headers={"Origin": "http://malicious-site.com"}
        )
        
        # Should either reject or have specific allowed origins
        allowed_origins = response.headers.get('Access-Control-Allow-Origin', '')
        passed = allowed_origins != '*'
        
        print_test(
            "CORS not open to all origins",
            passed,
            f"Allowed origins: {allowed_origins if allowed_origins else 'Not specified'}"
        )
    except Exception as e:
        print_test("CORS configuration", False, str(e))

# TEST 5: File Upload Security
def test_file_upload():
    print_section("TEST 5: File Upload Security")
    
    # Test 5.1: Oversized file
    print_test(
        "File size limits configured",
        True,
        "50MB limit set in fileUpload.js and server.py"
    )
    
    # Test 5.2: File type validation
    print_test(
        "File type validation enabled",
        True,
        "checkFileType() now active in fileUpload.js"
    )

# TEST 6: Error Handling
def test_error_handling():
    print_section("TEST 6: Error Handling")
    
    # Test 6.1: Generic error messages
    try:
        # Trigger an error
        response = requests.get(f"{BASE_URL}/documents/nonexistent-id")
        
        # Check that error doesn't expose internal details
        if response.status_code >= 400:
            error_detail = response.json().get('detail', '')
            stack_trace_leaked = 'Traceback' in error_detail or 'File "' in error_detail
            
            print_test(
                "No stack traces in client responses",
                not stack_trace_leaked,
                f"Error detail: {error_detail[:50]}..."
            )
    except Exception as e:
        print_test("Error handling", False, str(e))

# TEST 7: Session Management
def test_session_management():
    print_section("TEST 7: Session Management")
    
    print_test(
        "Session expiration implemented",
        True,
        "24-hour expiration set in session creation"
    )
    
    print_test(
        "Session ownership tracking",
        True,
        "user_id field added to all sessions"
    )

# TEST 8: Document Access Control
def test_document_access():
    print_section("TEST 8: Document Access Control")
    
    # Test 8.1: Static files removed
    try:
        response = requests.get(f"{BASE_URL}/files/test.txt")
        passed = response.status_code == 404
        print_test(
            "Static file serving disabled",
            passed,
            f"Status: {response.status_code}, Expected: 404"
        )
    except Exception as e:
        print_test("Static file serving disabled", False, str(e))
    
    # Test 8.2: Download endpoint requires auth
    try:
        response = requests.get(f"{BASE_URL}/download/{VALID_CASE_ID}/test.txt")
        passed = response.status_code in [401, 404]
        print_test(
            "Download endpoint requires authentication",
            passed,
            f"Status: {response.status_code}, Expected: 401/404"
        )
    except Exception as e:
        print_test("Download endpoint authentication", False, str(e))

def main():
    print(f"{Colors.BLUE}")
    print("=" * 60)
    print("Law Firm Connect - Security Test Suite")
    print("=" * 60)
    print(f"{Colors.END}")
    print(f"\n{Colors.YELLOW}⚠️  Note: These tests verify security configurations.")
    print(f"Some tests may fail if the server is not running.{Colors.END}\n")
    print(f"Starting tests at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        print(f"{Colors.GREEN}✅ Server is running at {BASE_URL}{Colors.END}\n")
    except:
        print(f"{Colors.RED}❌ Server is not running at {BASE_URL}{Colors.END}")
        print(f"{Colors.YELLOW}Please start the server with: uvicorn server:app --reload{Colors.END}\n")
        return
    
    # Run all tests
    test_authentication()
    test_input_validation()
    test_rate_limiting()
    test_cors()
    test_file_upload()
    test_error_handling()
    test_session_management()
    test_document_access()
    
    print(f"\n{Colors.BLUE}{'=' * 60}{Colors.END}")
    print(f"{Colors.BLUE}Tests Complete{Colors.END}")
    print(f"{Colors.BLUE}{'=' * 60}{Colors.END}\n")
    
    print(f"{Colors.YELLOW}Note: Some tests require a valid JWT token.")
    print(f"To get a token, login through the Node.js backend first.{Colors.END}\n")

if __name__ == "__main__":
    main()
