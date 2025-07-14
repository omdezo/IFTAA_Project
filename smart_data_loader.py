#!/usr/bin/env python3
"""
Smart Data Loader for IFTAA System
Loads fatwas_multilingual.json into MongoDB and Milvus with proper embeddings
"""

import os
import json
import logging
import argparse
import time
from typing import List, Dict, Any
import numpy as np
from pymongo import MongoClient
from pymilvus import connections, Collection, utility, FieldSchema, CollectionSchema, DataType, MilvusClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataLoader:
    def __init__(self, use_lite=False):
        self.mongo_client = None
        self.db = None
        self.mongo_uri = "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin"
        self.milvus_host = "milvus"
        self.milvus_port = "19530"
        self.database_name = "iftaa_db"
        self.use_milvus_lite = use_lite
        self.milvus_db_path = "/app/milvus_data/iftaa.db"
        
        # Data file paths
        self.multilingual_file = "data/fatwas_multilingual.json"
        self.fallback_file = "data/fatwas.json"
        
        # Collection names
        self.mongo_collection = "fatwas"
        self.milvus_ar_collection = "fatwas_ar_v2"
        self.milvus_en_collection = "fatwas_en_v2"
        
    def wait_for_services(self, max_retries: int = 30):
        """Wait for MongoDB and Milvus to be ready"""
        logger.info("🔄 Waiting for services to be ready...")
        
        # Wait for MongoDB
        for i in range(max_retries):
            try:
                self.mongo_client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=2000)
                self.mongo_client.admin.command('ping')
                self.db = self.mongo_client[self.database_name]
                logger.info("✅ MongoDB is ready!")
                break
            except Exception as e:
                if i < max_retries - 1:
                    logger.info(f"   MongoDB not ready ({i+1}/{max_retries}), waiting...")
                    time.sleep(2)
                else:
                    logger.error(f"❌ MongoDB failed to start: {e}")
                    return False
        
        # Initialize Milvus
        if self.use_milvus_lite:
            try:
                # Ensure directory exists
                os.makedirs(os.path.dirname(self.milvus_db_path), exist_ok=True)
                # Initialise embedded Milvus Lite
                self.milvus_client = MilvusClient(uri=self.milvus_db_path)
                logger.info("✅ Milvus Lite is ready!")
            except Exception as e:
                logger.error(f"❌ Milvus Lite failed to start: {e}")
                return False
        else:
            # Wait for Milvus server
            for i in range(max_retries):
                try:
                    connections.connect("default", host=self.milvus_host, port=self.milvus_port)
                    logger.info("✅ Milvus is ready!")
                    break
        except Exception as e:
                    if i < max_retries - 1:
                        logger.info(f"   Milvus not ready ({i+1}/{max_retries}), waiting...")
                        time.sleep(2)
                    else:
                        logger.error(f"❌ Milvus failed to start: {e}")
                        return False
        
        return True
    
    def check_existing_data(self) -> bool:
        """Check if data already exists"""
        try:
            count = self.db[self.mongo_collection].count_documents({})
            if count > 0:
                logger.info(f"✅ Found {count} existing documents in MongoDB")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Error checking existing data: {e}")
            return False
    
    def create_milvus_collections(self):
        """Create Milvus collections if they don't exist"""
        embedding_dim = 768
        
        if self.use_milvus_lite:
            # Create collections in Milvus Lite
            for collection_name in [self.milvus_ar_collection, self.milvus_en_collection]:
                if not self.milvus_client.has_collection(collection_name):
                    logger.info(f"📝 Creating Milvus Lite collection: {collection_name}")
                    self.milvus_client.create_collection(
                        collection_name=collection_name,
                        dimension=embedding_dim,
                        metric_type="IP",
                        consistency_level="Strong"
                    )
                    logger.info(f"✅ Created Milvus Lite collection: {collection_name}")
        else:
            # Create collections in Milvus server
            for collection_name in [self.milvus_ar_collection, self.milvus_en_collection]:
                if not utility.has_collection(collection_name):
                    logger.info(f"📝 Creating Milvus collection: {collection_name}")
                    
                    fields = [
                        FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=False),
                        FieldSchema(name="mongo_id", dtype=DataType.VARCHAR, max_length=24),
                        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=embedding_dim)
                    ]
                    
                    schema = CollectionSchema(fields, f"IFTAA Collection: {collection_name}")
                    collection = Collection(collection_name, schema)
                    
                    # Create index
                    index_params = {
                        "metric_type": "IP",
                        "index_type": "IVF_FLAT",
                        "params": {"nlist": 1024}
                    }
                    collection.create_index(field_name="embedding", index_params=index_params)
                    logger.info(f"✅ Created collection and index: {collection_name}")
                
                # Load collection into memory
                Collection(collection_name).load()
                logger.info(f"🚀 Loaded collection into memory: {collection_name}")
    
    def load_multilingual_data(self) -> bool:
        """Load fatwas_multilingual.json with pre-computed embeddings"""
        if not os.path.exists(self.multilingual_file):
            logger.warning(f"⚠️  Multilingual file not found: {self.multilingual_file}")
            return self.load_fallback_data()
        
        try:
            logger.info(f"📚 Loading multilingual data from: {self.multilingual_file}")
            with open(self.multilingual_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            logger.info(f"📊 Found {len(data)} fatwas with embeddings")
            
            # Process data in batches
            batch_size = 100
            for i in range(0, len(data), batch_size):
                batch = data[i:i + batch_size]
                self.process_multilingual_batch(batch)
                logger.info(f"✅ Processed batch {i//batch_size + 1}/{(len(data) + batch_size - 1)//batch_size}")
                
            logger.info("🎉 Multilingual data loading completed!")
                return True
            
        except Exception as e:
            logger.error(f"❌ Error loading multilingual data: {e}")
            return self.load_fallback_data()
    
    def process_multilingual_batch(self, batch: List[Dict]):
        """Process a batch of multilingual fatwas"""
        mongo_docs = []
        milvus_ar_data = []
        milvus_en_data = []
        
        for item in batch:
            # Prepare MongoDB document
            mongo_doc = {
                "fatwa_id": item["fatwa_id"],
                "title_ar": item.get("title_ar", ""),
                "title_en": item.get("title_en", ""),
                "question_ar": item.get("question_ar", ""),
                "question_en": item.get("question_en", ""),
                "answer_ar": item.get("answer_ar", ""),
                "answer_en": item.get("answer_en", ""),
                "category": item.get("category", ""),
                "is_embedded": True,
                "is_active": True
            }
            
            # Insert into MongoDB first to get the ObjectId
            result = self.db[self.mongo_collection].insert_one(mongo_doc)
            mongo_id = str(result.inserted_id)
            
            # Prepare Milvus data if embeddings exist
            if "embedding_ar" in item and item["embedding_ar"]:
                if self.use_milvus_lite:
                    milvus_ar_data.append({
                        "id": item["fatwa_id"],
                        "vector": item["embedding_ar"],
                        "mongo_id": mongo_id,
                        "pk": item["fatwa_id"]
                    })
                else:
                    if not hasattr(self, 'milvus_ar_pks'):
                        self.milvus_ar_pks = []
                        self.milvus_ar_mongo_ids = []
                        self.milvus_ar_embeddings = []
                    self.milvus_ar_pks.append(item["fatwa_id"])
                    self.milvus_ar_mongo_ids.append(mongo_id)
                    self.milvus_ar_embeddings.append(item["embedding_ar"])
                
            if "embedding_en" in item and item["embedding_en"]:
                if self.use_milvus_lite:
                    milvus_en_data.append({
                        "id": item["fatwa_id"],
                        "vector": item["embedding_en"],
                        "mongo_id": mongo_id,
                        "pk": item["fatwa_id"]
                    })
                else:
                    if not hasattr(self, 'milvus_en_pks'):
                        self.milvus_en_pks = []
                        self.milvus_en_mongo_ids = []
                        self.milvus_en_embeddings = []
                    self.milvus_en_pks.append(item["fatwa_id"])
                    self.milvus_en_mongo_ids.append(mongo_id)
                    self.milvus_en_embeddings.append(item["embedding_en"])
        
        # Insert into Milvus collections
        if self.use_milvus_lite:
            if milvus_ar_data:
                self.milvus_client.insert(collection_name=self.milvus_ar_collection, data=milvus_ar_data)
            if milvus_en_data:
                self.milvus_client.insert(collection_name=self.milvus_en_collection, data=milvus_en_data)
        else:
            # Will insert at the end in batch for server mode
            pass
    
    def finalize_milvus_server_inserts(self):
        """Finalize batch inserts for Milvus server mode"""
        if not self.use_milvus_lite:
            if hasattr(self, 'milvus_ar_pks') and self.milvus_ar_pks:
                Collection(self.milvus_ar_collection).insert([
                    self.milvus_ar_pks,
                    self.milvus_ar_mongo_ids,
                    self.milvus_ar_embeddings
                ])
                logger.info(f"✅ Inserted {len(self.milvus_ar_pks)} Arabic embeddings")
            
            if hasattr(self, 'milvus_en_pks') and self.milvus_en_pks:
                Collection(self.milvus_en_collection).insert([
                    self.milvus_en_pks,
                    self.milvus_en_mongo_ids,
                    self.milvus_en_embeddings
                ])
                logger.info(f"✅ Inserted {len(self.milvus_en_pks)} English embeddings")
    
    def load_fallback_data(self) -> bool:
        """Load basic fatwas.json without embeddings"""
        if not os.path.exists(self.fallback_file):
            logger.error(f"❌ Fallback file not found: {self.fallback_file}")
            return False
    
        try:
            logger.info(f"📚 Loading fallback data from: {self.fallback_file}")
            with open(self.fallback_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Prepare documents for MongoDB
            docs = []
            for item in data:
                doc = {
                    "fatwa_id": item.get("fatwa_id", item.get("id")),
                    "title_ar": item.get("title_ar", item.get("title", "")),
                    "title_en": "",  # Will be translated later
                    "question_ar": item.get("question_ar", item.get("question", "")),
                    "question_en": "",  # Will be translated later
                    "answer_ar": item.get("answer_ar", item.get("answer", "")),
                    "answer_en": "",  # Will be translated later
                    "category": item.get("category", ""),
                    "is_embedded": False,  # Will be embedded later
                    "is_active": True
                }
                docs.append(doc)
            
            # Insert into MongoDB
            self.db[self.mongo_collection].insert_many(docs)
            logger.info(f"✅ Inserted {len(docs)} documents (embeddings pending)")
            return True
                
        except Exception as e:
            logger.error(f"❌ Error loading fallback data: {e}")
            return False
    
    def create_mongo_indexes(self):
        """Create required MongoDB indexes"""
        try:
            self.db[self.mongo_collection].create_index([("fatwa_id", 1)], unique=True)
            logger.info("✅ Created unique index on fatwa_id")
        except Exception as e:
            logger.warning(f"⚠️  Could not create unique index (may already exist): {e}")

    def run(self, force_reload: bool = False):
        """Main data loading process"""
        logger.info("🚀 Starting Smart Data Loader...")
        milvus_mode = "Milvus Lite" if self.use_milvus_lite else "Milvus Server"
        logger.info(f"📊 Using {milvus_mode}")
        
        if not self.wait_for_services():
            logger.error("❌ Services not ready, aborting")
            return False
        
        if not force_reload and self.check_existing_data():
            logger.info("✅ Data already exists, skipping load")
            return True
        
        if force_reload:
            logger.info("🗑️  Force reload: clearing existing data...")
            self.db[self.mongo_collection].delete_many({})
            if self.use_milvus_lite:
                for collection_name in [self.milvus_ar_collection, self.milvus_en_collection]:
                    if self.milvus_client.has_collection(collection_name):
                        self.milvus_client.drop_collection(collection_name)
            else:
                for collection_name in [self.milvus_ar_collection, self.milvus_en_collection]:
                    if utility.has_collection(collection_name):
                        utility.drop_collection(collection_name)
        
        self.create_milvus_collections()
        self.create_mongo_indexes()
        
        success = self.load_multilingual_data()
        
        if success and not self.use_milvus_lite:
            self.finalize_milvus_server_inserts()
        
        if success:
            logger.info("🎉 Smart Data Loader completed successfully!")
        else:
            logger.error("❌ Smart Data Loader failed!")
        
        return success

def main():
    parser = argparse.ArgumentParser(description="Smart Data Loader for IFTAA System")
    parser.add_argument("--force", action="store_true", help="Force reload data")
    parser.add_argument("--docker", action="store_true", help="Running in Docker environment")
    parser.add_argument("--lite", action="store_true", help="Use Milvus Lite instead of server")
    args = parser.parse_args()
    
    loader = DataLoader(use_lite=args.lite)
    
    if args.docker:
        logger.info("🐳 Running in Docker mode")
    
    success = loader.run(force_reload=args.force)
    exit(0 if success else 1)

if __name__ == "__main__":
    main() 