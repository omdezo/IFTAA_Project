#!/usr/bin/env python3
"""
IFTAA Data Migration Script
Migrates existing fatwa data from JSON/CSV to MongoDB + Milvus system
"""

import os
import json
import csv
import logging
import time
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional
import pymongo
from pymongo import MongoClient
from tqdm import tqdm
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class IftaaDataMigrator:
    """Data migrator for IFTAA system"""
    
    def __init__(self, mongodb_uri: str, python_service_url: str):
        self.mongodb_uri = mongodb_uri
        self.python_service_url = python_service_url
        self.mongodb_client = None
        self.database = None
        
    def connect_mongodb(self):
        """Connect to MongoDB"""
        try:
            self.mongodb_client = MongoClient(self.mongodb_uri)
            self.database = self.mongodb_client.iftaa_db
            
            # Test connection
            self.mongodb_client.admin.command('ping')
            logger.info("✅ Connected to MongoDB")
            
            # Create indexes
            self._create_indexes()
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {str(e)}")
            raise
    
    def _create_indexes(self):
        """Create MongoDB indexes for performance"""
        try:
            fatwas = self.database.fatwas
            
            # Create indexes
            fatwas.create_index([("fatwa_id", 1)], unique=True)
            fatwas.create_index([("category", 1), ("is_active", 1)])
            fatwas.create_index([("is_embedded", 1)])
            fatwas.create_index([("created_at", -1)])
            fatwas.create_index([("tags", 1)])
            fatwas.create_index([("source", 1)])
            
            # Text indexes for search
            fatwas.create_index([
                ("title_ar", "text"),
                ("title_en", "text"),
                ("question_ar", "text"),
                ("question_en", "text"),
                ("answer_ar", "text"),
                ("answer_en", "text")
            ])
            
            logger.info("✅ Created MongoDB indexes")
            
        except Exception as e:
            logger.warning(f"Index creation warning: {str(e)}")
    
    def load_json_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Load fatwa data from JSON file"""
        try:
            logger.info(f"Loading data from: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle different JSON structures
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # If it's grouped by category, flatten it
                flattened = []
                for category, fatwas in data.items():
                    if isinstance(fatwas, list):
                        for fatwa in fatwas:
                            if isinstance(fatwa, dict):
                                fatwa['category'] = category
                                flattened.append(fatwa)
                return flattened
            else:
                logger.error("Unsupported JSON structure")
                return []
                
        except Exception as e:
            logger.error(f"❌ Failed to load JSON data: {str(e)}")
            return []
    
    def load_csv_data(self, file_path: str) -> List[Dict[str, Any]]:
        """Load fatwa data from CSV file"""
        try:
            logger.info(f"Loading data from: {file_path}")
            
            fatwas = []
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Clean and standardize the data
                    fatwa = {
                        'title_ar': row.get('title', row.get('Title', '')).strip(),
                        'question_ar': row.get('question', row.get('Question', '')).strip(),
                        'answer_ar': row.get('answer', row.get('Answer', '')).strip(),
                        'category': row.get('category', row.get('Category', 'عام')).strip(),
                    }
                    
                    if fatwa['title_ar'] and fatwa['question_ar'] and fatwa['answer_ar']:
                        fatwas.append(fatwa)
            
            return fatwas
            
        except Exception as e:
            logger.error(f"❌ Failed to load CSV data: {str(e)}")
            return []
    
    def normalize_fatwa_data(self, raw_fatwa: Dict[str, Any], fatwa_id: int) -> Dict[str, Any]:
        """Normalize fatwa data to MongoDB schema"""
        
        # Extract fields with various possible names
        title_ar = (
            raw_fatwa.get('title_ar') or 
            raw_fatwa.get('title') or 
            raw_fatwa.get('Title') or 
            raw_fatwa.get('TitleAr') or ''
        ).strip()
        
        title_en = (
            raw_fatwa.get('title_en') or 
            raw_fatwa.get('TitleEn') or 
            raw_fatwa.get('title_english') or ''
        ).strip()
        
        question_ar = (
            raw_fatwa.get('question_ar') or 
            raw_fatwa.get('question') or 
            raw_fatwa.get('Question') or 
            raw_fatwa.get('QuestionAr') or ''
        ).strip()
        
        question_en = (
            raw_fatwa.get('question_en') or 
            raw_fatwa.get('QuestionEn') or 
            raw_fatwa.get('question_english') or ''
        ).strip()
        
        answer_ar = (
            raw_fatwa.get('answer_ar') or 
            raw_fatwa.get('answer') or 
            raw_fatwa.get('Answer') or 
            raw_fatwa.get('AnswerAr') or ''
        ).strip()
        
        answer_en = (
            raw_fatwa.get('answer_en') or 
            raw_fatwa.get('AnswerEn') or 
            raw_fatwa.get('answer_english') or ''
        ).strip()
        
        category = (
            raw_fatwa.get('category') or 
            raw_fatwa.get('Category') or 
            'عام'
        ).strip()
        
        # Parse tags
        tags = []
        tags_field = raw_fatwa.get('tags', raw_fatwa.get('Tags', []))
        if isinstance(tags_field, str):
            try:
                tags = json.loads(tags_field)
            except:
                tags = [tag.strip() for tag in tags_field.split(',') if tag.strip()]
        elif isinstance(tags_field, list):
            tags = tags_field
        
        # Normalize the fatwa document
        normalized = {
            'fatwa_id': fatwa_id,
            'title_ar': title_ar,
            'title_en': title_en or None,
            'question_ar': question_ar,
            'question_en': question_en or None,
            'answer_ar': answer_ar,
            'answer_en': answer_en or None,
            'category': category,
            'tags': tags,
            'source': raw_fatwa.get('source', raw_fatwa.get('Source', 'دار الإفتاء')),
            'source_reference_id': raw_fatwa.get('source_reference_id', raw_fatwa.get('reference_id')),
            'difficulty_level': raw_fatwa.get('difficulty_level', 2),
            'is_active': True,
            'is_embedded': False,
            'embedding_version': 'v1.0',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'created_by': 'migration_script',
            'view_count': raw_fatwa.get('view_count', 0),
            'average_rating': raw_fatwa.get('average_rating'),
            'rating_count': raw_fatwa.get('rating_count', 0),
            'metadata': {
                'translation_status': 'completed' if title_en and question_en and answer_en else 'pending',
                'embedding_model': 'paraphrase-multilingual-mpnet-base-v2',
                'auto_translated': bool(title_en and question_en and answer_en)
            }
        }
        
        return normalized
    
    def get_next_fatwa_id(self) -> int:
        """Get the next available fatwa ID"""
        try:
            last_fatwa = self.database.fatwas.find_one(
                {},
                sort=[("fatwa_id", -1)]
            )
            
            return (last_fatwa['fatwa_id'] + 1) if last_fatwa else 1001
            
        except Exception as e:
            logger.error(f"❌ Failed to get next fatwa ID: {str(e)}")
            return 1001
    
    def insert_fatwas_to_mongodb(self, fatwas: List[Dict[str, Any]], batch_size: int = 100) -> List[Dict[str, Any]]:
        """Insert fatwas into MongoDB in batches"""
        try:
            collection = self.database.fatwas
            inserted_fatwas = []
            current_id = self.get_next_fatwa_id()
            
            logger.info(f"Starting MongoDB insertion with fatwa_id: {current_id}")
            
            for i in tqdm(range(0, len(fatwas), batch_size), desc="Inserting into MongoDB"):
                batch = fatwas[i:i + batch_size]
                normalized_batch = []
                
                for fatwa in batch:
                    normalized = self.normalize_fatwa_data(fatwa, current_id)
                    normalized_batch.append(normalized)
                    inserted_fatwas.append(normalized)
                    current_id += 1
                
                try:
                    collection.insert_many(normalized_batch, ordered=False)
                except pymongo.errors.BulkWriteError as e:
                    # Handle duplicates gracefully
                    logger.warning(f"Some documents in batch {i} already exist")
                    for error in e.details['writeErrors']:
                        if error['code'] != 11000:  # Not a duplicate key error
                            logger.error(f"Insert error: {error}")
            
            logger.info(f"✅ Inserted {len(inserted_fatwas)} fatwas into MongoDB")
            return inserted_fatwas
            
        except Exception as e:
            logger.error(f"❌ Failed to insert fatwas into MongoDB: {str(e)}")
            return []
    
    def trigger_embedding_generation(self, fatwas: List[Dict[str, Any]], batch_size: int = 10):
        """Trigger embedding generation via Python service"""
        try:
            logger.info(f"Triggering embedding for {len(fatwas)} fatwas...")
            
            success_count = 0
            failed_count = 0
            
            for i in tqdm(range(0, len(fatwas), batch_size), desc="Triggering embeddings"):
                batch = fatwas[i:i + batch_size]
                
                for fatwa in batch:
                    try:
                        # Prepare request data
                        request_data = {
                            'fatwa_id': fatwa['fatwa_id'],
                            'title_ar': fatwa['title_ar'],
                            'title_en': fatwa['title_en'],
                            'question_ar': fatwa['question_ar'],
                            'question_en': fatwa['question_en'],
                            'answer_ar': fatwa['answer_ar'],
                            'answer_en': fatwa['answer_en'],
                            'category': fatwa['category'],
                            'tags': fatwa['tags']
                        }
                        
                        # Call Python service
                        response = requests.post(
                            f"{self.python_service_url}/fatwa",
                            json=request_data,
                            timeout=30
                        )
                        
                        if response.status_code in [200, 201]:
                            success_count += 1
                        else:
                            failed_count += 1
                            logger.warning(f"Failed to embed fatwa {fatwa['fatwa_id']}: {response.status_code}")
                            
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"Error embedding fatwa {fatwa['fatwa_id']}: {str(e)}")
                
                # Small delay to avoid overwhelming the service
                time.sleep(0.1)
            
            logger.info(f"✅ Embedding triggered: {success_count} success, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"❌ Failed to trigger embeddings: {str(e)}")
    
    def verify_migration(self) -> Dict[str, Any]:
        """Verify the migration results"""
        try:
            # MongoDB stats
            fatwas_collection = self.database.fatwas
            total_fatwas = fatwas_collection.count_documents({})
            active_fatwas = fatwas_collection.count_documents({'is_active': True})
            embedded_fatwas = fatwas_collection.count_documents({'is_embedded': True})
            
            # Category distribution
            pipeline = [
                {'$group': {'_id': '$category', 'count': {'$sum': 1}}},
                {'$sort': {'count': -1}}
            ]
            categories = list(fatwas_collection.aggregate(pipeline))
            
            # Milvus stats (try to get from Python service)
            milvus_stats = {}
            try:
                response = requests.get(f"{self.python_service_url}/health", timeout=10)
                if response.status_code == 200:
                    health_data = response.json()
                    milvus_stats = health_data.get('collections', {})
            except:
                logger.warning("Could not get Milvus stats")
            
            stats = {
                'mongodb': {
                    'total_fatwas': total_fatwas,
                    'active_fatwas': active_fatwas,
                    'embedded_fatwas': embedded_fatwas,
                    'embedding_percentage': (embedded_fatwas / total_fatwas * 100) if total_fatwas > 0 else 0,
                    'categories': categories
                },
                'milvus': milvus_stats,
                'migration_timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info("✅ Migration verification completed")
            return stats
            
        except Exception as e:
            logger.error(f"❌ Migration verification failed: {str(e)}")
            return {}

def main():
    parser = argparse.ArgumentParser(description='Migrate IFTAA data to MongoDB + Milvus')
    parser.add_argument('--source', required=True, help='Source data file (JSON or CSV)')
    parser.add_argument('--mongodb-uri', default='mongodb://admin:IftaaDB2024!@localhost:27017/iftaa_db?authSource=admin')
    parser.add_argument('--python-service', default='http://localhost:5001')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for processing')
    parser.add_argument('--skip-embedding', action='store_true', help='Skip embedding generation')
    parser.add_argument('--verify-only', action='store_true', help='Only run verification')
    
    args = parser.parse_args()
    
    # Initialize migrator
    migrator = IftaaDataMigrator(args.mongodb_uri, args.python_service)
    
    try:
        # Connect to MongoDB
        migrator.connect_mongodb()
        
        if args.verify_only:
            # Only run verification
            stats = migrator.verify_migration()
            print("\n" + "="*50)
            print("MIGRATION VERIFICATION RESULTS")
            print("="*50)
            print(json.dumps(stats, indent=2, ensure_ascii=False))
            return
        
        # Load source data
        if args.source.endswith('.json'):
            source_data = migrator.load_json_data(args.source)
        elif args.source.endswith('.csv'):
            source_data = migrator.load_csv_data(args.source)
        else:
            logger.error("❌ Unsupported file format. Use JSON or CSV.")
            return
        
        if not source_data:
            logger.error("❌ No data loaded from source file")
            return
        
        logger.info(f"📊 Loaded {len(source_data)} fatwas from source")
        
        # Insert into MongoDB
        inserted_fatwas = migrator.insert_fatwas_to_mongodb(source_data, args.batch_size)
        
        if not inserted_fatwas:
            logger.error("❌ No fatwas inserted into MongoDB")
            return
        
        # Trigger embedding generation
        if not args.skip_embedding:
            migrator.trigger_embedding_generation(inserted_fatwas, batch_size=10)
        
        # Verify migration
        stats = migrator.verify_migration()
        
        # Print results
        print("\n" + "="*50)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("="*50)
        print(json.dumps(stats, indent=2, ensure_ascii=False))
        
        logger.info("🎉 Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise

if __name__ == '__main__':
    main() 