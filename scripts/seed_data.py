import os
import json
import logging
from pymongo import MongoClient
from pymilvus import connections, Collection, utility

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Configuration ---
MONGO_URI = "mongodb://mongodb:27017/"
MILVUS_HOST = "milvus"
FATWA_FILE = "data/fatwas.json"
FATWA_COLLECTION = "fatwas"
MILVUS_COLLECTION_AR = "fatwas_ar_v2"
MILVUS_COLLECTION_EN = "fatwas_en_v2"

def seed_database():
    """Seeds MongoDB and Milvus with initial data."""
    logger.info("Starting database seeding process...")

    # Connect to MongoDB
    try:
        mongo_client = MongoClient(MONGO_URI)
        db = mongo_client["iftaa_db"]
        fatwas_collection = db[FATWA_COLLECTION]
    except Exception as e:
        logger.error(f"❌ Could not connect to MongoDB: {e}")
        return

    # Connect to Milvus
    try:
        connections.connect("default", host=MILVUS_HOST, port="19530")
    except Exception as e:
        logger.error(f"❌ Could not connect to Milvus: {e}")
        return

    # Check if data already exists
    if fatwas_collection.count_documents({}) > 0:
        logger.info("✅ Data already exists in MongoDB. Skipping seeding.")
        return

    # Load data from JSON file
    if not os.path.exists(FATWA_FILE):
        logger.error(f"❌ Data file not found: {FATWA_FILE}")
        return
        
    with open(FATWA_FILE, 'r', encoding='utf-8') as f:
        fatwas_data = json.load(f)

    # Insert into MongoDB
    logger.info(f"Inserting {len(fatwas_data)} documents into MongoDB...")
    fatwas_collection.insert_many(fatwas_data)
    logger.info("✅ MongoDB seeding complete.")

    # In a real scenario with pre-computed embeddings, you would load them here.
    # Since we are generating them on the fly via the API, we can skip seeding Milvus directly.
    # The .NET API will trigger the embedding for each new fatwa.
    # If fatwas_multilingual.json were to be used, the logic would go here.
    
    logger.info("✅ Database seeding process finished.")

if __name__ == "__main__":
    seed_database() 