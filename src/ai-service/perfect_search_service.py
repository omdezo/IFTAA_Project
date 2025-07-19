#!/usr/bin/env python3
"""
Perfect Search Service - Completely Rebuilt Search System
Fixes all fundamental issues with the search pipeline
"""

import os
import json
import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from pydantic import BaseModel, Field

# Database and AI imports
import pymongo
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from transformers import MarianMTModel, MarianTokenizer
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    fatwaId: int
    title: str
    question: str
    answer: str
    category: str
    tags: List[str]
    language: str
    relevanceScore: float
    createdAt: datetime
    updatedAt: datetime

class SearchResponse(BaseModel):
    results: List[SearchResult]
    totalCount: int
    page: int
    pageSize: int
    queryInfo: Dict[str, Any]

class PerfectSearchService:
    """
    Complete search service with proper error handling, relevance scoring,
    and optimized search pipeline
    """
    
    def __init__(self):
        self.mongodb_client = None
        self.db = None
        self.embedding_model = None
        self.milvus_client = None
        self.initialized = False
        
        # Configuration
        load_dotenv()
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin")
        self.database_name = os.getenv("MONGODB_DATABASE", "iftaa_db")
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
        
        # Initialize
        self.initialize()
    
    def initialize(self):
        """Initialize all components with proper error handling"""
        try:
            logger.info("🚀 Initializing Perfect Search Service...")
            
            # Initialize MongoDB
            self.mongodb_client = MongoClient(self.mongodb_uri)
            self.db = self.mongodb_client[self.database_name]
            
            # Test MongoDB connection
            self.db.command('ping')
            logger.info("✅ MongoDB connected successfully")
            
            # Initialize embedding model
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            logger.info("✅ Embedding model loaded successfully")
            
            # Test data availability
            fatwa_count = self.db.fatwas.count_documents({"is_active": True})
            logger.info(f"✅ Found {fatwa_count} active fatwas in database")
            
            if fatwa_count == 0:
                logger.warning("⚠️ No fatwas found in database!")
            
            # Initialize text search indexes
            self._ensure_text_indexes()
            
            self.initialized = True
            logger.info("🎉 Perfect Search Service initialized successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Perfect Search Service: {e}")
            self.initialized = False
            raise
    
    def _ensure_text_indexes(self):
        """Ensure proper text search indexes exist"""
        try:
            # Create text index for Arabic and English fields
            self.db.fatwas.create_index([
                ("title_ar", "text"),
                ("question_ar", "text"),
                ("answer_ar", "text"),
                ("title_en", "text"),
                ("question_en", "text"),
                ("answer_en", "text"),
                ("category", "text")
            ], default_language="none", name="fatwa_search_index")
            
            # Create other useful indexes
            self.db.fatwas.create_index([("fatwa_id", 1)], unique=True)
            self.db.fatwas.create_index([("is_active", 1)])
            self.db.fatwas.create_index([("category", 1)])
            
            logger.info("✅ Text search indexes created/verified")
            
        except Exception as e:
            logger.warning(f"⚠️ Could not create text indexes: {e}")
    
    def normalize_arabic_text(self, text: str) -> str:
        """Normalize Arabic text for better searching"""
        if not text:
            return ""
        
        # Remove diacritics
        text = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)
        
        # Normalize characters
        replacements = {
            'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
            'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي'
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Clean up spaces
        text = re.sub(r'\s+', ' ', text.strip())
        
        return text
    
    def detect_language(self, query: str) -> str:
        """Detect if query is Arabic or English"""
        if not query:
            return "ar"
        
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', query))
        english_chars = len(re.findall(r'[a-zA-Z]', query))
        
        if arabic_chars > english_chars:
            return "ar"
        elif english_chars > 0:
            return "en"
        else:
            return "ar"  # Default to Arabic
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text with error handling"""
        try:
            if not text or not self.embedding_model:
                return None
            
            embedding = self.embedding_model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {e}")
            return None
    
    def mongodb_text_search(self, query: str, limit: int = 50) -> List[Dict]:
        """Perform MongoDB text search with proper error handling"""
        try:
            # Strategy 1: MongoDB text search
            results = []
            
            # Try full text search first
            try:
                text_results = list(self.db.fatwas.find(
                    {"$text": {"$search": query}, "is_active": True}
                ).limit(limit))
                results.extend(text_results)
                logger.info(f"MongoDB text search found {len(text_results)} results")
            except Exception as e:
                logger.warning(f"MongoDB text search failed: {e}")
            
            # Strategy 2: Regex search for Arabic queries
            if len(results) < 10:  # If not enough results
                normalized_query = self.normalize_arabic_text(query)
                query_terms = normalized_query.split()
                
                if len(query_terms) > 0:
                    # Search for individual terms
                    regex_filters = []
                    for term in query_terms:
                        if len(term) > 2:  # Skip very short terms
                            regex_filters.append({
                                "$or": [
                                    {"title_ar": {"$regex": re.escape(term), "$options": "i"}},
                                    {"question_ar": {"$regex": re.escape(term), "$options": "i"}},
                                    {"answer_ar": {"$regex": re.escape(term), "$options": "i"}},
                                    {"category": {"$regex": re.escape(term), "$options": "i"}}
                                ]
                            })
                    
                    if regex_filters:
                        regex_results = list(self.db.fatwas.find({
                            "$and": regex_filters,
                            "is_active": True
                        }).limit(limit))
                        
                        # Add only new results
                        existing_ids = {f.get('fatwa_id') for f in results}
                        for result in regex_results:
                            if result.get('fatwa_id') not in existing_ids:
                                results.append(result)
                        
                        logger.info(f"Regex search found {len(regex_results)} additional results")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ MongoDB search failed: {e}")
            return []
    
    def calculate_relevance_score(self, query: str, fatwa: Dict) -> float:
        """Calculate relevance score for a fatwa"""
        try:
            score = 0.0
            query_lower = query.lower()
            normalized_query = self.normalize_arabic_text(query)
            query_terms = normalized_query.split()
            
            # Check title (highest weight)
            title_ar = fatwa.get('title_ar', '').lower()
            title_en = fatwa.get('title_en', '').lower()
            
            if query_lower in title_ar or query_lower in title_en:
                score += 10.0
            
            # Check for individual terms in title
            for term in query_terms:
                if len(term) > 2:
                    if term in title_ar or term in title_en:
                        score += 5.0
            
            # Check question (medium weight)
            question_ar = fatwa.get('question_ar', '').lower()
            question_en = fatwa.get('question_en', '').lower()
            
            if query_lower in question_ar or query_lower in question_en:
                score += 7.0
            
            # Check for individual terms in question
            for term in query_terms:
                if len(term) > 2:
                    if term in question_ar or term in question_en:
                        score += 3.0
            
            # Check answer (lower weight)
            answer_ar = fatwa.get('answer_ar', '').lower()
            answer_en = fatwa.get('answer_en', '').lower()
            
            if query_lower in answer_ar or query_lower in answer_en:
                score += 5.0
            
            # Check category
            category = fatwa.get('category', '').lower()
            if query_lower in category:
                score += 3.0
            
            # Normalize score (0-1 range)
            max_possible_score = 25.0
            normalized_score = min(score / max_possible_score, 1.0)
            
            return normalized_score
            
        except Exception as e:
            logger.error(f"❌ Relevance scoring failed: {e}")
            return 0.0
    
    def search_fatwas(self, query: str, language: str = "", page: int = 1, page_size: int = 10) -> SearchResponse:
        """
        Perfect search implementation with proper error handling and relevance scoring
        """
        try:
            logger.info(f"🔍 Perfect search: query='{query}', language='{language}', page={page}, pageSize={page_size}")
            
            if not self.initialized:
                raise Exception("Search service not initialized")
            
            if not query or not query.strip():
                raise Exception("Empty query provided")
            
            # Detect language if not provided
            if not language:
                language = self.detect_language(query)
            
            # Clean and normalize query
            cleaned_query = query.strip()
            
            # Perform MongoDB text search
            raw_results = self.mongodb_text_search(cleaned_query, limit=200)
            
            if not raw_results:
                logger.warning("No results found for query")
                return SearchResponse(
                    results=[],
                    totalCount=0,
                    page=page,
                    pageSize=page_size,
                    queryInfo={
                        "originalQuery": query,
                        "detectedLanguage": language,
                        "searchStrategy": "text_search",
                        "resultCount": 0
                    }
                )
            
            # Calculate relevance scores and sort
            scored_results = []
            for fatwa in raw_results:
                relevance_score = self.calculate_relevance_score(cleaned_query, fatwa)
                scored_results.append((fatwa, relevance_score))
            
            # Sort by relevance score (descending)
            scored_results.sort(key=lambda x: x[1], reverse=True)
            
            # Paginate results
            total_count = len(scored_results)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_results = scored_results[start_idx:end_idx]
            
            # Convert to response format
            search_results = []
            for fatwa, score in paginated_results:
                # Choose appropriate language fields
                if language == "en" and fatwa.get('title_en'):
                    title = fatwa.get('title_en', '')
                    question = fatwa.get('question_en', fatwa.get('question_ar', ''))
                    answer = fatwa.get('answer_en', fatwa.get('answer_ar', ''))
                else:
                    title = fatwa.get('title_ar', '')
                    question = fatwa.get('question_ar', '')
                    answer = fatwa.get('answer_ar', '')
                    language = "ar"
                
                search_result = SearchResult(
                    fatwaId=fatwa.get('fatwa_id'),
                    title=title,
                    question=question,
                    answer=answer,
                    category=fatwa.get('category', ''),
                    tags=fatwa.get('tags', []),
                    language=language,
                    relevanceScore=score,
                    createdAt=fatwa.get('created_at', datetime.utcnow()),
                    updatedAt=fatwa.get('updated_at', datetime.utcnow())
                )
                search_results.append(search_result)
            
            logger.info(f"✅ Perfect search completed: {len(search_results)} results returned")
            
            return SearchResponse(
                results=search_results,
                totalCount=total_count,
                page=page,
                pageSize=page_size,
                queryInfo={
                    "originalQuery": query,
                    "detectedLanguage": language,
                    "searchStrategy": "text_search_with_relevance",
                    "resultCount": len(search_results),
                    "totalFound": total_count
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Perfect search failed: {e}")
            return SearchResponse(
                results=[],
                totalCount=0,
                page=page,
                pageSize=page_size,
                queryInfo={
                    "originalQuery": query,
                    "detectedLanguage": language,
                    "searchStrategy": "failed",
                    "error": str(e)
                }
            )

# Global search service instance
search_service = PerfectSearchService()

def get_search_service():
    """Get the global search service instance"""
    return search_service