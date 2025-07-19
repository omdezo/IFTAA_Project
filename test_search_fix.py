#!/usr/bin/env python3
"""
Test script to verify search improvements for the query 'حكم صلاة الحائض'
"""

import requests
import json
import base64

def test_search_improvements():
    """Test the improved search functionality"""
    
    # API endpoints
    base_url = "http://localhost:8080"
    
    # Test credentials
    credentials = "admin:IftaaAdmin2024!"
    auth_header = base64.b64encode(credentials.encode()).decode()
    headers = {"Authorization": f"Basic {auth_header}"}
    
    # Test queries - focus on the problematic query
    test_queries = [
        ("حكم صلاة الحائض", "ar"),
        ("الحائض", "ar"),
        ("حيض", "ar"),
        ("طهارة المرأة", "ar"),
        ("صلاة المرأة", "ar")
    ]
    
    print("🧪 Testing Search Improvements")
    print("=" * 50)
    
    for query, lang in test_queries:
        print(f"\n🔍 Testing query: '{query}' (language: {lang})")
        
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
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("Results", [])
                total = data.get("TotalResults", 0)
                
                print(f"✅ Search successful! Found {total} results, showing {len(results)}")
                
                # Check relevance of results
                relevant_count = 0
                for i, result in enumerate(results):
                    fatwa = result.get("Fatwa", {})
                    title = fatwa.get("Title", "")
                    
                    # Check if result is relevant to the query
                    is_relevant = False
                    if query == "حكم صلاة الحائض":
                        # For this specific query, check if it's about menstruation and prayer
                        if any(term in title.lower() for term in ["حائض", "حيض", "نفساء", "طهارة"]):
                            is_relevant = True
                    elif query == "الحائض":
                        if any(term in title.lower() for term in ["حائض", "حيض", "نفساء"]):
                            is_relevant = True
                    elif query == "حيض":
                        if any(term in title.lower() for term in ["حائض", "حيض", "نفساء"]):
                            is_relevant = True
                    elif query == "طهارة المرأة":
                        if any(term in title.lower() for term in ["طهارة", "حائض", "نفساء", "وضوء"]):
                            is_relevant = True
                    elif query == "صلاة المرأة":
                        if any(term in title.lower() for term in ["صلاة", "حائض", "نفساء", "المرأة"]):
                            is_relevant = True
                    
                    if is_relevant:
                        relevant_count += 1
                        print(f"   ✅ Result {i+1}: {title[:60]}...")
                    else:
                        print(f"   ❌ Result {i+1}: {title[:60]}...")
                
                relevance_score = (relevant_count / len(results)) * 100 if results else 0
                print(f"   📊 Relevance Score: {relevance_score:.1f}% ({relevant_count}/{len(results)} relevant)")
                
                if relevance_score >= 80:
                    print("   🎉 Excellent relevance!")
                elif relevance_score >= 60:
                    print("   👍 Good relevance")
                elif relevance_score >= 40:
                    print("   ⚠️  Moderate relevance")
                else:
                    print("   ❌ Poor relevance")
                    
            else:
                print(f"❌ Search failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Search request failed: {e}")
        
        print("-" * 50)
    
    print("\n🎯 Testing Complete!")
    print("\nTo use the improved search:")
    print("1. Restart the Python AI service")
    print("2. Test with: {{base_url}}/api/fatwa/search?query=حكم صلاة الحائض&page=1&pageSize=10")
    print("3. The results should now be more relevant to menstruation and prayer rulings")

if __name__ == "__main__":
    test_search_improvements()