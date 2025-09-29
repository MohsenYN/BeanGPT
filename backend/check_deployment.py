#!/usr/bin/env python3
"""
Deployment verification script for BeanGPT backend.
Run this on your production server to check if everything is working.
"""

import sys
import importlib
import os

def check_python_version():
    """Check Python version."""
    print(f"🐍 Python version: {sys.version}")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    print("✅ Python version OK")
    return True

def check_dependencies():
    """Check if all required dependencies are available."""
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'openai',
        'requests',
        'pandas',
        'openpyxl',
        'orjson',
        'scikit-learn',
        'plotly',
        'kaleido',
        'scipy',
        'psutil',
        'aiofiles',
        'aiohttp'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - MISSING")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All dependencies available")
    return True

def check_environment_variables():
    """Check environment variables."""
    print("\n🔧 Environment Variables:")
    
    # Check Google Sheets config
    google_vars = [
        'GOOGLE_FORM_URL',
        'GOOGLE_FORM_SESSION_FIELD',
        'GOOGLE_FORM_QUESTION_FIELD',
        'GOOGLE_FORM_RATING_FIELD',
        'GOOGLE_FORM_COMMENT_FIELD',
        'GOOGLE_FORM_RESPONSE_FIELD'
    ]
    
    google_configured = True
    for var in google_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: Set")
        else:
            print(f"⚠️ {var}: Not set")
            google_configured = False
    
    if google_configured:
        print("✅ Google Sheets integration configured")
    else:
        print("⚠️ Google Sheets integration not fully configured")
    
    return True

def check_file_structure():
    """Check if all required files exist."""
    print("\n📁 File Structure:")
    
    required_files = [
        'main.py',
        'config.py',
        'routes/chat.py',
        'routes/ping.py',
        'routes/gene_search.py',
        'routes/health.py',
        'routes/feedback.py',
        'services/pipeline.py',
        'services/google_sheets.py',
        'utils/bean_data.py',
        'utils/ncbi_utils.py',
        'utils/openai_client.py'
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - MISSING")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ Missing files: {', '.join(missing_files)}")
        return False
    
    print("✅ All required files present")
    return True

def test_imports():
    """Test importing main modules."""
    print("\n🔄 Testing Imports:")
    
    try:
        from routes import chat, ping, gene_search, health
        print("✅ Core routes imported successfully")
    except Exception as e:
        print(f"❌ Error importing core routes: {e}")
        return False
    
    try:
        from routes import feedback
        print("✅ Feedback route imported successfully")
    except Exception as e:
        print(f"⚠️ Feedback route import failed: {e}")
        print("   (This is OK if you haven't deployed feedback system yet)")
    
    try:
        from services import pipeline
        print("✅ Pipeline service imported successfully")
    except Exception as e:
        print(f"❌ Error importing pipeline service: {e}")
        return False
    
    return True

def main():
    """Run all checks."""
    print("🧪 BeanGPT Deployment Verification")
    print("=" * 50)
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment Variables", check_environment_variables),
        ("File Structure", check_file_structure),
        ("Import Tests", test_imports)
    ]
    
    all_passed = True
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name}:")
        if not check_func():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All checks passed! Deployment looks good.")
        print("\nTo start the server:")
        print("uvicorn main:app --host 0.0.0.0 --port 8000")
    else:
        print("⚠️ Some checks failed. Please fix the issues above.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
