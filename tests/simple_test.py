#!/usr/bin/env python3
"""
Simple System Test for IFTAA Project
"""

import os
import sys
from pathlib import Path

def test_structure():
    """Test project structure"""
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
    
    missing = []
    for dir_path in required_dirs:
        if not (root_dir / dir_path).exists():
            missing.append(dir_path)
    
    if missing:
        print(f"FAIL: Missing directories: {missing}")
        return False
    
    # Required files
    required_files = [
        "deployment/docker-compose.yml",
        "config/config.env",
        "src/backend/Program.cs",
        "src/ai-service/semantic_search_service.py",
        "README.md"
    ]
    
    missing = []
    for file_path in required_files:
        if not (root_dir / file_path).exists():
            missing.append(file_path)
    
    if missing:
        print(f"FAIL: Missing files: {missing}")
        return False
    
    print("PASS: Project structure is correct!")
    return True

def test_config_files():
    """Test configuration files"""
    print("Testing configuration files...")
    
    root_dir = Path(__file__).parent.parent
    
    # Check docker-compose.yml
    compose_file = root_dir / "deployment/docker-compose.yml"
    if not compose_file.exists():
        print("FAIL: docker-compose.yml not found")
        return False
    
    # Check config.env
    config_file = root_dir / "config/config.env"
    if not config_file.exists():
        print("FAIL: config.env not found")
        return False
    
    # Check if config.env has required settings
    with open(config_file, 'r') as f:
        content = f.read()
        if "MONGODB_URI" not in content:
            print("FAIL: MONGODB_URI not found in config.env")
            return False
        if "EMBEDDING_MODEL" not in content:
            print("FAIL: EMBEDDING_MODEL not found in config.env")
            return False
    
    print("PASS: Configuration files are correct!")
    return True

def test_source_code():
    """Test source code files"""
    print("Testing source code files...")
    
    root_dir = Path(__file__).parent.parent
    
    # Check .NET backend
    backend_dir = root_dir / "src/backend"
    if not (backend_dir / "Program.cs").exists():
        print("FAIL: Program.cs not found in backend")
        return False
    
    if not (backend_dir / "IFTAA_Project.csproj").exists():
        print("FAIL: IFTAA_Project.csproj not found in backend")
        return False
    
    # Check Python AI service
    ai_service_dir = root_dir / "src/ai-service"
    if not (ai_service_dir / "semantic_search_service.py").exists():
        print("FAIL: semantic_search_service.py not found in ai-service")
        return False
    
    if not (ai_service_dir / "requirements.txt").exists():
        print("FAIL: requirements.txt not found in ai-service")
        return False
    
    print("PASS: Source code files are correct!")
    return True

def test_data_files():
    """Test data files"""
    print("Testing data files...")
    
    root_dir = Path(__file__).parent.parent
    
    # Check data directory structure
    data_dir = root_dir / "data"
    if not data_dir.exists():
        print("FAIL: data directory not found")
        return False
    
    json_dir = data_dir / "json"
    if not json_dir.exists():
        print("FAIL: data/json directory not found")
        return False
    
    # Check for at least one JSON file
    json_files = list(json_dir.glob("*.json"))
    if not json_files:
        print("FAIL: No JSON files found in data/json")
        return False
    
    print(f"PASS: Data files found - {len(json_files)} JSON files")
    return True

def main():
    """Run all tests"""
    print("IFTAA System Structure Test")
    print("=" * 40)
    
    tests = [
        ("Project Structure", test_structure),
        ("Configuration Files", test_config_files),
        ("Source Code", test_source_code),
        ("Data Files", test_data_files)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"\n--- {name} ---")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"ERROR: {name} test failed: {e}")
            results.append((name, False))
    
    print("\n" + "=" * 40)
    print("Test Results:")
    print("=" * 40)
    
    passed = 0
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("SUCCESS: All tests passed! Structure is clean.")
        return True
    else:
        print("WARNING: Some tests failed.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)