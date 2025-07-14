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
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum
import base64
from functools import wraps
import requests
from dotenv import load_dotenv
import re
import hashlib
from functools import lru_cache
import time
from concurrent.futures import ThreadPoolExecutor
import threading

# --- FastAPI Imports ---
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

# --- Database and AI/ML Imports ---
import pymongo
from pymongo import MongoClient
from pymilvus import connections, Collection, utility, FieldSchema, CollectionSchema, DataType, MilvusClient
from sentence_transformers import SentenceTransformer
import torch
from transformers import MarianMTModel, MarianTokenizer
import secrets

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

# --- FastAPI App Setup ---
app = FastAPI(
    title="IFTAA Semantic Search API",
    description="A smart search system for Islamic Fatwas with bilingual support.",
    version="2.0.0"
)

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
    text: str

class EmbeddingRequest(BaseModel):
    text: str

class VectorSearchRequest(BaseModel):
    embedding: List[float]
    language: str = "ar"
    limit: int = 10

class EmbedAndStoreRequest(BaseModel):
    fatwa_id: int

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
            
            logger.info(f"Loading translation model: {Config.TRANSLATION_MODEL_AR_EN}")
            self.translation_tokenizer = MarianTokenizer.from_pretrained(Config.TRANSLATION_MODEL_AR_EN)
            self.translation_model = MarianMTModel.from_pretrained(Config.TRANSLATION_MODEL_AR_EN)
            
            self.executor = ThreadPoolExecutor(max_workers=Config.MAX_WORKERS)
            
            self._ensure_collections_and_indexes()
            
            self.initialized = True
            logger.info("✅ Service Manager initialized successfully.")

    def _ensure_collections_and_indexes(self):
        logger.info("Ensuring database collections and indexes exist...")
        self.db.fatwas.create_index([("fatwa_id", 1)], unique=True)
        self.db.fatwas.create_index([("is_embedded", 1)])
        # Create text index for fallback text search
        self.db.fatwas.create_index([("title_ar", "text"), ("title_en", "text"), ("question_ar", "text"), ("question_en", "text"), ("answer_ar", "text"), ("answer_en", "text")])
        
        if Config.USE_MILVUS_LITE:
            self._create_milvus_lite_collections()
            else:
            self._create_milvus_collection_if_not_exists(Config.FATWA_COLLECTION_AR, "Arabic Fatwas")
            self._create_milvus_collection_if_not_exists(Config.FATWA_COLLECTION_EN, "English Fatwas")

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

    def _create_milvus_collection_if_not_exists(self, name: str, description: str):
        if not utility.has_collection(name):
            fields = [
                FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=False),
                FieldSchema(name="mongo_id", dtype=DataType.VARCHAR, max_length=24),
                FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=Config.EMBEDDING_DIM)
            ]
                schema = CollectionSchema(fields, description)
            Collection(name, schema)
            logger.info(f"Created Milvus collection: {name}")
            collection = Collection(name)
            index_params = {"metric_type": "IP", "index_type": "IVF_FLAT", "params": {"nlist": 1024}}
                collection.create_index(field_name="embedding", index_params=index_params)
            logger.info(f"Created index for collection: {name}")
        Collection(name).load()
        logger.info(f"Loaded Milvus collection into memory: {name}")

@app.on_event("startup")
def startup_event():
    ServiceManager().initialize()

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

    def translate_text(self, text: str) -> str:
        try:
            inputs = self.services.translation_tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
            translated_tokens = self.services.translation_model.generate(**inputs)
            return self.services.translation_tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text # Fallback

    def generate_embedding(self, text: str) -> List[float]:
        return self.services.embedding_model.encode(text, normalize_embeddings=True).tolist()

    def search_vectors(self, query_embedding: List[float], language: str, limit: int) -> list:
        collection_name = Config.FATWA_COLLECTION_AR if language == "ar" else Config.FATWA_COLLECTION_EN
        
        if Config.USE_MILVUS_LITE:
            results = self.services.milvus_client.search(
                collection_name=collection_name,
                data=[query_embedding],
                limit=limit,
                output_fields=["mongo_id", "pk"]
            )
            return results[0] if results else []
        else:
            collection = Collection(collection_name)
            search_params = {"metric_type": "IP", "params": {"nprobe": 16}}
            results = collection.search([query_embedding], "embedding", search_params, limit, output_fields=["mongo_id"])
            return results[0]

    def _embed_and_store_fatwa_async(self, mongo_id: str, fatwa_doc: dict):
        try:
            ar_text = f"{fatwa_doc['title_ar']} {fatwa_doc['question_ar']}"
            en_text = f"{fatwa_doc['title_en']} {fatwa_doc['question_en']}"
            
            embedding_ar = self.generate_embedding(ar_text)
            embedding_en = self.generate_embedding(en_text)
            
            pk = fatwa_doc['fatwa_id']
            
            if Config.USE_MILVUS_LITE:
                # Insert into Milvus Lite
                self.services.milvus_client.insert(
                    collection_name=Config.FATWA_COLLECTION_AR,
                    data=[{"id": pk, "vector": embedding_ar, "mongo_id": mongo_id, "pk": pk}]
                )
                self.services.milvus_client.insert(
                    collection_name=Config.FATWA_COLLECTION_EN,
                    data=[{"id": pk, "vector": embedding_en, "mongo_id": mongo_id, "pk": pk}]
                )
            else:
                # Insert into Milvus server
                Collection(Config.FATWA_COLLECTION_AR).insert([[pk], [mongo_id], [embedding_ar]])
                Collection(Config.FATWA_COLLECTION_EN).insert([[pk], [mongo_id], [embedding_en]])

            self.services.db.fatwas.update_one({"_id": fatwa_doc["_id"]}, {"$set": {"is_embedded": True, "updated_at": datetime.utcnow()}})
            logger.info(f"✅ Successfully embedded Fatwa ID: {pk}")
            
        except Exception as e:
            logger.error(f"❌ Async embedding failed for Mongo ID {mongo_id}: {e}")

# ==============================================================================
# 6. API Endpoints
# ==============================================================================

@app.get("/health", summary="Check API and services health")
def health_check(services: ServiceManager = Depends(get_service_manager)):
    try:
        services.db.command('ping')
        mongo_status = "ok"
        except Exception as e:
        mongo_status = f"error: {e}"
    
    milvus_status = "ok" if Config.USE_MILVUS_LITE else "server-mode"
    
    return JSONResponse(content={
        "mongodb_status": mongo_status, 
        "milvus_status": milvus_status,
        "milvus_mode": "lite" if Config.USE_MILVUS_LITE else "server"
    })

@app.post("/translate", summary="Translate text from Arabic to English")
def translate(request: TranslationRequest, core: CoreLogic = Depends(CoreLogic)):
    return {"original_text": request.text, "translated_text": core.translate_text(request.text)}

@app.post("/embed", summary="Generate a vector embedding for a text string")
def embed(request: EmbeddingRequest, core: CoreLogic = Depends(CoreLogic)):
    return {"text": request.text, "embedding": core.generate_embedding(request.text)}

@app.post("/vector-search", summary="Perform vector search")
async def vector_search_endpoint(payload: dict, core: CoreLogic = Depends(CoreLogic)):
    query = payload.get("query", "")
    language = payload.get("language", "ar")
    limit = int(payload.get("limit", 10))
        if not query:
        raise HTTPException(status_code=400, detail="Query is required")
    # 1. Generate embedding
    embedding = core.generate_embedding(query)
    # 2. Search Milvus
    hits = core.search_vectors(embedding, language, limit)
    fatwa_ids = []
    if Config.USE_MILVUS_LITE:
        fatwa_ids = [hit.get("pk", hit.get("id")) for hit in hits]
        else:
        fatwa_ids = [hit.id for hit in hits]
    return {"fatwa_ids": fatwa_ids}

@app.post("/delete-vector", summary="Delete vectors for a fatwa from Milvus")
async def delete_vector(payload: dict, services: ServiceManager = Depends(get_service_manager)):
    fatwa_id = payload.get("fatwa_id")
    if fatwa_id is None:
        raise HTTPException(status_code=400, detail="fatwa_id is required")
    try:
        if Config.USE_MILVUS_LITE:
            for col in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
                if services.milvus_client.has_collection(col):
                    services.milvus_client.delete(col, ids=[fatwa_id])
        else:
            for col in [Config.FATWA_COLLECTION_AR, Config.FATWA_COLLECTION_EN]:
                if utility.has_collection(col):
                    collection = Collection(col)
                    expr = f"pk == {fatwa_id}"
                    collection.delete(expr)
        return {"status": "deleted", "fatwa_id": fatwa_id}
    except Exception as e:
        logger.error(f"Vector deletion failed: {e}")
        raise HTTPException(status_code=500, detail="Vector deletion failed")

@app.post("/embed-and-store", summary="Generate and store embeddings for a fatwa")
def embed_and_store(request: EmbedAndStoreRequest, services: ServiceManager = Depends(get_service_manager), core: CoreLogic = Depends(CoreLogic)):
    fatwa_doc = services.db.fatwas.find_one({"fatwa_id": request.fatwa_id})
    if not fatwa_doc:
        raise HTTPException(status_code=404, detail="Fatwa not found in MongoDB")
    mongo_id = str(fatwa_doc["_id"])
    services.executor.submit(core._embed_and_store_fatwa_async, mongo_id, fatwa_doc)
    return {"message": "Fatwa embedding has been queued.", "fatwa_id": request.fatwa_id}

# ==============================================================================
# 7. Application Runner
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting IFTAA Python AI Service with Uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info") 