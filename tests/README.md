# 🧪 IFTAA Tests

## Project Structure Validation

### `simple_test.py`

Validates the project structure and ensures all required files are present before pushing to GitHub.

**What it checks:**
- ✅ **Project directories** - All required folders exist
- ✅ **Configuration files** - Sample configs are available
- ✅ **Source code files** - Backend and AI service files
- ✅ **Data structure** - Required data directories

**Usage:**
```bash
# Run validation test
python tests/simple_test.py

# Should output: SUCCESS: Project structure is complete and GitHub-ready!
```

**When to run:**
- Before pushing to GitHub
- After major restructuring 
- When setting up new development environment
- To verify project completeness

This test ensures the project is safe for version control (no sensitive data) and complete for new developers.