#!/usr/bin/env python3
"""
Migration script to help transition from old structure to clean structure.
This script helps identify any remaining files that need to be moved.
"""

import os
import shutil
import sys
from pathlib import Path

def check_project_structure():
    """Check if the project structure is clean"""
    root_dir = Path(__file__).parent.parent
    
    print("Checking project structure...")
    print(f"Root directory: {root_dir}")
    
    # Expected structure
    expected_dirs = [
        "src/backend",
        "src/ai-service", 
        "data/json",
        "data/vectors",
        "config",
        "deployment",
        "scripts",
        "tests",
        "tools/postman",
        "docs"
    ]
    
    # Check if directories exist
    missing_dirs = []
    for dir_path in expected_dirs:
        full_path = root_dir / dir_path
        if not full_path.exists():
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        print("Missing directories:")
        for dir_path in missing_dirs:
            print(f"   - {dir_path}")
        return False
    
    # Check for files that shouldn't be in root
    root_files = [f for f in os.listdir(root_dir) if f.endswith('.py')]
    if root_files:
        print("Python files found in root (should be in scripts/ or src/):")
        for file in root_files:
            print(f"   - {file}")
    
    # Check for important files in correct locations
    important_files = {
        "deployment/docker-compose.yml": "Docker Compose configuration",
        "config/config.env": "Environment configuration",
        "src/backend/Program.cs": ".NET Core entry point",
        "src/ai-service/semantic_search_service.py": "AI service main file",
        "README.md": "Project documentation"
    }
    
    missing_files = []
    for file_path, description in important_files.items():
        full_path = root_dir / file_path
        if not full_path.exists():
            missing_files.append(f"{file_path} ({description})")
    
    if missing_files:
        print("Missing important files:")
        for file_info in missing_files:
            print(f"   - {file_info}")
        return False
    
    print("Project structure looks clean!")
    return True

def suggest_improvements():
    """Suggest additional improvements"""
    print("\nSuggested improvements:")
    print("1. Add .gitignore file")
    print("2. Add CI/CD pipeline (.github/workflows/)")
    print("3. Add more comprehensive tests")
    print("4. Add API documentation in docs/")
    print("5. Add frontend application in src/frontend/")
    
def main():
    """Main function"""
    print("IFTAA Project Structure Checker")
    print("=" * 50)
    
    if check_project_structure():
        suggest_improvements()
        return 0
    else:
        print("\nProject structure needs attention!")
        return 1

if __name__ == "__main__":
    sys.exit(main())