# Security Setup Quick Reference

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run security setup (validates configuration)
python setup_security.py
```

### 2. Start Servers

**Python Backend (FastAPI):**
```bash
# Development
uvicorn server:app --reload --port 8000

# Production (with workers)
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

**Node.js Backend:**
```bash
cd LawFirmConnectweb/backend
npm install
npm start
```

### 3. Run Security Tests
```bash
# Ensure server is running first
python test_security.py
```

## 🔐 Environment Variables

**Required in `.env`:**
- `JWT_SECRET` - ✅ Auto-generated (128 chars)
- `ALLOWED_ORIGINS` - Set to production URLs
- `GROQ_API_KEY` - ⚠️ **Rotate this key** 
- `DEEPSEEK_API_KEY` - ⚠️ **Rotate this key** 
- `NEO4J_PASS` - ⚠️ **Change from default**
- `MONGO_URI` - Verify security
- `MAX_FILE_SIZE_MB` - Default: 50
- `RATE_LIMIT_ENABLED` - Default: true

## 🔒 Security Features Enabled

### Authentication
- ✅ JWT required on all Python endpoints
- ✅ Token validation with user lookup
- ✅ Session ownership tracking
- ✅ 24-hour session expiration

### Input Validation
- ✅ UUID validation for case IDs
- ✅ Filename sanitization (path traversal protection)
- ✅ File size limits (50MB default)
- ✅ String length validation
- ✅ File type validation (jpg, png, pdf, doc, txt)

### Rate Limiting
- Chat: 30 requests/minute
- File uploads: 10 requests/minute  
- Document ops: 20-30 requests/minute
- General: 60 requests/minute

### Access Control
- ✅ Removed `/files` static serving
- ✅ Authenticated `/download` endpoint
- ✅ Document ownership verification
- ✅ CORS restricted to allowed origins

## 📋 Testing Checklist

- [ ] Start Python server: `uvicorn server:app --reload`
- [ ] Start Node.js server: `cd LawFirmConnectweb/backend && npm start`
- [ ] Run security tests: `python test_security.py`
- [ ] Test login/authentication
- [ ] Test file upload (valid/invalid types)
- [ ] Test rate limiting (rapid requests)
- [ ] Test document access control

## ⚠️ Important Security Actions

### Before Production Deployment

1. **Rotate API Keys**
   - Groq: https://console.groq.com
   - DeepSeek: https://platform.deepseek.com

2. **Update Database Passwords**
   - Neo4j: Change from `12345678`
   - MongoDB: Verify URI security

3. **Configure Production CORS**
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Enable HTTPS**
   - Use reverse proxy (Nginx, Apache)
   - Configure SSL certificates
   - Redirect HTTP → HTTPS

5. **Review Logs**
   - Monitor security events in logs
   - Set up alerts for suspicious activity

## 🛠️ Troubleshooting

### "JWT_SECRET not set" Error
✅ Already fixed - JWT_SECRET generated and set in `.env`

### "slowapi not found" Error
```bash
.venv\Scripts\activate
pip install slowapi PyJWT
```

### CORS Errors
Update `ALLOWED_ORIGINS` in `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Rate Limit Too Strict
Adjust in `server.py` or disable temporarily:
```env
RATE_LIMIT_ENABLED=false
```

## 📊 Security Monitoring

### Key Metrics to Track
- Failed authentication attempts
- Rate limit violations
- Invalid input attempts (path traversal, etc.)
- File upload failures
- Session expiration rate

### Log Files to Monitor
- Application logs (stdout/stderr)
- Security event logs (via `log_security_event()`)
- Database connection logs

## 🔄 Regular Maintenance

**Weekly:**
- Review security logs
- Check for suspicious activity
- Verify API key quotas

**Monthly:**
- Rotate JWT secrets (requires reauth)
- Update dependencies (`pip install --upgrade`)
- Review access patterns

**Quarterly:**
- Full security audit
- Penetration testing
- Update security policies

## 📚 Reference Files

- [`walkthrough.md`](file:///C:/Users/harsh/.gemini/antigravity/brain/1a01d852-7079-4762-9465-b3117f283c7a/walkthrough.md) - Complete security fixes documentation
- [`security_assessment.md`](file:///C:/Users/harsh/.gemini/antigravity/brain/1a01d852-7079-4762-9465-b3117f283c7a/security_assessment.md) - Original vulnerability assessment
- [`implementation_plan.md`](file:///C:/Users/harsh/.gemini/antigravity/brain/1a01d852-7079-4762-9465-b3117f283c7a/implementation_plan.md) - Security fixes plan
- [`setup_security.py`](file:///d:/harsh/Code_Playground/Law%20Firm%20Connect/Law%20Firm%20Connect/setup_security.py) - Automated setup script
- [`test_security.py`](file:///d:/harsh/Code_Playground/Law%20Firm%20Connect/Law%20Firm%20Connect/test_security.py) - Security test suite
