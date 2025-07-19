#!/usr/bin/env python3
"""
Comprehensive test script for the Perfect Search System
Tests all search functionality with proper relevance scoring
"""

import requests
import json
import base64
import time
from datetime import datetime

class SearchTester:
    def __init__(self):
        self.base_url = "http://localhost:8080"
        self.python_url = "http://localhost:5001"
        
        # Authentication
        credentials = "admin:IftaaAdmin2024!"
        self.auth_header = base64.b64encode(credentials.encode()).decode()
        self.headers = {"Authorization": f"Basic {self.auth_header}"}
    
    def test_health_endpoints(self):
        """Test that all services are running"""
        print("🏥 Testing Service Health...")
        
        endpoints = [
            (f"{self.base_url}/health", "NET API"),
            (f"{self.python_url}/health", "Python AI Service")
        ]
        
        all_healthy = True
        for url, name in endpoints:
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    print(f"   ✅ {name}: Healthy")
                else:
                    print(f"   ❌ {name}: Status {response.status_code}")
                    all_healthy = False
            except Exception as e:
                print(f"   ❌ {name}: {e}")
                all_healthy = False
        
        return all_healthy
    
    def test_search_query(self, query, language="ar", expected_relevance=0.3):
        """Test a single search query"""
        print(f"\n🔍 Testing Query: '{query}' (language: {language})")
        
        try:
            # Test search
            response = requests.get(
                f"{self.base_url}/api/fatwa/search",
                params={
                    "query": query,
                    "language": language,
                    "page": 1,
                    "pageSize": 10
                },
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code != 200:
                print(f"   ❌ Search failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
            
            data = response.json()
            results = data.get("Results", [])
            total = data.get("TotalResults", 0)
            
            print(f"   📊 Found {total} total results, showing {len(results)}")
            
            if not results:
                print("   ⚠️ No results found")
                return False
            
            # Check relevance scores
            relevance_scores = []
            high_relevance_count = 0
            
            for i, result in enumerate(results):
                fatwa = result.get("Fatwa", {})
                title = fatwa.get("Title", "")
                relevance = result.get("RelevanceScore", 0.0)
                relevance_scores.append(relevance)
                
                if relevance >= expected_relevance:
                    high_relevance_count += 1
                    print(f"   ✅ Result {i+1}: {title[:50]}... (Score: {relevance:.3f})")
                else:
                    print(f"   ⚠️ Result {i+1}: {title[:50]}... (Score: {relevance:.3f})")
            
            # Check if relevance scores are properly sorted
            is_sorted = all(relevance_scores[i] >= relevance_scores[i+1] for i in range(len(relevance_scores)-1))
            
            if is_sorted:
                print("   ✅ Results are properly sorted by relevance")
            else:
                print("   ❌ Results are NOT sorted by relevance")
            
            # Calculate quality metrics
            avg_relevance = sum(relevance_scores) / len(relevance_scores)
            max_relevance = max(relevance_scores)
            min_relevance = min(relevance_scores)
            
            print(f"   📈 Relevance Stats:")
            print(f"      Average: {avg_relevance:.3f}")
            print(f"      Max: {max_relevance:.3f}")
            print(f"      Min: {min_relevance:.3f}")
            print(f"      High Quality Results: {high_relevance_count}/{len(results)}")
            
            # Overall quality assessment
            if avg_relevance >= expected_relevance and is_sorted:
                print("   🎉 EXCELLENT search quality!")
                return True
            elif avg_relevance >= expected_relevance * 0.7:
                print("   👍 GOOD search quality")
                return True
            else:
                print("   ❌ POOR search quality")
                return False
                
        except Exception as e:
            print(f"   ❌ Search test failed: {e}")
            return False
    
    def test_comprehensive_search(self):
        """Test comprehensive search scenarios"""
        print("\n🧪 Comprehensive Search Testing")
        print("=" * 60)
        
        # Test cases with expected relevance thresholds
        test_cases = [
            # Original problematic query
            ("حكم صلاة الحائض", "ar", 0.4),
            
            # Other specific Islamic queries
            ("الحائض", "ar", 0.3),
            ("حيض", "ar", 0.3),
            ("طهارة", "ar", 0.3),
            ("وضوء", "ar", 0.3),
            ("صلاة", "ar", 0.2),
            ("زكاة", "ar", 0.3),
            ("صوم", "ar", 0.3),
            ("حج", "ar", 0.3),
            ("طلاق", "ar", 0.3),
            
            # English queries
            ("prayer", "en", 0.2),
            ("menstruation", "en", 0.3),
            ("fasting", "en", 0.3),
            ("divorce", "en", 0.3),
            
            # Multi-word queries
            ("صلاة المرأة", "ar", 0.4),
            ("أحكام الطهارة", "ar", 0.4),
            ("زكاة المال", "ar", 0.4),
            
            # Complex queries
            ("ما حكم الصلاة للحائض", "ar", 0.4),
            ("هل يجوز للحائض الصلاة", "ar", 0.4),
        ]
        
        passed_tests = 0
        total_tests = len(test_cases)
        
        for query, language, expected_relevance in test_cases:
            success = self.test_search_query(query, language, expected_relevance)
            if success:
                passed_tests += 1
            
            time.sleep(0.5)  # Small delay between requests
        
        print(f"\n📊 Test Results Summary:")
        print(f"   Passed: {passed_tests}/{total_tests} ({passed_tests/total_tests*100:.1f}%)")
        
        if passed_tests == total_tests:
            print("   🎉 ALL TESTS PASSED! Perfect search system is working excellently!")
        elif passed_tests >= total_tests * 0.8:
            print("   👍 MOST TESTS PASSED! Search system is working well!")
        elif passed_tests >= total_tests * 0.6:
            print("   ⚠️ SOME TESTS PASSED! Search system needs improvement!")
        else:
            print("   ❌ MANY TESTS FAILED! Search system has serious issues!")
        
        return passed_tests, total_tests
    
    def test_performance(self):
        """Test search performance"""
        print("\n⚡ Performance Testing")
        print("=" * 30)
        
        test_queries = [
            ("صلاة", "ar"),
            ("حكم الحائض", "ar"),
            ("زكاة المال", "ar"),
            ("prayer", "en"),
            ("fasting", "en")
        ]
        
        total_time = 0
        successful_requests = 0
        
        for query, language in test_queries:
            try:
                start_time = time.time()
                
                response = requests.get(
                    f"{self.base_url}/api/fatwa/search",
                    params={
                        "query": query,
                        "language": language,
                        "page": 1,
                        "pageSize": 10
                    },
                    headers=self.headers,
                    timeout=30
                )
                
                end_time = time.time()
                request_time = end_time - start_time
                
                if response.status_code == 200:
                    successful_requests += 1
                    total_time += request_time
                    print(f"   ✅ '{query}': {request_time:.2f}s")
                else:
                    print(f"   ❌ '{query}': Failed ({response.status_code})")
                    
            except Exception as e:
                print(f"   ❌ '{query}': Error - {e}")
        
        if successful_requests > 0:
            avg_time = total_time / successful_requests
            print(f"\n   📊 Performance Summary:")
            print(f"      Successful requests: {successful_requests}/{len(test_queries)}")
            print(f"      Average response time: {avg_time:.2f}s")
            
            if avg_time < 2.0:
                print("      🚀 EXCELLENT performance!")
            elif avg_time < 5.0:
                print("      👍 GOOD performance")
            else:
                print("      ⚠️ SLOW performance")
        
        return successful_requests, len(test_queries)
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 PERFECT SEARCH SYSTEM - COMPREHENSIVE TESTING")
        print("=" * 60)
        print(f"Started at: {datetime.now()}")
        
        # Test 1: Health check
        if not self.test_health_endpoints():
            print("\n❌ Services are not healthy. Please start the system first.")
            return False
        
        # Test 2: Comprehensive search testing
        search_passed, search_total = self.test_comprehensive_search()
        
        # Test 3: Performance testing
        perf_passed, perf_total = self.test_performance()
        
        # Final results
        print(f"\n🎯 FINAL RESULTS")
        print("=" * 30)
        print(f"Search Quality: {search_passed}/{search_total} tests passed")
        print(f"Performance: {perf_passed}/{perf_total} requests successful")
        
        overall_score = ((search_passed/search_total) + (perf_passed/perf_total)) / 2
        
        if overall_score >= 0.9:
            print("🎉 EXCELLENT! Perfect search system is working perfectly!")
        elif overall_score >= 0.7:
            print("👍 GOOD! Search system is working well!")
        elif overall_score >= 0.5:
            print("⚠️ FAIR! Search system needs some improvements!")
        else:
            print("❌ POOR! Search system needs major fixes!")
        
        print(f"\nCompleted at: {datetime.now()}")
        
        return overall_score >= 0.7

if __name__ == "__main__":
    tester = SearchTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Perfect Search System is ready for production!")
    else:
        print("\n❌ Perfect Search System needs more work!")