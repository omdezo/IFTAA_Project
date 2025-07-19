#!/usr/bin/env python3
"""
System Test Script for IFTAA Project
Tests the complete system functionality after structure cleanup
"""

import os
import sys
import time
import requests
import json
from pathlib import Path
import subprocess
import base64

def test_project_structure():
    """Test if the project structure is correct"""
    print("Testing project structure...")
    
    root_dir = Path(__file__).parent.parent
    
    # Required directories
    required_dirs = [
        "src/backend",
        "src/ai-service",
        "data/json",
        "config",
        "deployment",
        "scripts",
        "tests",
        "tools/postman"
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if not (root_dir / dir_path).exists():
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        print(f"Missing directories: {missing_dirs}")
        return False
    
    # Required files
    required_files = [
        "deployment/docker-compose.yml",
        "config/config.env",
        "src/backend/Program.cs",
        "src/ai-service/semantic_search_service.py",
        "README.md"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not (root_dir / file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"Missing files: {missing_files}")
        return False
    
    print("Project structure is correct!")
    return True

def test_docker_compose():
    """Test Docker Compose configuration"""
    print("Testing Docker Compose configuration...")
    
    try:
        os.chdir(Path(__file__).parent.parent / "deployment")
        
        # Test configuration
        result = subprocess.run(
            ["docker-compose", "config"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"Docker Compose config error: {result.stderr}")
            return False
        
        print("Docker Compose configuration is valid!")
        return True
        
    except subprocess.TimeoutExpired:
        print("❌ Docker Compose config test timed out")
        return False
    except Exception as e:
        print(f"❌ Docker Compose test error: {e}")
        return False

def test_dotnet_build():
    """Test .NET backend build"""
    print("🔧 Testing .NET backend build...")
    
    try:
        os.chdir(Path(__file__).parent.parent / "src/backend")
        
        # Test build
        result = subprocess.run(
            ["dotnet", "build", "--configuration", "Release"],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"❌ .NET build error: {result.stderr}")
            return False
        
        print("✅ .NET backend builds successfully!")
        return True
        
    except subprocess.TimeoutExpired:
        print("❌ .NET build test timed out")
        return False
    except Exception as e:
        print(f"❌ .NET build test error: {e}")
        return False

def test_python_dependencies():
    """Test Python AI service dependencies"""
    print("🐍 Testing Python dependencies...")
    
    try:
        os.chdir(Path(__file__).parent.parent / "src/ai-service")
        
        # Check if requirements file exists
        if not Path("requirements.txt").exists():
            print("❌ requirements.txt not found")
            return False
        
        # Test import of key dependencies
        try:
            import fastapi
            import uvicorn
            import pymongo
            import sentence_transformers
            print("✅ Python dependencies are available!")
            return True
        except ImportError as e:
            print(f"⚠️ Some Python dependencies missing: {e}")
            print("💡 Run: pip install -r requirements.txt")
            return False
        
    except Exception as e:
        print(f"❌ Python dependencies test error: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints if system is running"""
    print("🌐 Testing API endpoints...")
    
    base_url = "http://localhost:8080"
    python_url = "http://localhost:5001"
    
    # Basic auth header
    credentials = "admin:IftaaAdmin2024!"
    auth_header = base64.b64encode(credentials.encode()).decode()
    headers = {"Authorization": f"Basic {auth_header}"}
    
    tests = [
        {
            "name": "API Health Check",
            "url": f"{base_url}/health",
            "method": "GET",
            "headers": {}
        },
        {
            "name": "Python Service Health",
            "url": f"{python_url}/health",
            "method": "GET",
            "headers": {}
        },
        {
            "name": "System Stats",
            "url": f"{base_url}/api/system/stats",
            "method": "GET",
            "headers": headers
        },
        {
            "name": "Search API",
            "url": f"{base_url}/api/fatwa/search?query=prayer&page=1&pageSize=5",
            "method": "GET",
            "headers": headers
        }
    ]
    
    results = []
    for test in tests:
        try:
            response = requests.request(
                test["method"],
                test["url"],
                headers=test["headers"],
                timeout=10
            )
            
            if response.status_code == 200:
                results.append(f"✅ {test['name']}: OK")
            else:
                results.append(f"❌ {test['name']}: HTTP {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            results.append(f"⚠️ {test['name']}: Service not running")
        except requests.exceptions.Timeout:
            results.append(f"⚠️ {test['name']}: Timeout")
        except Exception as e:
            results.append(f"❌ {test['name']}: {str(e)}")
    
    for result in results:
        print(result)
    
    success_count = sum(1 for r in results if r.startswith("✅"))
    total_count = len(results)
    
    if success_count == total_count:
        print(f"✅ All {total_count} API tests passed!")
        return True
    elif success_count > 0:
        print(f"⚠️ {success_count}/{total_count} API tests passed")
        return False
    else:
        print("❌ All API tests failed - system may not be running")
        return False

def run_all_tests():
    """Run all tests"""
    print("IFTAA System Test Suite")
    print("=" * 50)
    
    tests = [
        ("Project Structure", test_project_structure),
        ("Docker Compose", test_docker_compose),
        (".NET Build", test_dotnet_build),
        ("Python Dependencies", test_python_dependencies),
        ("API Endpoints", test_api_endpoints)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n🔍 Running {name} test...")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ {name} test failed with exception: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Your IFTAA system is ready.")
        return True
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)