#!/usr/bin/env python3
"""
FatwaQueryMaster CLI Interface

A command-line interface for testing and using the FatwaQueryMaster
query optimization system.

Author: Claude (FatwaQueryMaster)
Version: 1.0.0
"""

import argparse
import sys
import json
import requests
from typing import Dict, Any
from fatwa_query_master import FatwaQueryMaster, Language
import urllib.parse

class FatwaQueryCLI:
    """Command-line interface for FatwaQueryMaster"""
    
    def __init__(self):
        self.query_master = FatwaQueryMaster()
        self.base_url = "http://localhost:8080"
        self.auth_header = {
            "Authorization": "Basic YWRtaW46SWZ0YUFBZG1pbjIwMjQh"  # admin:IftaaAdmin2024!
        }
    
    def print_banner(self):
        """Print the CLI banner"""
        print("🤖 FatwaQueryMaster CLI")
        print("=" * 50)
        print("AI-driven query optimizer for Islamic Fatwa search")
        print("Version 1.0.0")
        print("=" * 50)
        print()
    
    def format_result(self, result) -> str:
        """Format optimization result for display"""
        output = []
        output.append(f"📝 Original Query: '{result.original_query}'")
        output.append(f"🔍 Optimized Query: '{result.optimized_query}'")
        output.append(f"🌐 Language: {result.detected_language.value.upper()}")
        output.append(f"📊 Confidence: {result.confidence:.2f}")
        output.append(f"🎯 Strategy: {result.search_strategy}")
        
        if result.spelling_corrections:
            output.append(f"✏️  Corrections: {', '.join(result.spelling_corrections)}")
        
        if result.suggested_alternates:
            output.append(f"🔄 Alternatives: {', '.join(result.suggested_alternates[:3])}")
        
        return "\n".join(output)
    
    def optimize_query(self, query: str, verbose: bool = False) -> None:
        """Optimize a single query"""
        try:
            result = self.query_master.optimize_query(query)
            
            if verbose:
                print(self.format_result(result))
            else:
                print(f"Original: '{query}'")
                print(f"Optimized: '{result.optimized_query}'")
                print(f"Language: {result.detected_language.value}")
            
        except Exception as e:
            print(f"❌ Error optimizing query: {e}")
    
    def interactive_mode(self):
        """Run in interactive mode"""
        print("🔄 Interactive Mode - Type 'quit' to exit")
        print("Enter your search queries and see the optimization results:")
        print()
        
        while True:
            try:
                query = input("Query: ").strip()
                
                if query.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                if not query:
                    continue
                
                print()
                self.optimize_query(query, verbose=True)
                print("-" * 30)
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def batch_optimize(self, queries: list, output_file: str = None):
        """Optimize multiple queries"""
        results = []
        
        for query in queries:
            try:
                result = self.query_master.optimize_query(query)
                results.append({
                    "original": result.original_query,
                    "optimized": result.optimized_query,
                    "language": result.detected_language.value,
                    "confidence": result.confidence,
                    "strategy": result.search_strategy,
                    "alternatives": result.suggested_alternates
                })
                
                print(f"✅ '{query}' -> '{result.optimized_query}'")
                
            except Exception as e:
                print(f"❌ Error with '{query}': {e}")
                results.append({
                    "original": query,
                    "error": str(e)
                })
        
        if output_file:
            try:
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)
                print(f"📁 Results saved to: {output_file}")
            except Exception as e:
                print(f"❌ Error saving results: {e}")
        
        return results
    
    def search_with_optimization(self, query: str, page: int = 1, page_size: int = 10) -> None:
        """Search with query optimization"""
        try:
            # Optimize the query
            result = self.query_master.optimize_query(query)
            
            print("🔍 Query Optimization:")
            print(self.format_result(result))
            print()
            
            # Generate search URL
            search_url = self.query_master.get_search_url(
                self.base_url, result, page, page_size
            )
            
            print(f"🔗 Search URL: {search_url}")
            print()
            
            # Perform the search
            print("🔄 Searching...")
            response = requests.get(search_url, headers=self.auth_header, timeout=30)
            
            if response.status_code == 200:
                search_results = response.json()
                total_results = search_results.get('totalResults', 0)
                results = search_results.get('results', [])
                
                print(f"📊 Found {total_results} results")
                print()
                
                for i, result in enumerate(results, 1):
                    fatwa = result.get('fatwa', {})
                    print(f"{i}. 📜 Fatwa #{fatwa.get('fatwaId', 'N/A')}")
                    print(f"   📋 Title: {fatwa.get('title', 'No title')[:100]}...")
                    print(f"   📝 Category: {fatwa.get('category', 'N/A')}")
                    print(f"   🏷️  Tags: {', '.join(fatwa.get('tags', []))}")
                    print()
                
            else:
                print(f"❌ Search failed: {response.status_code}")
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Search error: {e}")
    
    def test_suite(self):
        """Run a comprehensive test suite"""
        print("🧪 Running FatwaQueryMaster Test Suite")
        print("=" * 40)
        
        # Test queries in different languages and scenarios
        test_cases = [
            # Arabic queries
            ("صلاة", "Basic Arabic term"),
            ("الصلوة في المسجد", "Arabic with common misspelling"),
            ("هل يجوز أكل اللحم", "Arabic question"),
            ("زكاة المال والذهب", "Arabic compound query"),
            ("وضوء قبل الصلاة", "Arabic sequential terms"),
            
            # English queries
            ("prayer", "Basic English term"),
            ("prayer in mosque", "English phrase"),
            ("is it permissible to eat meat", "English question"),
            ("zakat on money and gold", "English compound query"),
            ("ablution before prayer", "English sequential terms"),
            
            # Mixed and edge cases
            ("صلاة prayer", "Mixed Arabic-English"),
            ("", "Empty query"),
            ("????????", "Invalid characters"),
            ("a", "Single character"),
            ("very long query about Islamic jurisprudence and legal rulings in various circumstances", "Long query"),
        ]
        
        passed = 0
        failed = 0
        
        for query, description in test_cases:
            try:
                result = self.query_master.optimize_query(query)
                print(f"✅ {description}: '{query}' -> '{result.optimized_query}'")
                print(f"   Language: {result.detected_language.value}, Confidence: {result.confidence:.2f}")
                passed += 1
            except Exception as e:
                print(f"❌ {description}: '{query}' -> Error: {e}")
                failed += 1
        
        print()
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        print(f"Success rate: {passed/(passed+failed)*100:.1f}%")
    
    def analyze_query(self, query: str):
        """Detailed analysis of a query"""
        print(f"🔬 Detailed Analysis of: '{query}'")
        print("=" * 50)
        
        # Language detection
        language, confidence = self.query_master.detect_language(query)
        print(f"🌐 Language Detection:")
        print(f"   Detected: {language.value}")
        print(f"   Confidence: {confidence:.2f}")
        
        # Character analysis
        arabic_chars = len([c for c in query if '\u0600' <= c <= '\u06FF'])
        english_chars = len([c for c in query if c.isalpha() and c.isascii()])
        total_chars = len(query.replace(' ', ''))
        
        print(f"📊 Character Analysis:")
        print(f"   Arabic chars: {arabic_chars}")
        print(f"   English chars: {english_chars}")
        print(f"   Total chars: {total_chars}")
        
        # Normalization (if Arabic)
        if language == Language.ARABIC:
            normalized = self.query_master.normalize_arabic_text(query)
            print(f"🔧 Arabic Normalization:")
            print(f"   Original: '{query}'")
            print(f"   Normalized: '{normalized}'")
            print(f"   Changed: {query != normalized}")
        
        # Spelling corrections
        corrections = self.query_master.correct_spelling(query, language)
        if corrections:
            print(f"✏️  Spelling Corrections:")
            for correction in corrections:
                print(f"   - '{correction}'")
        
        # Synonym expansion
        expansions = self.query_master.expand_synonyms(query, language)
        if expansions:
            print(f"🔄 Synonym Expansions:")
            for expansion in expansions:
                print(f"   - '{expansion}'")
        
        # Search strategy
        strategy = self.query_master.determine_search_strategy(query, language)
        print(f"🎯 Recommended Strategy: {strategy}")
        
        # Full optimization
        print(f"\n🔍 Full Optimization Result:")
        result = self.query_master.optimize_query(query)
        print(f"   Final Query: '{result.optimized_query}'")

def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description="FatwaQueryMaster CLI - AI-driven query optimizer for Islamic Fatwa search"
    )
    
    parser.add_argument(
        "query",
        nargs="?",
        help="Query to optimize (if not provided, enters interactive mode)"
    )
    
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Run in interactive mode"
    )
    
    parser.add_argument(
        "--search", "-s",
        action="store_true",
        help="Perform actual search after optimization"
    )
    
    parser.add_argument(
        "--batch", "-b",
        help="Process queries from file (one per line)"
    )
    
    parser.add_argument(
        "--output", "-o",
        help="Output file for batch results"
    )
    
    parser.add_argument(
        "--test", "-t",
        action="store_true",
        help="Run test suite"
    )
    
    parser.add_argument(
        "--analyze", "-a",
        action="store_true",
        help="Detailed analysis of the query"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose output"
    )
    
    parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="Page number for search (default: 1)"
    )
    
    parser.add_argument(
        "--page-size",
        type=int,
        default=10,
        help="Results per page (default: 10)"
    )
    
    args = parser.parse_args()
    
    cli = FatwaQueryCLI()
    cli.print_banner()
    
    try:
        if args.test:
            cli.test_suite()
        elif args.batch:
            # Load queries from file
            with open(args.batch, 'r', encoding='utf-8') as f:
                queries = [line.strip() for line in f if line.strip()]
            cli.batch_optimize(queries, args.output)
        elif args.interactive or not args.query:
            cli.interactive_mode()
        elif args.search:
            cli.search_with_optimization(args.query, args.page, args.page_size)
        elif args.analyze:
            cli.analyze_query(args.query)
        else:
            cli.optimize_query(args.query, args.verbose)
    
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()