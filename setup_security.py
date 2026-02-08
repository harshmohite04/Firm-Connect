#!/usr/bin/env python3
"""
Security Configuration Setup Script
Automates initial security setup for Law Firm Connect
"""

import os
import secrets
from pathlib import Path

def generate_jwt_secret():
    """Generate a cryptographically secure JWT secret"""
    return secrets.token_hex(64)

def update_env_file():
    """Update .env file with secure JWT secret if not already set"""
    env_path = Path('.env')
    
    if not env_path.exists():
        print("❌ .env file not found. Please copy .env.example to .env first.")
        return False
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Check if JWT_SECRET needs to be updated
    if 'JWT_SECRET=your_jwt_secret_here' in content or 'JWT_SECRET=' not in content:
        new_secret = generate_jwt_secret()
        
        # Replace or add JWT_SECRET
        if 'JWT_SECRET=' in content:
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if line.startswith('JWT_SECRET='):
                    new_lines.append(f'JWT_SECRET={new_secret}')
                    print(f"✅ Generated new JWT_SECRET: {new_secret[:16]}...{new_secret[-16:]}")
                else:
                    new_lines.append(line)
            content = '\n'.join(new_lines)
        else:
            content += f'\nJWT_SECRET={new_secret}\n'
            print(f"✅ Added JWT_SECRET to .env")
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        return True
    else:
        print("✅ JWT_SECRET already configured")
        return True

def check_required_env_vars():
    """Check that all required environment variables are set"""
    required_vars = [
        'JWT_SECRET',
        'GROQ_API_KEY',
        'NEO4J_URI',
        'NEO4J_USER',
        'NEO4J_PASS',
        'MONGO_URI',
        'ALLOWED_ORIGINS'
    ]
    
    from dotenv import load_dotenv
    load_dotenv()
    
    missing = []
    weak = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
        elif var == 'JWT_SECRET' and len(value) < 32:
            weak.append(f"{var} (too short: {len(value)} chars, need 32+)")
        elif var == 'NEO4J_PASS' and value in ['password', '12345678', 'Harsh@04']:
            weak.append(f"{var} (weak password detected)")
    
    if missing:
        print(f"\n⚠️  Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
    
    if weak:
        print(f"\n⚠️  Weak/insecure values detected:")
        for var in weak:
            print(f"   - {var}")
    
    return len(missing) == 0

def main():
    print("=" * 60)
    print("Law Firm Connect - Security Configuration Setup")
    print("=" * 60)
    print()
    
    # Step 1: Update JWT secret
    print("Step 1: Checking JWT Secret...")
    if not update_env_file():
        return
    print()
    
    # Step 2: Check all required vars
    print("Step 2: Validating Environment Variables...")
    all_set = check_required_env_vars()
    print()
    
    # Step 3: Security recommendations
    print("Step 3: Security Recommendations")
    print("=" * 60)
    print("""
📋 Next Steps:

1. ✅ JWT_SECRET configured
2. ⚠️  Rotate API Keys (currently exposed in git history):
   - GROQ_API_KEY: https://console.groq.com
   - DEEPSEEK_API_KEY: https://platform.deepseek.com

3. ⚠️  Update Database Passwords:
   - Neo4j: Change from current password
   - MongoDB: Verify URI is secure

4. ⚠️  Configure Production CORS:
   - Update ALLOWED_ORIGINS with production URL

5. 🔒 Install Dependencies:
   - Run: pip install -r requirements.txt
   
6. 🧪 Test Security:
   - Run: python test_security.py
    """)
    
    if all_set:
        print("✅ All required environment variables are set!")
    else:
        print("⚠️  Some environment variables need attention (see above)")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
