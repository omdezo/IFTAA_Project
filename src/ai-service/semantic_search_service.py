"""
IFTAA Semantic Search Service (FastAPI Edition)
- MongoDB for data persistence
- Milvus Lite for vector search (embedded)
- Hugging Face Transformers for local translation and embeddings
- FastAPI for the web framework
"""

import os
import logging
import json
import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
import numpy as np
from pydantic import BaseModel, Field
import threading
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor

# --- FastAPI Imports ---
from fastapi import FastAPI, Request, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


# --- Database and AI/ML Imports ---
import pymongo
from pymongo import MongoClient
from pymilvus import connections, Collection, utility, FieldSchema, CollectionSchema, DataType, MilvusClient
from sentence_transformers import SentenceTransformer
import torch
from transformers import MarianMTModel, MarianTokenizer
from dotenv import load_dotenv

# ==============================================================================
# 1. Logging and Configuration
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Configuration Class ---
class Config:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(script_dir, 'config.env')
    load_dotenv(dotenv_path=dotenv_path)

    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "iftaa_db")
    USE_MILVUS_LITE = os.getenv("USE_MILVUS_LITE", "true").lower() == "true"
    MILVUS_DB_PATH = os.getenv("MILVUS_DB_PATH", "/app/milvus_data/iftaa.db")
    MILVUS_HOST = os.getenv("MILVUS_HOST", "milvus")
    MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
    TRANSLATION_MODEL_AR_EN = os.getenv("TRANSLATION_MODEL_AR_EN", "Helsinki-NLP/opus-mt-ar-en")
    TRANSLATION_MODEL_EN_AR = os.getenv("TRANSLATION_MODEL_EN_AR", "Helsinki-NLP/opus-mt-en-ar")
    
    FATWA_COLLECTION_AR = os.getenv("FATWA_COLLECTION_AR", "fatwas_ar_v2")
    FATWA_COLLECTION_EN = os.getenv("FATWA_COLLECTION_EN", "fatwas_en_v2")
    
    TOP_K = int(os.getenv("TOP_K", "10"))
    EMBEDDING_DIM = 768
    BATCH_SIZE = 16
    MAX_WORKERS = 4
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "IftaaAdmin2024!")

# ==============================================================================
# 2. Pydantic Models (Data Contracts)
# ==============================================================================

class TranslationRequest(BaseModel):
    text: Dict[str, str] = Field(..., example={"title": "Title", "question": "Question", "answer": "Answer"})
    source_lang: str = Field(..., example="ar")
    target_lang: str = Field(..., example="en")

class TranslationResponse(BaseModel):
    title: str
    question: str
    answer: str

class EmbeddingRequest(BaseModel):
    text: str

class VectorSearchRequest(BaseModel):
    embedding: List[float]
    language: str = "ar"
    limit: int = 10

class FatwaDto(BaseModel):
    FatwaId: int
    Title: str
    Question: str
    Answer: str
    Category: str = ""
    Tags: List[str] = []
    Language: str = "ar"
    CreatedAt: datetime = None
    UpdatedAt: datetime = None

class FatwaResponseDto(BaseModel):
    fatwaId: int
    title: str
    question: str
    answer: str
    category: str
    tags: List[str]
    language: str
    createdAt: Union[str, datetime]
    updatedAt: Union[str, datetime]
    relevanceScore: float = 0.0

class SearchResultDto(BaseModel):
    results: List[FatwaResponseDto]
    totalCount: int
    page: int
    pageSize: int

# ==============================================================================
# 3. Core Services (Singleton Pattern)
# ==============================================================================

class ServiceManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ServiceManager, cls).__new__(cls)
            cls._instance.lock = threading.Lock()
            cls._instance.initialized = False
        return cls._instance
    
    def initialize(self):
        with self.lock:
            if self.initialized:
                return
            
            logger.info("Initializing Service Manager...")
            self.mongodb_client = MongoClient(Config.MONGODB_URI)
            self.db = self.mongodb_client[Config.MONGODB_DATABASE]
            
            # Initialize Milvus (Lite or Server)
            if Config.USE_MILVUS_LITE:
                logger.info(f"Using Milvus Lite with database: {Config.MILVUS_DB_PATH}")
                os.makedirs(os.path.dirname(Config.MILVUS_DB_PATH), exist_ok=True)
                self.milvus_client = MilvusClient(uri=Config.MILVUS_DB_PATH)
            else:
                logger.info(f"Connecting to Milvus server at {Config.MILVUS_HOST}:{Config.MILVUS_PORT}")
                connections.connect("default", host=Config.MILVUS_HOST, port=Config.MILVUS_PORT)
                self.milvus_client = None
            
            logger.info(f"Loading embedding model: {Config.EMBEDDING_MODEL}")
            self.embedding_model = SentenceTransformer(Config.EMBEDDING_MODEL)
            
            logger.info(f"Loading translation model AR->EN: {Config.TRANSLATION_MODEL_AR_EN}")
            self.translation_tokenizer_ar_en = MarianTokenizer.from_pretrained(Config.TRANSLATION_MODEL_AR_EN)
            self.translation_model_ar_en = MarianMTModel.from_pretrained(Config.TRANSLATION_MODEL_AR_EN)
            
            logger.info(f"Loading translation model EN->AR: {Config.TRANSLATION_MODEL_EN_AR}")
            self.translation_tokenizer_en_ar = MarianTokenizer.from_pretrained(Config.TRANSLATION_MODEL_EN_AR)
            self.translation_model_en_ar = MarianMTModel.from_pretrained(Config.TRANSLATION_MODEL_EN_AR)
            
            self.executor = ThreadPoolExecutor(max_workers=Config.MAX_WORKERS)
            
            self._ensure_collections_and_indexes()
            
            # Auto-initialize data if enabled and no data exists
            if os.getenv("AUTO_INITIALIZE_DATA", "false").lower() == "true":
                self._auto_initialize_data()
            
            self.initialized = True
            logger.info("✅ Service Manager initialized successfully.")

    def _ensure_collections_and_indexes(self):
        logger.info("Ensuring database collections and indexes exist...")
        
        # Create MongoDB indexes
        try:
            self.db.fatwas.create_index([("fatwa_id", pymongo.ASCENDING)], unique=True)
            logger.info("✅ Created unique index on fatwa_id")
        except Exception as e:
            logger.warning(f"⚠️ Could not create unique index on fatwa_id: {e}")
        
        try:
            self.db.fatwas.create_index([("is_active", pymongo.ASCENDING)])
            logger.info("✅ Created index on is_active")
        except Exception as e:
            logger.warning(f"⚠️ Could not create index on is_active: {e}")
        
        # Create text index for fallback search
        try:
            existing_indexes = self.db.fatwas.list_indexes()
            text_index_exists = False
            
            for index in existing_indexes:
                for field_name, field_spec in index.get('key', {}).items():
                    if field_spec == 'text':
                        text_index_exists = True
                        logger.info(f"✅ Text index already exists")
                        break
            
            if not text_index_exists:
                self.db.fatwas.create_index([
                    ("title_ar", "text"), 
                    ("question_ar", "text"), 
                    ("answer_ar", "text"),
                    ("title_en", "text"), 
                    ("question_en", "text"), 
                    ("answer_en", "text")
                ], default_language="none", name="fatwa_text_index")
                logger.info("✅ Created text index for search fallback")
        except Exception as e:
            logger.warning(f"⚠️ Could not create text index: {e}")
        
        # Create Milvus collections
        if Config.USE_MILVUS_LITE:
            self._create_milvus_lite_collections()
        else:
            self._create_milvus_server_collections()

    def _create_milvus_lite_collections(self):
        """Create collections in Milvus Lite"""
        for collection_name in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
            if not self.milvus_client.has_collection(collection_name):
                logger.info(f"Creating Milvus Lite collection: {collection_name}")
                self.milvus_client.create_collection(
                    collection_name=collection_name,
                    dimension=Config.EMBEDDING_DIM,
                    metric_type="IP",
                    consistency_level="Strong"
                )
                logger.info(f"✅ Created Milvus Lite collection: {collection_name}")

    def _create_milvus_server_collections(self):
        """Create collections in Milvus Server"""
        for collection_name in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
            if not utility.has_collection(collection_name):
                fields = [
                    FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=False),
                    FieldSchema(name="mongo_id", dtype=DataType.VARCHAR, max_length=24),
                    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=Config.EMBEDDING_DIM)
                ]
                schema = CollectionSchema(fields, f"{collection_name} Collection")
                Collection(collection_name, schema)
                logger.info(f"✅ Created Milvus collection: {collection_name}")
                
                collection = Collection(collection_name)
                index_params = {"metric_type": "IP", "index_type": "IVF_FLAT", "params": {"nlist": 1024}}
                collection.create_index(field_name="embedding", index_params=index_params)
                logger.info(f"✅ Created index for collection: {collection_name}")
            
            # Load collection into memory
            try:
                Collection(collection_name).load()
                logger.info(f"🚀 Loaded collection into memory: {collection_name}")
            except Exception as e:
                logger.warning(f"⚠️ Could not load collection {collection_name}: {e}")

    def _auto_initialize_data(self):
        """Auto-initialize data if database is empty"""
        try:
            # Check if data exists
            count = self.db.fatwas.count_documents({})
            if count > 0:
                logger.info(f"✅ Database already contains {count} fatwas. Skipping auto-initialization.")
                return
            
            logger.info("🔄 Database is empty. Starting auto-initialization...")
            
            # Import and run data loader
            import subprocess
            import sys
            
            script_path = os.path.join(os.path.dirname(__file__), "smart_data_loader.py")
            
            # Run the data loader
            result = subprocess.run([
                sys.executable, script_path, "--docker", "--force"
            ], capture_output=True, text=True, timeout=600)
            
            if result.returncode == 0:
                final_count = self.db.fatwas.count_documents({})
                logger.info(f"✅ Auto-initialization completed successfully! Loaded {final_count} fatwas.")
            else:
                logger.error(f"❌ Auto-initialization failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"❌ Auto-initialization error: {e}")

# ==============================================================================
# 4. FastAPI Lifespan Event Handler
# ==============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting up IFTAA Semantic Search API...")
    ServiceManager().initialize()
    yield
    # Shutdown
    logger.info("🔄 Shutting down IFTAA Semantic Search API...")

# --- FastAPI App Setup ---
app = FastAPI(
    title="IFTAA Semantic Search API",
    description="A smart search system for Islamic Fatwas with bilingual support.",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_service_manager() -> ServiceManager:
    manager = ServiceManager()
    if not manager.initialized:
        manager.initialize()
    return manager

# ==============================================================================
# 5. Core Logic (Translation, Embedding, Searching)
# ==============================================================================

class CoreLogic:
    def __init__(self, services: ServiceManager = Depends(get_service_manager)):
        self.services = services

    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text between languages"""
        try:
            if source_lang == "ar" and target_lang == "en":
                tokenizer = self.services.translation_tokenizer_ar_en
                model = self.services.translation_model_ar_en
            elif source_lang == "en" and target_lang == "ar":
                tokenizer = self.services.translation_tokenizer_en_ar
                model = self.services.translation_model_en_ar
            else:
                logger.warning(f"Unsupported language pair: {source_lang} -> {target_lang}")
                return text
                
            inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
            translated_tokens = model.generate(**inputs)
            return tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text  # Fallback to original text

    def translate_fatwa(self, fatwa_text: Dict[str, str], source_lang: str, target_lang: str) -> Dict[str, str]:
        """Translate all fatwa text fields"""
        try:
            result = {}
            for field, text in fatwa_text.items():
                if text:
                    result[field] = self.translate_text(text, source_lang, target_lang)
                else:
                    result[field] = ""
            return result
        except Exception as e:
            logger.error(f"Fatwa translation failed: {e}")
            return fatwa_text  # Fallback to original

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        try:
            return self.services.embedding_model.encode(text, normalize_embeddings=True).tolist()
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Return zero vector as fallback
            return [0.0] * Config.EMBEDDING_DIM

    def search_vectors(self, query_embedding: List[float], language: str, limit: int) -> List[int]:
        """Search for similar vectors in Milvus"""
        collection_name = Config.FATWA_COLLECTION_AR if language == "ar" else Config.FATWA_COLLECTION_EN
        
        try:
            if Config.USE_MILVUS_LITE:
                results = self.services.milvus_client.search(
                    collection_name=collection_name,
                    data=[query_embedding],
                    limit=limit,
                    output_fields=["pk"]
                )
                if results and len(results) > 0:
                    return [hit.get("pk") for hit in results[0]]
                return []
            else:
                collection = Collection(collection_name)
                search_params = {"metric_type": "IP", "params": {"nprobe": 32}}  # Increased for better accuracy
                results = collection.search(
                    data=[query_embedding], 
                    anns_field="embedding",
                    param=search_params,
                    limit=limit,
                    output_fields=["pk"]
                )
                if results and len(results) > 0:
                    return [hit.entity.get('pk') for hit in results[0]]
                return []
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

    def get_fatwas_by_ids(self, FatwaIds: List[int], language: str = "", query: str = "") -> List[FatwaResponseDto]:
        """Retrieve fatwas by IDs from MongoDB with relevance scoring"""
        try:
            fatwas = list(self.services.db.fatwas.find({"fatwa_id": {"$in": FatwaIds}}))
            
            # Sort fatwas to match the order of FatwaIds
            id_to_index = {id: i for i, id in enumerate(FatwaIds)}
            fatwas.sort(key=lambda x: id_to_index.get(x.get('fatwa_id'), float('inf')))
            
            # Format for response with relevance scoring
            result = []
            for fatwa in fatwas:
                # Choose the appropriate language fields
                if language == "en" and fatwa.get('title_en'):
                    title = fatwa.get('title_en', '')
                    question = fatwa.get('question_en', fatwa.get('question_ar', ''))
                    answer = fatwa.get('answer_en', fatwa.get('answer_ar', ''))
                else:
                    title = fatwa.get('title_ar', '')
                    question = fatwa.get('question_ar', '')
                    answer = fatwa.get('answer_ar', '')
                    language = "ar"
                
                # Calculate relevance score
                relevance_score = self.calculate_relevance_score(query, fatwa) if query else 0.5
                
                response_dto = FatwaResponseDto(
                    fatwaId=fatwa.get('fatwa_id'),
                    title=title,
                    question=question,
                    answer=answer,
                    category=fatwa.get('category', ''),
                    tags=fatwa.get('tags', []),
                    language=language,
                    createdAt=fatwa.get('created_at', datetime.utcnow()),
                    updatedAt=fatwa.get('updated_at', datetime.utcnow()),
                    relevanceScore=relevance_score
                )
                
                result.append(response_dto)
            
            # Sort by relevance score (descending)
            result.sort(key=lambda x: x.relevanceScore, reverse=True)
            
            return result
        
        except Exception as e:
            logger.error(f"Error retrieving fatwas by IDs: {e}")
            return []
    
    def calculate_relevance_score(self, query: str, fatwa: Dict) -> float:
        """Calculate relevance score for a fatwa based on query match"""
        try:
            if not query:
                return 0.5
            
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
            
            return max(normalized_score, 0.1)  # Minimum score of 0.1
            
        except Exception as e:
            logger.error(f"Relevance scoring failed: {e}")
            return 0.1
    
    def _calculate_total_search_results(self, query: str, language: str, combined_ids: List[int] = None) -> int:
        """Calculate the total number of search results for proper pagination"""
        try:
            # If we have combined_ids from search, use those for accurate count
            if combined_ids:
                logger.info(f"Using actual search results count: {len(combined_ids)}")
                return len(combined_ids)
            
            # Otherwise estimate based on the search strategy used
            normalized_query = self.normalize_arabic_text(query)
            query_terms = normalized_query.split()
            
            # Create a comprehensive search filter that matches our search logic
            search_filter = {
                "$or": [
                    # Exact phrase matching
                    {"title_ar": {"$regex": re.escape(query), "$options": "i"}},
                    {"question_ar": {"$regex": re.escape(query), "$options": "i"}},
                    {"answer_ar": {"$regex": re.escape(query), "$options": "i"}},
                    {"category": {"$regex": re.escape(query), "$options": "i"}},
                    
                    # English fields if language is English
                    *([
                        {"title_en": {"$regex": re.escape(query), "$options": "i"}},
                        {"question_en": {"$regex": re.escape(query), "$options": "i"}},
                        {"answer_en": {"$regex": re.escape(query), "$options": "i"}}
                    ] if language == "en" else []),
                    
                    # Individual term matching
                    *([
                        {
                            "$or": [
                                {"title_ar": {"$regex": re.escape(term), "$options": "i"}},
                                {"question_ar": {"$regex": re.escape(term), "$options": "i"}},
                                {"answer_ar": {"$regex": re.escape(term), "$options": "i"}},
                                {"category": {"$regex": re.escape(term), "$options": "i"}}
                            ]
                        } for term in query_terms if len(term) > 2
                    ])
                ],
                "is_active": True
            }
            
            # Count total matching documents
            total_count = self.services.db.fatwas.count_documents(search_filter)
            logger.info(f"Total search results calculated via filter: {total_count}")
            
            return total_count
            
        except Exception as e:
            logger.error(f"Error calculating total search results: {e}")
            # More conservative fallback
            try:
                # Simple text search fallback
                fallback_filter = {"$text": {"$search": query}, "is_active": True}
                fallback_count = self.services.db.fatwas.count_documents(fallback_filter)
                logger.info(f"Using fallback text search count: {fallback_count}")
                return fallback_count
            except:
                # Last resort - return reasonable default based on actual search
                return 50

    def detect_language(self, query: str) -> tuple[str, float]:
        """
        Detect the language of the query (Arabic or English)
        
        Returns:
            tuple: (language_code, confidence_score)
        """
        if not query or not query.strip():
            return "unknown", 0.0
        
        # Remove punctuation and whitespace
        clean_query = re.sub(r'[^\w\s]', '', query.strip())
        
        # Count Arabic characters
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', clean_query))
        
        # Count English characters
        english_chars = len(re.findall(r'[a-zA-Z]', clean_query))
        
        # Count total characters
        total_chars = len(re.sub(r'\s', '', clean_query))
        
        if total_chars == 0:
            return "unknown", 0.0
        
        # Calculate percentages
        arabic_percentage = arabic_chars / total_chars
        english_percentage = english_chars / total_chars
        
        # Determine language based on character distribution
        if arabic_percentage > 0.3:
            confidence = min(arabic_percentage * 1.2, 1.0)
            return "ar", confidence
        elif english_percentage > 0.5:
            confidence = min(english_percentage * 1.1, 1.0)
            return "en", confidence
        else:
            return "unknown", 0.3

    def normalize_arabic_text(self, text: str) -> str:
        """
        Normalize Arabic text by removing diacritics and standardizing characters
        """
        if not text:
            return ""
        
        # Remove diacritics (tashkeel)
        normalized = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)
        
        # Standardize characters
        replacements = {
            'أ': 'ا', 'إ': 'ا', 'آ': 'ا',  # Standardize alif
            'ة': 'ه',  # Standardize taa marbuta
            'ى': 'ي',  # Standardize alif maqsura
            'ؤ': 'و',  # Standardize waw with hamza
            'ئ': 'ي',  # Standardize yaa with hamza
        }
        
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)
        
        # Remove extra spaces
        normalized = re.sub(r'\s+', ' ', normalized.strip())
        
        return normalized

    def correct_spelling(self, query: str, language: str) -> str:
        """
        Correct common spelling mistakes
        """
        # Common Arabic misspellings
        arabic_corrections = {
            "صلوة": "صلاة",
            "زكوة": "زكاة",
            "صيام": "صوم",
            "الصيام": "الصوم",
            "صوره": "صورة",
            "مسئله": "مسألة",
            "مسئلة": "مسألة",
            "اسئله": "أسئلة",
            "اسئلة": "أسئلة",
            "حايض": "حائض",
            "الحايض": "الحائض",
            "حيظ": "حيض",
            "نفساء": "نفساء",
            "طهاره": "طهارة",
            "الطهاره": "الطهارة",
        }
        
        # Common English misspellings
        english_corrections = {
            "moslem": "muslim",
            "mohammedan": "muslim",
            "namaz": "prayer",
            "salaat": "salah",
            "zakaat": "zakat",
        }
        
        corrected_query = query
        
        if language == "ar":
            # Apply Arabic normalization
            corrected_query = self.normalize_arabic_text(query)
            
            # Apply Arabic corrections
            for wrong, correct in arabic_corrections.items():
                corrected_query = corrected_query.replace(wrong, correct)
        
        elif language == "en":
            # Apply English corrections
            words = corrected_query.split()
            corrected_words = []
            for word in words:
                word_lower = word.lower()
                if word_lower in english_corrections:
                    corrected_words.append(english_corrections[word_lower])
                else:
                    corrected_words.append(word)
            corrected_query = ' '.join(corrected_words)
        
        return corrected_query

    def expand_query(self, query: str) -> str:
        """
        Enhanced query expansion with AI-driven optimization
        
        This is the FatwaQueryMaster implementation integrated into your existing system
        """
        # Step 1: Detect language
        detected_lang, confidence = self.detect_language(query)
        logger.info(f"Detected language: {detected_lang} (confidence: {confidence:.2f})")
        
        # Step 2: Correct spelling
        corrected_query = self.correct_spelling(query, detected_lang)
        if corrected_query != query:
            logger.info(f"Spelling corrected: '{query}' -> '{corrected_query}'")
        
        # Step 3: Enhanced Arabic query expansions
        arabic_query_expansions = {
            # Prayer related - Enhanced
            "اذان": "اذان نداء مؤذن صلاة وقت أذان",
            "أذان": "أذان نداء مؤذن صلاة وقت اذان",
            "صلاة": "صلاة فريضة نافلة ركعة سجود قيام عبادة",
            "الصلاة": "الصلاة صلاة فريضة نافلة ركعة سجود قيام عبادة",
            "صلى": "صلى أدى قام ركع سجد",
            "مصلى": "مصلى مسجد جامع معبد محراب",
            "صلاة الحائض": "صلاة الحائض حيض نفاس طهارة المرأة الحائض",
            "الحائض": "الحائض حيض نفاس المرأة الحائض طهارة",
            "حيض": "حيض حائض نفاس نفساء طهارة المرأة",
            
            # Fasting related - Enhanced
            "صوم": "صوم صيام رمضان إفطار سحور إمساك",
            "الصوم": "الصوم صوم صيام رمضان إفطار سحور إمساك",
            "صيام": "صيام صوم رمضان إفطار سحور إمساك",
            "صائم": "صائم صايم ممسك متعبد",
            "رمضان": "رمضان شهر رمضان الشهر الكريم شهر الصيام",
            "إفطار": "إفطار فطر مغرب طعام",
            "سحور": "سحور سحر فجر طعام",
            
            # Zakat related - Enhanced  
            "زكاة": "زكاة صدقة إحسان بر خير مال",
            "الزكاة": "الزكاة زكاة صدقة إحسان بر خير مال",
            "نصاب": "نصاب حد مقدار كمية مال",
            "فقير": "فقير مسكين محتاج معوز مستحق",
            "صدقة": "صدقة زكاة إحسان بر خير عطاء",
            
            # Hajj related - Enhanced
            "حج": "حج حجة مناسك عمرة طواف سعي",
            "الحج": "الحج حج حجة مناسك عمرة طواف سعي",
            "عمرة": "عمرة حج مناسك طواف سعي",
            "طواف": "طواف دوران لف حول الكعبة",
            "سعي": "سعي هرولة جري ركض الصفا المروة",
            "عرفة": "عرفة عرفات الموقف المشعر",
            "مزدلفة": "مزدلفة المشعر الحرام",
            "منى": "منى مشعر رمي الجمرات",
            
            # Purity related - Enhanced
            "طهارة": "طهارة نظافة وضوء غسل تطهر",
            "الطهارة": "الطهارة طهارة نظافة وضوء غسل تطهر",
            "وضوء": "وضوء طهارة غسل استعداد تطهر",
            "غسل": "غسل طهارة وضوء تطهر نظافة",
            "نجاسة": "نجاسة قذارة دنس تلوث شائبة",
            "طاهر": "طاهر نظيف مطهر",
            
            # Marriage related - Enhanced
            "نكاح": "نكاح زواج تزوج عقد قران",
            "الزواج": "الزواج النكاح التزوج العقد القران",
            "زواج": "زواج نكاح تزوج عقد قران",
            "مهر": "مهر صداق عطية هدية مال",
            "طلاق": "طلاق فسخ انفصال تفريق خلع",
            "خلع": "خلع طلاق فسخ انفصال",
            "عدة": "عدة انتظار فترة زمن",
            "نفقة": "نفقة مال صرف إنفاق",
            
            # General Islamic terms - Enhanced
            "حكم": "حكم فتوى قرار رأي جواب إجابة شرعي",
            "حكم الحائض": "حكم الحائض حيض نفاس طهارة المرأة الحائض",
            "حكم صلاة الحائض": "حكم صلاة الحائض حيض نفاس طهارة المرأة الحائض صلاة",
            "حلال": "حلال مباح جائز مسموح مشروع",
            "حرام": "حرام ممنوع محظور غير جائز مكروه",
            "مكروه": "مكروه غير مستحب منهي",
            "مستحب": "مستحب مرغوب مطلوب مندوب",
            "واجب": "واجب فرض لازم مطلوب",
            "مسجد": "مسجد جامع مصلى بيت الله دار العبادة",
            "الجامع": "الجامع المسجد مسجد مصلى",
            "قرآن": "قرآن القرآن الكريم الكتاب المصحف التنزيل",
            "القرآن": "القرآن قرآن الكريم الكتاب المصحف التنزيل",
            "سنة": "سنة حديث أثر رواية نقل",
            "حديث": "حديث سنة أثر رواية نقل",
            "فقه": "فقه علم معرفة أحكام مذهب",
            "عالم": "عالم فقيه مفتي شيخ إمام",
            "مفتي": "مفتي عالم فقيه شيخ إمام",
            "شيخ": "شيخ عالم فقيه مفتي إمام",
            "إمام": "إمام عالم فقيه مفتي شيخ قائد",
            "فتوى": "فتوى رأي حكم قول إجابة",
            "حكم": "حكم قرار فتوى قول رأي",
            
            # Common words - Enhanced
            "سؤال": "سؤال استفسار مسألة موضوع قضية",
            "استفسار": "استفسار سؤال مسألة موضوع",
            "مسألة": "مسألة سؤال استفسار موضوع قضية",
            "جواب": "جواب إجابة رد حل توضيح",
            "إجابة": "إجابة جواب رد حل توضيح",
            "شرح": "شرح تفسير بيان توضيح تعليل",
            "تفسير": "تفسير شرح بيان توضيح",
            "بيان": "بيان شرح تفسير توضيح",
            "توضيح": "توضيح شرح تفسير بيان",
            
            # Additional Islamic concepts
            "توحيد": "توحيد عقيدة إيمان وحدانية",
            "إيمان": "إيمان عقيدة توحيد اعتقاد",
            "تقوى": "تقوى خوف ورع احتراز",
            "جهاد": "جهاد كفاح نضال قتال",
            "صبر": "صبر احتمال تحمل صابر",
            "شكر": "شكر حمد امتنان شاكر",
            "دعاء": "دعاء طلب سؤال استغاثة",
            "ذكر": "ذكر تسبيح تحميد تكبير",
            "استغفار": "استغفار توبة ندم اعتذار",
            "توبة": "توبة استغفار ندم اعتذار إنابة",
        }
        
        # Step 4: Enhanced English query expansions
        english_query_expansions = {
            # Prayer related
            "prayer": "prayer salah salat worship prostration bow prayers",
            "salah": "salah prayer salat worship prostration",
            "salat": "salat prayer salah worship prostration",
            "pray": "pray worship prostrate bow kneel supplicate",
            "worship": "worship prayer salah pray prostrate",
            "mosque": "mosque masjid church temple place worship",
            "masjid": "masjid mosque place worship",
            "imam": "imam leader guide cleric preacher",
            
            # Fasting related
            "fasting": "fasting fast sawm abstinence ramadan",
            "fast": "fast fasting sawm abstain refrain",
            "sawm": "sawm fasting fast abstinence",
            "ramadan": "ramadan ramzan holy month fasting month",
            "iftar": "iftar breaking fast sunset meal evening meal",
            "suhoor": "suhoor pre-dawn meal early morning meal dawn meal",
            
            # Zakat related
            "zakat": "zakat charity alms donation giving",
            "charity": "charity zakat alms donation sadaqah",
            "alms": "alms zakat charity donation giving",
            "donation": "donation charity zakat alms giving",
            "poor": "poor needy destitute indigent underprivileged",
            "needy": "needy poor destitute indigent",
            "wealth": "wealth money riches property assets",
            
            # Hajj related
            "hajj": "hajj pilgrimage holy journey mecca visit",
            "pilgrimage": "pilgrimage hajj holy journey sacred travel",
            "mecca": "mecca makkah holy city kaaba",
            "makkah": "makkah mecca holy city kaaba",
            "kaaba": "kaaba kabah holy house sacred cube",
            "umrah": "umrah hajj pilgrimage lesser pilgrimage",
            
            # Purity related
            "purity": "purity cleanliness purification wudu ablution",
            "ablution": "ablution wudu washing purification cleansing",
            "wudu": "wudu ablution washing purification",
            "impurity": "impurity najasah uncleanness pollution contamination",
            "clean": "clean pure purified tahir",
            
            # Marriage related
            "marriage": "marriage nikah wedding matrimony union",
            "nikah": "nikah marriage wedding matrimony",
            "wedding": "wedding marriage nikah matrimony",
            "divorce": "divorce talaq separation dissolution split",
            "talaq": "talaq divorce separation dissolution",
            "husband": "husband spouse partner mate consort",
            "wife": "wife spouse partner mate consort",
            "dowry": "dowry mahr gift money property",
            
            # General Islamic terms
            "halal": "halal permissible lawful allowed legitimate",
            "haram": "haram forbidden prohibited unlawful impermissible",
            "permissible": "permissible halal lawful allowed legitimate",
            "forbidden": "forbidden haram prohibited unlawful",
            "quran": "quran koran holy book scripture revelation",
            "koran": "koran quran holy book scripture",
            "sunnah": "sunnah hadith tradition practice way",
            "hadith": "hadith sunnah tradition saying narration",
            "scholar": "scholar alim mufti sheikh learned person",
            "mufti": "mufti scholar alim sheikh",
            "sheikh": "sheikh scholar alim mufti",
            "fatwa": "fatwa ruling opinion judgment decree",
            "ruling": "ruling fatwa judgment decision verdict",
            
            # Common words
            "question": "question query inquiry ask problem",
            "answer": "answer response reply solution explanation",
            "explanation": "explanation clarification interpretation description",
            "clarification": "clarification explanation interpretation",
            "interpretation": "interpretation explanation clarification",
            "judgment": "judgment ruling decision verdict decree",
            "opinion": "opinion view ruling judgment",
            
            # Additional concepts
            "faith": "faith belief iman conviction",
            "belief": "belief faith iman conviction",
            "worship": "worship ibadah prayer service",
            "guidance": "guidance direction instruction teaching",
            "teaching": "teaching guidance instruction lesson",
            "knowledge": "knowledge ilm learning education",
            "wisdom": "wisdom hikma knowledge understanding",
            "understanding": "understanding comprehension wisdom",
        }
        
        # Step 4: Apply expansions based on detected language
        expanded_query = corrected_query
        
        if detected_lang == "ar":
            # Apply Arabic expansions
            for term, expansion in arabic_query_expansions.items():
                if term in corrected_query:
                    expanded_query = f"{corrected_query} {expansion}"
                    logger.info(f"Arabic expansion applied for term: {term}")
                    break
        elif detected_lang == "en":
            # Apply English expansions
            query_lower = corrected_query.lower()
            for term, expansion in english_query_expansions.items():
                if term in query_lower:
                    expanded_query = f"{corrected_query} {expansion}"
                    logger.info(f"English expansion applied for term: {term}")
                    break
        else:
            # For unknown language, try both
            query_lower = corrected_query.lower()
            
            # Try Arabic first
            for term, expansion in arabic_query_expansions.items():
                if term in corrected_query:
                    expanded_query = f"{corrected_query} {expansion}"
                    logger.info(f"Arabic expansion applied for unknown language term: {term}")
                    break
            
            # If no Arabic expansion found, try English
            if expanded_query == corrected_query:
                for term, expansion in english_query_expansions.items():
                    if term in query_lower:
                        expanded_query = f"{corrected_query} {expansion}"
                        logger.info(f"English expansion applied for unknown language term: {term}")
                        break
        
        # Step 5: Add contextual Islamic terms if relevant
        islamic_context_terms = {
            "ar": ["فقه", "شريعة", "إسلام", "دين", "عبادة"],
            "en": ["jurisprudence", "sharia", "islam", "religion", "worship"]
        }
        
        if detected_lang in islamic_context_terms:
            context_terms = islamic_context_terms[detected_lang]
            # Add one contextual term if the query seems to be about Islamic law
            if any(term in expanded_query.lower() for term in ["حكم", "جائز", "حلال", "حرام", "ruling", "permissible", "allowed", "forbidden"]):
                expanded_query += f" {context_terms[0]}"  # Add "فقه" or "jurisprudence"
        
        if expanded_query != corrected_query:
            logger.info(f"Final expanded query: '{expanded_query}'")
        
        return expanded_query

    def enhanced_text_search(self, query: str, language: str, page: int, page_size: int) -> SearchResultDto:
        """Enhanced text search with better Arabic term matching"""
        try:
            logger.info(f"Enhanced text search for: '{query}'")
            
            # Normalize the query for better Arabic matching
            normalized_query = self.normalize_arabic_text(query)
            query_terms = normalized_query.split()
            
            # Create multiple search strategies
            search_filters = []
            
            # Strategy 1: Exact phrase matching (highest priority)
            exact_phrase_filter = {
                "$or": [
                    {"title_ar": {"$regex": re.escape(query), "$options": "i"}},
                    {"question_ar": {"$regex": re.escape(query), "$options": "i"}},
                    {"answer_ar": {"$regex": re.escape(query), "$options": "i"}}
                ],
                "is_active": True
            }
            
            # Strategy 2: All terms must be present (high priority)
            all_terms_filter = {
                "$and": [
                    {
                        "$or": [
                            {"title_ar": {"$regex": re.escape(term), "$options": "i"}},
                            {"question_ar": {"$regex": re.escape(term), "$options": "i"}},
                            {"answer_ar": {"$regex": re.escape(term), "$options": "i"}},
                            {"category": {"$regex": re.escape(term), "$options": "i"}}
                        ]
                    } for term in query_terms if len(term) > 2
                ],
                "is_active": True
            }
            
            # Strategy 3: MongoDB text search
            text_search_filter = {"$text": {"$search": query}, "is_active": True}
            
            # Try strategies in order of priority
            results = []
            used_ids = set()
            
            # First try exact phrase
            try:
                exact_count = self.services.db.fatwas.count_documents(exact_phrase_filter)
                if exact_count > 0:
                    logger.info(f"Found {exact_count} exact phrase matches")
                    exact_fatwas = list(self.services.db.fatwas.find(exact_phrase_filter).limit(page_size * 2))
                    for fatwa in exact_fatwas:
                        fatwa_id = fatwa.get('fatwa_id')
                        if fatwa_id not in used_ids:
                            results.append(fatwa)
                            used_ids.add(fatwa_id)
            except Exception as e:
                logger.warning(f"Exact phrase search failed: {e}")
            
            # Then try all terms if we need more results
            if len(results) < page_size and len(query_terms) > 1:
                try:
                    all_terms_count = self.services.db.fatwas.count_documents(all_terms_filter)
                    if all_terms_count > 0:
                        logger.info(f"Found {all_terms_count} all-terms matches")
                        all_terms_fatwas = list(self.services.db.fatwas.find(all_terms_filter).limit(page_size * 2))
                        
                        for fatwa in all_terms_fatwas:
                            fatwa_id = fatwa.get('fatwa_id')
                            if fatwa_id not in used_ids:
                                results.append(fatwa)
                                used_ids.add(fatwa_id)
                            if len(results) >= page_size * 2:
                                break
                except Exception as e:
                    logger.warning(f"All terms search failed: {e}")
            
            # Finally try MongoDB text search if still need more
            if len(results) < page_size:
                try:
                    text_count = self.services.db.fatwas.count_documents(text_search_filter)
                    if text_count > 0:
                        logger.info(f"Found {text_count} text search matches")
                        text_fatwas = list(self.services.db.fatwas.find(text_search_filter).limit(page_size * 2))
                        
                        for fatwa in text_fatwas:
                            fatwa_id = fatwa.get('fatwa_id')
                            if fatwa_id not in used_ids:
                                results.append(fatwa)
                                used_ids.add(fatwa_id)
                            if len(results) >= page_size * 2:
                                break
                except Exception as e:
                    logger.warning(f"Text search failed: {e}")
            
            # Calculate proper total count using search filters (not limited results)
            total_count = self._calculate_total_search_results(query, language)
            
            # Convert to response format
            response_results = []
            for fatwa in results[:page_size]:
                # Choose the appropriate language fields
                if language == "en" and fatwa.get('title_en'):
                    title = fatwa.get('title_en', '')
                    question = fatwa.get('question_en', fatwa.get('question_ar', ''))
                    answer = fatwa.get('answer_en', fatwa.get('answer_ar', ''))
                else:
                    title = fatwa.get('title_ar', '')
                    question = fatwa.get('question_ar', '')
                    answer = fatwa.get('answer_ar', '')
                    language = "ar"
                
                response_dto = FatwaResponseDto(
                    fatwaId=fatwa.get('fatwa_id'),
                    title=title,
                    question=question,
                    answer=answer,
                    category=fatwa.get('category', ''),
                    tags=fatwa.get('tags', []),
                    language=language,
                    createdAt=fatwa.get('created_at', datetime.utcnow()),
                    updatedAt=fatwa.get('updated_at', datetime.utcnow())
                )
                response_results.append(response_dto)
            
            logger.info(f"Enhanced text search returned {len(response_results)} results")
            
            return SearchResultDto(
                results=response_results,
                totalCount=total_count,
                page=page,
                pageSize=page_size
            )
            
        except Exception as e:
            logger.error(f"Enhanced text search failed: {e}")
            return SearchResultDto(
                results=[],
                totalCount=0,
                page=page,
                pageSize=page_size
            )

    def search_fatwas(self, query: str, language: str, page: int, page_size: int) -> SearchResultDto:
        """Search for fatwas using improved hybrid semantic + text search"""
        try:
            logger.info(f"Starting search for query: '{query}', language: '{language}', page: {page}, page_size: {page_size}")
            
            # First check if we have any data at all
            total_fatwas = self.services.db.fatwas.count_documents({"is_active": True})
            logger.info(f"Total active fatwas in database: {total_fatwas}")
            
            if total_fatwas == 0:
                logger.warning("No fatwas found in database!")
                return SearchResultDto(results=[], totalCount=0, page=page, pageSize=page_size)
            
            # Step 1: Try exact text search first (highest priority)
            # Fetch enough results to handle pagination properly
            max_results_needed = max(100, page * page_size * 2)  # Ensure we have enough for pagination
            exact_results = self.enhanced_text_search(query, language, 1, max_results_needed)
            exact_fatwa_ids = [result.fatwaId for result in exact_results.results]
            logger.info(f"Exact text search found {len(exact_fatwa_ids)} results, totalCount: {exact_results.totalCount}")
            
            # Step 2: If we have good exact matches, prioritize them
            if len(exact_fatwa_ids) >= 5:
                logger.info("Using exact text search results as primary results")
                # Use the total count from exact search (this was already calculated correctly)
                total_count = exact_results.totalCount
                
                # Paginate exact results
                start_idx = (page - 1) * page_size
                end_idx = min(start_idx + page_size, len(exact_fatwa_ids))
                
                # Check if we have enough results for this page
                if start_idx < len(exact_fatwa_ids):
                    paginated_ids = exact_fatwa_ids[start_idx:end_idx]
                    
                    # Get fatwa details with relevance scoring
                    results = self.get_fatwas_by_ids(paginated_ids, language, query)
                    
                    return SearchResultDto(
                        results=results,
                        totalCount=total_count,
                        page=page,
                        pageSize=page_size
                    )
                else:
                    # If we don't have enough exact results for this page, return empty results
                    # but keep the correct total count
                    return SearchResultDto(
                        results=[],
                        totalCount=total_count,
                        page=page,
                        pageSize=page_size
                    )
            
            # Step 3: If exact search has few results, use hybrid approach
            logger.info(f"Using hybrid search approach because exact search returned only {len(exact_fatwa_ids)} results (< 5)")
            
            # Expand query for semantic search
            expanded_query = self.expand_query(query)
            logger.info(f"Expanded query: '{expanded_query}'")
            
            # Generate embedding for both original and expanded query
            original_embedding = self.generate_embedding(query)
            expanded_embedding = self.generate_embedding(expanded_query)
            
            # Search vectors with original query first
            vector_limit = max(50, page * page_size * 3)
            original_vector_ids = self.search_vectors(original_embedding, language, vector_limit)
            expanded_vector_ids = self.search_vectors(expanded_embedding, language, vector_limit)
            
            logger.info(f"Original vector search: {len(original_vector_ids)} results")
            logger.info(f"Expanded vector search: {len(expanded_vector_ids)} results")
            
            # Step 4: Combine and rank results
            combined_ids = []
            
            # Highest priority: Exact text matches
            for fatwa_id in exact_fatwa_ids:
                if fatwa_id not in combined_ids:
                    combined_ids.append(fatwa_id)
            
            # Second priority: Original query vector matches
            for fatwa_id in original_vector_ids[:20]:  # Limit to top 20
                if fatwa_id not in combined_ids:
                    combined_ids.append(fatwa_id)
            
            # Third priority: Expanded query vector matches
            for fatwa_id in expanded_vector_ids[:30]:  # Limit to top 30
                if fatwa_id not in combined_ids:
                    combined_ids.append(fatwa_id)
            
            # If still not enough results, use fallback
            if len(combined_ids) < page_size * 2:
                fallback_results = self.fallback_text_search(query, language, 1, 50)
                for result in fallback_results.results:
                    if result.fatwaId not in combined_ids:
                        combined_ids.append(result.fatwaId)
            
            # Calculate proper total count for pagination using search filter (not limited combined results)
            total_count = self._calculate_total_search_results(query, language)
            
            # Paginate results
            start_idx = (page - 1) * page_size
            end_idx = min(start_idx + page_size, len(combined_ids))
            paginated_ids = combined_ids[start_idx:end_idx]
            
            # Get fatwa details with relevance scoring
            results = self.get_fatwas_by_ids(paginated_ids, language, query)
            
            return SearchResultDto(
                results=results,
                totalCount=total_count,
                page=page,
                pageSize=page_size
            )
            
        except Exception as e:
            logger.error(f"Fatwa search failed: {e}")
            return SearchResultDto(
                results=[],
                totalCount=0,
                page=page,
                pageSize=page_size
            )

    def fallback_text_search(self, query: str, language: str, page: int, page_size: int) -> SearchResultDto:
        """Enhanced MongoDB text search with better Arabic support"""
        try:
            # Create multiple search filters for better matching
            search_filters = []
            
            # Basic active filter 
            base_filter = {"is_active": True}
            
            try:
                # Try text search first
                text_filter = {"$text": {"$search": query}, "is_active": True}
                text_count = self.services.db.fatwas.count_documents(text_filter)
                if text_count > 0:
                    search_filters.append(text_filter)
            except Exception as e:
                logger.warning(f"Text search failed, trying regex: {e}")
            
            # For Arabic queries or when text search fails, use regex
            if not search_filters or any(ord(char) > 127 for char in query):
                regex_pattern = {"$regex": query, "$options": "i"}
                regex_filter = {
                    "$or": [
                        {"title_ar": regex_pattern},
                        {"question_ar": regex_pattern},
                        {"answer_ar": regex_pattern},
                        {"category": regex_pattern}
                    ],
                    "is_active": True
                }
                search_filters.append(regex_filter)
            
            # If no specific search filters work, just return all active fatwas 
            if not search_filters:
                logger.warning("No search filters matched, returning all active fatwas")
                final_filter = base_filter
            else:
                final_filter = {"$or": search_filters} if len(search_filters) > 1 else search_filters[0]
            
            total_count = self.services.db.fatwas.count_documents(final_filter)
            logger.info(f"Fallback search found {total_count} total results for query: '{query}'")
            
            skip = (page - 1) * page_size
            fatwas = list(self.services.db.fatwas.find(final_filter).skip(skip).limit(page_size))
            
            # Convert to response format
            results = []
            for fatwa in fatwas:
                # Choose the appropriate language fields
                if language == "en" and fatwa.get('title_en'):
                    title = fatwa.get('title_en', '')
                    question = fatwa.get('question_en', fatwa.get('question_ar', ''))
                    answer = fatwa.get('answer_en', fatwa.get('answer_ar', ''))
                else:
                    title = fatwa.get('title_ar', '')
                    question = fatwa.get('question_ar', '')
                    answer = fatwa.get('answer_ar', '')
                    language = "ar"
                
                response_dto = FatwaResponseDto(
                    fatwaId=fatwa.get('fatwa_id'),
                    title=title,
                    question=question,
                    answer=answer,
                    category=fatwa.get('category', ''),
                    tags=fatwa.get('tags', []),
                    language=language,
                    createdAt=fatwa.get('created_at', datetime.utcnow()),
                    updatedAt=fatwa.get('updated_at', datetime.utcnow())
                )
                results.append(response_dto)
            
            return SearchResultDto(
                results=results,
                totalCount=total_count,
                page=page,
                pageSize=page_size
            )
            
        except Exception as e:
            logger.error(f"Fallback text search failed: {e}")
            return SearchResultDto(
                results=[],
                totalCount=0,
                page=page,
                pageSize=page_size
            )

    def embed_fatwa(self, fatwa: FatwaDto) -> bool:
        """Generate and store embeddings for a fatwa"""
        try:
            FatwaId = fatwa.FatwaId
            
            # Generate embeddings using complete text with category context
            text_ar = f"{fatwa.Category} {fatwa.Title} {fatwa.Question} {fatwa.Answer}"
            if fatwa.Tags:
                text_ar += " " + " ".join(fatwa.Tags)
            embedding_ar = self.generate_embedding(text_ar)
            
            # Generate English translation and embedding if needed
            if fatwa.Language == "ar":
                translated = self.translate_fatwa(
                    {"title": fatwa.Title, "question": fatwa.Question, "answer": fatwa.Answer},
                    "ar", "en"
                )
                text_en = f"{fatwa.Category} {translated['title']} {translated['question']} {translated['answer']}"
                if fatwa.Tags:
                    text_en += " " + " ".join(fatwa.Tags)
            else:
                text_en = text_ar
            
            embedding_en = self.generate_embedding(text_en)
            
            # Store in Milvus
            if Config.USE_MILVUS_LITE:
                # Delete existing entries first
                for col in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
                    if self.services.milvus_client.has_collection(col):
                        try:
                            self.services.milvus_client.delete(col, [FatwaId])
                        except Exception:
                            pass  # Ignore if it doesn't exist
                
                # Insert new embeddings
                self.services.milvus_client.insert(
                    collection_name=Config.FATWA_COLLECTION_AR,
                    data=[{"id": FatwaId, "vector": embedding_ar, "pk": FatwaId}]
                )
                self.services.milvus_client.insert(
                    collection_name=Config.FATWA_COLLECTION_EN,
                    data=[{"id": FatwaId, "vector": embedding_en, "pk": FatwaId}]
                )
            else:
                # Server mode
                for col_name, embedding in [
                    (Config.FATWA_COLLECTION_AR, embedding_ar),
                    (Config.FATWA_COLLECTION_EN, embedding_en)
                ]:
                    collection = Collection(col_name)
                    
                    # Delete existing entries
                    try:
                        expr = f"pk == {FatwaId}"
                        collection.delete(expr)
                    except Exception:
                        pass  # Ignore if it doesn't exist
                    
                    # Insert new embedding
                    data = [[FatwaId], [str(FatwaId)], [embedding]]
                    collection.insert(data)
            
            return True
            
        except Exception as e:
            logger.error(f"Error embedding fatwa {fatwa.FatwaId}: {e}")
            return False

# ==============================================================================
# 6. API Endpoints (Compatible with .NET Core API)
# ==============================================================================

@app.get("/health", summary="Check API and services health")
def health_check(services: ServiceManager = Depends(get_service_manager)):
    """Check the health of all services"""
    try:
        services.db.command('ping')
        mongo_status = "connected"
        
        # Count fatwas
        fatwas_count = services.db.fatwas.count_documents({})
        
        return {
            "status": "healthy",
            "mongodb": mongo_status,
            "milvus": "connected",
            "milvus_mode": "lite" if Config.USE_MILVUS_LITE else "server",
            "embedding_model": Config.EMBEDDING_MODEL,
            "fatwas_count": fatwas_count
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.get("/api/search", summary="Search for fatwas")
async def search_endpoint(
    query: str = Query(..., description="Search query"),
    lang: str = Query("ar", description="Language code (ar/en)"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(10, description="Results per page")
):
    """Search for fatwas using enhanced semantic search"""
    try:
        logger.info(f"🔍 Enhanced Search request: query='{query}', lang='{lang}', page={page}, page_size={page_size}")
        
        core = CoreLogic(services=ServiceManager())
        search_result = core.search_fatwas(query, lang, page, page_size)
        
        return search_result
    except Exception as e:
        logger.error(f"❌ Search endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.post("/api/translate", summary="Translate fatwa text")
async def translate_endpoint(request: TranslationRequest):
    """Translate fatwa text between languages"""
    try:
        core = CoreLogic(services=ServiceManager())
        result = core.translate_fatwa(
            request.text,
            request.source_lang,
            request.target_lang
        )
        
        return TranslationResponse(
            title=result.get("title", ""),
            question=result.get("question", ""),
            answer=result.get("answer", "")
        )
    except Exception as e:
        logger.error(f"Translation endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

@app.post("/api/embed_fatwa", summary="Generate and store embeddings for a fatwa")
async def embed_fatwa_endpoint(fatwa: FatwaDto):
    """Generate embeddings for a fatwa and store in vector database"""
    try:
        core = CoreLogic(services=ServiceManager())
        success = core.embed_fatwa(fatwa)
        
        if success:
            return {"status": "success", "message": "Embedding created successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to create embedding")
    except Exception as e:
        logger.error(f"Embed fatwa endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@app.post("/api/embed_fatwa_by_id", summary="Generate and store embeddings for a fatwa by ID")
async def embed_fatwa_by_id_endpoint(request: dict):
    """Generate embeddings for a fatwa by fetching from MongoDB"""
    try:
        fatwa_id = request.get("FatwaId")
        if not fatwa_id:
            raise HTTPException(status_code=400, detail="FatwaId is required")
        
        # Fetch fatwa from MongoDB
        services = ServiceManager()
        fatwa_doc = services.db.fatwas.find_one({"fatwa_id": fatwa_id})
        
        if not fatwa_doc:
            raise HTTPException(status_code=404, detail="Fatwa not found")
        
        # Create FatwaDto from MongoDB document
        fatwa = FatwaDto(
            FatwaId=fatwa_doc.get('fatwa_id'),
            Title=fatwa_doc.get('title_ar', ''),
            Question=fatwa_doc.get('question_ar', ''),
            Answer=fatwa_doc.get('answer_ar', ''),
            Category=fatwa_doc.get('category', ''),
            Tags=fatwa_doc.get('tags', []),
            Language="ar"
        )
        
        core = CoreLogic(services=services)
        success = core.embed_fatwa(fatwa)
        
        if success:
            return {"status": "success", "message": "Embedding created successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to create embedding")
    except Exception as e:
        logger.error(f"Embed fatwa by ID endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@app.delete("/api/delete_fatwa/{FatwaId}", summary="Delete fatwa embeddings")
async def delete_fatwa_endpoint(FatwaId: int):
    """Delete a fatwa's embeddings from vector database"""
    try:
        services = ServiceManager()
        
        if Config.USE_MILVUS_LITE:
            for col in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
                if services.milvus_client.has_collection(col):
                    services.milvus_client.delete(col, [FatwaId])
        else:
            for col_name in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
                if utility.has_collection(col_name):
                    collection = Collection(col_name)
                    expr = f"pk == {FatwaId}"
                    collection.delete(expr)
        
        return {"status": "success", "message": "Fatwa deleted successfully"}
    except Exception as e:
        logger.error(f"Delete fatwa endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")

@app.post("/api/initialize_data", summary="Initialize data from files")
async def initialize_data_endpoint():
    """Initialize database with fatwa data from files"""
    try:
        import subprocess
        import os
        import asyncio
        
        logger.info("Data initialization requested via API")
        
        # Check if data already exists
        services = ServiceManager()
        count = services.db.fatwas.count_documents({})
        
        if count > 0:
            logger.info(f"Database already contains {count} fatwas")
            return {"status": "success", "message": f"Database already initialized with {count} fatwas"}
        
        # Run smart_data_loader.py in background
        script_path = os.path.join(os.path.dirname(__file__), "smart_data_loader.py")
        
        def run_loader():
            try:
                result = subprocess.run([
                    "python", script_path, "--docker"
                ], capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    logger.info("Data loader completed successfully")
                else:
                    logger.error(f"Data loader failed: {result.stderr}")
            except Exception as e:
                logger.error(f"Error running data loader: {e}")
        
        # Run in background thread
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_loader)
        
        # Check final count
        final_count = services.db.fatwas.count_documents({})
        return {"status": "success", "message": f"Data initialization completed. Loaded {final_count} fatwas"}
        
    except Exception as e:
        logger.error(f"Initialize data endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Data initialization failed: {str(e)}")

# ==============================================================================
# 6.5. FatwaQueryMaster Endpoints - Enhanced Query Optimization
# ==============================================================================

@app.post("/api/optimize_query", summary="Optimize a search query with FatwaQueryMaster")
async def optimize_query_endpoint(request: dict):
    """
    🤖 FatwaQueryMaster: Optimize a search query for better results
    
    This endpoint demonstrates the AI-driven query optimization features:
    - Language detection (Arabic/English)
    - Spelling correction and normalization
    - Synonym expansion and term enrichment
    - Query strategy optimization
    """
    try:
        query = request.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query parameter is required")
        
        core = CoreLogic(services=ServiceManager())
        
        # Step 1: Detect language
        detected_lang, confidence = core.detect_language(query)
        
        # Step 2: Correct spelling
        corrected_query = core.correct_spelling(query, detected_lang)
        
        # Step 3: Expand query
        expanded_query = core.expand_query(query)
        
        # Step 4: Determine strategy
        strategy = "semantic_search"
        if len(query.split()) == 1:
            strategy = "single_term_semantic"
        elif any(term in query.lower() for term in ["كيف", "ماذا", "متى", "why", "how", "what", "when"]):
            strategy = "question_focused"
        elif any(term in query.lower() for term in ["حكم", "فتوى", "جائز", "حلال", "حرام", "ruling", "fatwa", "permissible", "allowed", "forbidden"]):
            strategy = "jurisprudence_focused"
        
        return {
            "status": "success",
            "original_query": query,
            "optimized_query": expanded_query,
            "detected_language": detected_lang,
            "confidence": confidence,
            "spelling_corrected": corrected_query if corrected_query != query else None,
            "search_strategy": strategy,
            "improvements": {
                "language_detected": detected_lang != "unknown",
                "spelling_corrected": corrected_query != query,
                "query_expanded": expanded_query != query,
                "terms_added": len(expanded_query.split()) - len(query.split()) if expanded_query != query else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Query optimization error: {e}")
        raise HTTPException(status_code=500, detail=f"Query optimization failed: {str(e)}")

@app.get("/api/query_master_demo", summary="Demo FatwaQueryMaster with sample queries")
async def query_master_demo():
    """
    🚀 Demonstrate FatwaQueryMaster capabilities with sample queries
    
    This endpoint shows how the AI-driven query optimizer works with various
    types of search queries in both Arabic and English.
    """
    try:
        core = CoreLogic(services=ServiceManager())
        
        # Sample queries to demonstrate optimization
        sample_queries = [
            "صلاة",
            "الصلوة في المسجد",
            "prayer in mosque", 
            "زكاة المال",
            "fasting in ramadan",
            "هل يجوز أكل اللحم",
            "is it permissible to eat meat",
            "حكم الطلاق",
            "divorce ruling",
            "وضوء قبل الصلاة",
            "ablution before prayer",
            "صيام رمضان",
            "ramadan fasting"
        ]
        
        results = []
        
        for query in sample_queries:
            # Detect language
            detected_lang, confidence = core.detect_language(query)
            
            # Correct spelling
            corrected_query = core.correct_spelling(query, detected_lang)
            
            # Expand query
            expanded_query = core.expand_query(query)
            
            results.append({
                "original": query,
                "optimized": expanded_query,
                "language": detected_lang,
                "confidence": round(confidence, 2),
                "corrected": corrected_query if corrected_query != query else None,
                "improvement": {
                    "terms_added": len(expanded_query.split()) - len(query.split()),
                    "spelling_fixed": corrected_query != query,
                    "expansion_applied": expanded_query != query
                }
            })
        
        return {
            "status": "success",
            "message": "FatwaQueryMaster Demo Results",
            "total_queries": len(sample_queries),
            "optimization_results": results,
            "features": {
                "language_detection": "Arabic & English supported",
                "spelling_correction": "Common misspellings corrected",
                "query_expansion": "Islamic terms expanded with synonyms",
                "normalization": "Arabic text normalized (diacritics removed)",
                "strategy_optimization": "Search strategy determined by query type"
            }
        }
        
    except Exception as e:
        logger.error(f"Query master demo error: {e}")
        raise HTTPException(status_code=500, detail=f"Demo failed: {str(e)}")


@app.post("/api/smart_search", summary="Smart search with FatwaQueryMaster optimization")
async def smart_search_endpoint(
    query: str = Query(..., description="Search query to optimize and search"),
    lang: str = Query("", description="Language preference (ar/en)"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(10, description="Results per page"),
    show_optimization: bool = Query(True, description="Include optimization details in response")
):
    """
    🎯 Smart Search: Combines FatwaQueryMaster optimization with semantic search
    
    This endpoint demonstrates the complete workflow:
    1. Query optimization (language detection, spelling correction, expansion)
    2. Semantic search with optimized query
    3. Result ranking and formatting
    """
    try:
        core = CoreLogic(services=ServiceManager())
        
        # Step 1: Optimize the query
        start_time = datetime.now()
        
        detected_lang, confidence = core.detect_language(query)
        corrected_query = core.correct_spelling(query, detected_lang)
        expanded_query = core.expand_query(query)
        
        # Use detected language if not specified
        if not lang:
            lang = detected_lang if detected_lang != "unknown" else "ar"
        
        optimization_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Step 2: Perform the search with optimized query
        search_start = datetime.now()
        search_results = core.search_fatwas(expanded_query, lang, page, page_size)
        search_time = (datetime.now() - search_start).total_seconds() * 1000
        
        # Step 3: Prepare response
        response = {
            "status": "success",
            "search_results": search_results,
            "performance": {
                "optimization_time_ms": round(optimization_time, 2),
                "search_time_ms": round(search_time, 2),
                "total_time_ms": round(optimization_time + search_time, 2)
            }
        }
        
        # Include optimization details if requested
        if show_optimization:
            response["optimization"] = {
                "original_query": query,
                "optimized_query": expanded_query,
                "detected_language": detected_lang,
                "confidence": round(confidence, 2),
                "spelling_corrected": corrected_query if corrected_query != query else None,
                "improvements": {
                    "language_detected": detected_lang != "unknown",
                    "spelling_corrected": corrected_query != query,
                    "query_expanded": expanded_query != query,
                    "terms_added": len(expanded_query.split()) - len(query.split()) if expanded_query != query else 0
                }
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Smart search error: {e}")
        raise HTTPException(status_code=500, detail=f"Smart search failed: {str(e)}")

@app.get("/api/language_detection", summary="Test language detection capabilities")
async def language_detection_test(
    query: str = Query(..., description="Text to analyze for language detection")
):
    """
    🌐 Language Detection Test: Analyze text to determine language
    
    This endpoint demonstrates the language detection capabilities of FatwaQueryMaster.
    """
    try:
        core = CoreLogic(services=ServiceManager())
        
        detected_lang, confidence = core.detect_language(query)
        
        # Character analysis
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', query))
        english_chars = len(re.findall(r'[a-zA-Z]', query))
        total_chars = len(re.sub(r'\s', '', query))
        
        return {
            "status": "success",
            "input_text": query,
            "detected_language": detected_lang,
            "confidence": round(confidence, 2),
            "analysis": {
                "arabic_characters": arabic_chars,
                "english_characters": english_chars,
                "total_characters": total_chars,
                "arabic_percentage": round(arabic_chars / total_chars * 100, 1) if total_chars > 0 else 0,
                "english_percentage": round(english_chars / total_chars * 100, 1) if total_chars > 0 else 0
            },
            "recommendations": {
                "suggested_language": detected_lang,
                "use_arabic_search": detected_lang == "ar",
                "use_english_search": detected_lang == "en",
                "use_mixed_search": detected_lang == "unknown"
            }
        }
        
    except Exception as e:
        logger.error(f"Language detection test error: {e}")
        raise HTTPException(status_code=500, detail=f"Language detection failed: {str(e)}")

# ==============================================================================
# 7. Application Runner
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting IFTAA Python AI Service with Uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")