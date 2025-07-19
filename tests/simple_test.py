#!/usr/bin/env python3
"""
IFTAA Project Structure Test
Tests basic project structure and configuration files
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
        "config/config.sample.env",
        "src/backend/Program.cs",
        "src/ai-service/semantic_search_service.py",
        "src/backend/IFTAA_Project.csproj",
        "src/ai-service/requirements.txt",
        "README.md",
        ".gitignore"
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
    
    # Check config files (sample should exist, actual may not)
    config_sample = root_dir / "config/config.sample.env"
    if not config_sample.exists():
        print("FAIL: config.sample.env not found")
        return False
    
    # Check if sample config has required settings
    with open(config_sample, 'r') as f:
        content = f.read()
        if "MONGODB_URI" not in content:
            print("FAIL: MONGODB_URI not found in config.sample.env")
            return False
        if "EMBEDDING_MODEL" not in content:
            print("FAIL: EMBEDDING_MODEL not found in config.sample.env")
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
    print("IFTAA Project Structure Validation")
    print("=" * 40)
    print("This test validates the project structure and required files.")
    print("Run this before pushing to GitHub to ensure completeness.")
    print()
    
    tests = [
        ("Project Structure", test_structure),
        ("Configuration Files", test_config_files),
        ("Source Code", test_source_code),
        ("Data Files", test_data_files)
    ]
    
    results = []
    for name, test_func in tests:
        print(f"--- {name} ---")
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"ERROR: {name} test failed: {e}")
            results.append((name, False))
        print()
    
    print("=" * 40)
    print("Test Results Summary:")
    print("=" * 40)
    
    passed = 0
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\nSUCCESS: Project structure is complete and GitHub-ready!")
        print("- All required files are present")
        print("- Configuration templates are available") 
        print("- Safe to push to GitHub")
        return True
    else:
        print(f"\nWARNING: {len(results) - passed} test(s) failed.")
        print("Please fix the issues above before pushing to GitHub.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)