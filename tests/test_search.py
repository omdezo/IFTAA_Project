#!/usr/bin/env python3
"""
Test Search Functionality
"""

import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_search():
    """Test search functionality"""
    base_url = "http://localhost:8080"
    
    # Test queries
    queries = [
        ("الصلاة", "ar"),
        ("prayer", "en"),
        ("زكاة", "ar"),
        ("fasting", "en")
    ]
    
    for query, lang in queries:
        logger.info(f"Testing search for: '{query}' (language: {lang})")
        
        try:
            # Make search request
            response = requests.get(
                f"{base_url}/api/fatwa/search",
                params={
                    "query": query,
                    "language": lang,
                    "page": 1,
                    "pageSize": 5
                },
                headers={"Authorization": "Basic YWRtaW46SWZ0YWFBZG1pbjIwMjQh"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("Results", [])
                total = data.get("TotalResults", 0)
                
                logger.info(f"✅ Search successful! Found {total} results, showing {len(results)}")
                
                # Print first result
                if results:
                    first_result = results[0]
                    fatwa = first_result.get("Fatwa", {})
                    logger.info(f"   First result: {fatwa.get('Title', 'No title')[:50]}...")
                else:
                    logger.warning("   No results returned")
                    
            else:
                logger.error(f"❌ Search failed with status: {response.status_code}")
                logger.error(f"   Response: {response.text}")
                
        except Exception as e:
            logger.error(f"❌ Search request failed: {e}")
        
        print("-" * 50)

def test_health():
    """Test health endpoints"""
    endpoints = [
        ("http://localhost:8080/health", "API Health"),
        ("http://localhost:5001/health", "Python AI Service Health")
    ]
    
    for url, name in endpoints:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                logger.info(f"✅ {name}: OK")
            else:
                logger.error(f"❌ {name}: Status {response.status_code}")
        except Exception as e:
            logger.error(f"❌ {name}: {e}")

if __name__ == "__main__":
    logger.info("🧪 Testing IFTAA Search System")
    
    logger.info("1. Testing health endpoints...")
    test_health()
    
    logger.info("\n2. Testing search functionality...")
    test_search()
    
    logger.info("\n🎉 Testing completed!")