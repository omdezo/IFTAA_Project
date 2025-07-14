import json
import os
import time
import torch
import logging
from tqdm import tqdm
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
)
from sentence_transformers import SentenceTransformer
from transformers import pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_milvus.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- Configuration from Environment Variables ---
MILVUS_HOST = os.getenv("MILVUS_HOST", "127.0.0.1")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
COLLECTION_AR_NAME = os.getenv("COLLECTION_AR_NAME", "fatwas_ar")
COLLECTION_EN_NAME = os.getenv("COLLECTION_EN_NAME", "fatwas_en")

# Source and Cache files
SOURCE_JSON_PATH = os.getenv("SOURCE_JSON_PATH", "fatwas.json")
ENRICHED_JSON_PATH = os.getenv("ENRICHED_JSON_PATH", "fatwas_multilingual.json")

# Models - Using the same model as app.py for consistency
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2')
TRANSLATION_MODEL = os.getenv("TRANSLATION_MODEL", 'Helsinki-NLP/opus-mt-ar-en')
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "16"))

def translate_and_embed_fatwas():
    logger.info("--- Phase 1: Starting Translation and Embedding ---")
    
    try:
        # Load models
        logger.info("Loading embedding and translation models...")
        embedder = SentenceTransformer(EMBEDDING_MODEL)
        translator = pipeline("translation", model=TRANSLATION_MODEL, device=0 if torch.cuda.is_available() else -1)
        logger.info("Models loaded successfully")
        
        # Load cache
        processed_fatwas = {}
        if os.path.exists(ENRICHED_JSON_PATH):
            try:
                with open(ENRICHED_JSON_PATH, 'r', encoding='utf-8') as f:
                    for item in json.load(f):
                        processed_fatwas[item['fatwa_id']] = item
                logger.info(f"Found {len(processed_fatwas)} fatwas in cache.")
            except json.JSONDecodeError as e:
                logger.warning(f"Cache file corrupted, starting fresh: {str(e)}")
                processed_fatwas = {}

        # Load source data
        if not os.path.exists(SOURCE_JSON_PATH):
            logger.error(f"Source file not found: {SOURCE_JSON_PATH}")
            return None
            
        with open(SOURCE_JSON_PATH, 'r', encoding='utf-8') as f:
            source_data = json.load(f)

        all_fatwas = []
        for category in source_data:
            all_fatwas.extend(category['Fatwas'])

        logger.info(f"Total fatwas to process: {len(all_fatwas)}")

        for i in tqdm(range(0, len(all_fatwas), BATCH_SIZE), desc="Processing Batches"):
            batch_to_process = [f for f in all_fatwas[i:i + BATCH_SIZE] if f['FatwaId'] not in processed_fatwas]
            if not batch_to_process:
                continue

            try:
                titles_ar = [fatwa['Title'] for fatwa in batch_to_process]
                questions_ar = [fatwa['Question'] for fatwa in batch_to_process]
                answers_ar = [fatwa['FatwaAnswer'] for fatwa in batch_to_process]

                titles_en = [res['translation_text'] for res in translator(titles_ar, max_length=512, truncation=True)]
                questions_en = [res['translation_text'] for res in translator(questions_ar, max_length=512, truncation=True)]
                answers_en = [res['translation_text'] for res in translator(answers_ar, max_length=512, truncation=True)]

                full_texts_en = [f"{t} {q} {a}" for t, q, a in zip(titles_en, questions_en, answers_en)]
                full_texts_ar = [f"{t} {q} {a}" for t, q, a in zip(titles_ar, questions_ar, answers_ar)]
                
                embeddings_en = embedder.encode(full_texts_en)
                embeddings_ar = embedder.encode(full_texts_ar)

                for idx, fatwa in enumerate(batch_to_process):
                    processed_fatwas[fatwa['FatwaId']] = {
                        "fatwa_id": fatwa['FatwaId'],
                        "title_ar": titles_ar[idx],
                        "question_ar": questions_ar[idx],
                        "answer_ar": answers_ar[idx],
                        "category_title_ar": fatwa['CategoryTitle'],
                        "title_en": titles_en[idx],
                        "question_en": questions_en[idx],
                        "answer_en": answers_en[idx],
                        "embedding_ar": embeddings_ar[idx].tolist(),
                        "embedding_en": embeddings_en[idx].tolist(),
                    }

                # Save progress periodically
                with open(ENRICHED_JSON_PATH, 'w', encoding='utf-8') as f:
                    json.dump(list(processed_fatwas.values()), f, ensure_ascii=False, indent=4)
                    
            except Exception as e:
                logger.error(f"Error processing batch {i}: {str(e)}")
                continue
                
        logger.info("--- Phase 1: Complete ---")
        return list(processed_fatwas.values())
        
    except Exception as e:
        logger.error(f"Critical error in translation and embedding phase: {str(e)}")
        return None

def create_and_seed_milvus(enriched_data):
    logger.info("\n--- Phase 2: Starting Milvus Ingestion ---")
    
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        logger.info(f"Connected to Milvus at {MILVUS_HOST}:{MILVUS_PORT}")
        
        if not enriched_data:
            logger.error("No enriched data available for ingestion")
            return False
            
        # --- Create ARABIC collection ---
        if utility.has_collection(COLLECTION_AR_NAME):
            logger.info(f"Dropping existing collection: {COLLECTION_AR_NAME}")
            utility.drop_collection(COLLECTION_AR_NAME)

        dim = len(enriched_data[0]['embedding_ar'])
        logger.info(f"Embedding dimension: {dim}")
        
        fields_ar = [
            FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
            FieldSchema(name="title_ar", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="question_ar", dtype=DataType.VARCHAR, max_length=10000),
            FieldSchema(name="answer_ar", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding_ar", dtype=DataType.FLOAT_VECTOR, dim=dim),
        ]
        schema_ar = CollectionSchema(fields_ar, "Arabic Fatwas")
        collection_ar = Collection(COLLECTION_AR_NAME, schema_ar)
        collection_ar.create_index(field_name="embedding_ar", index_params={"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})
        logger.info(f"Created Arabic collection: {COLLECTION_AR_NAME}")
        
        # --- Create ENGLISH collection ---
        if utility.has_collection(COLLECTION_EN_NAME):
            logger.info(f"Dropping existing collection: {COLLECTION_EN_NAME}")
            utility.drop_collection(COLLECTION_EN_NAME)

        fields_en = [
            FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
            FieldSchema(name="title_en", dtype=DataType.VARCHAR, max_length=2000),
            FieldSchema(name="question_en", dtype=DataType.VARCHAR, max_length=20000),
            FieldSchema(name="answer_en", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding_en", dtype=DataType.FLOAT_VECTOR, dim=dim),
        ]
        schema_en = CollectionSchema(fields_en, "English Fatwas")
        collection_en = Collection(COLLECTION_EN_NAME, schema_en)
        collection_en.create_index(field_name="embedding_en", index_params={"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})
        logger.info(f"Created English collection: {COLLECTION_EN_NAME}")

        # --- Insert data into both collections ---
        logger.info(f"Inserting {len(enriched_data)} records into Milvus collections...")
        
        total_inserted_ar = 0
        total_inserted_en = 0
        
        for i in tqdm(range(0, len(enriched_data), BATCH_SIZE), desc="Ingesting into Milvus"):
            batch = enriched_data[i:i + BATCH_SIZE]
            
            try:
                entities_ar = [
                    [item['fatwa_id'] for item in batch],
                    [item['title_ar'] for item in batch],
                    [item['question_ar'] for item in batch],
                    [item['answer_ar'] for item in batch],
                    [item['embedding_ar'] for item in batch],
                ]
                collection_ar.insert(entities_ar)
                total_inserted_ar += len(batch)

                entities_en = [
                    [item['fatwa_id'] for item in batch],
                    [item['title_en'] for item in batch],
                    [item['question_en'] for item in batch],
                    [item['answer_en'] for item in batch],
                    [item['embedding_en'] for item in batch],
                ]
                collection_en.insert(entities_en)
                total_inserted_en += len(batch)
                
            except Exception as e:
                logger.error(f"Error inserting batch {i}: {str(e)}")
                continue

        collection_ar.flush()
        collection_en.flush()
        
        logger.info(f"Ingestion complete. Total entities in '{COLLECTION_AR_NAME}': {collection_ar.num_entities}")
        logger.info(f"Ingestion complete. Total entities in '{COLLECTION_EN_NAME}': {collection_en.num_entities}")
        
        connections.disconnect("default")
        return True
        
    except Exception as e:
        logger.error(f"Critical error in Milvus ingestion phase: {str(e)}")
        return False

def main():
    try:
        logger.info("Starting Milvus seeding process...")
        
        enriched_data = translate_and_embed_fatwas()
        if enriched_data:
            success = create_and_seed_milvus(enriched_data)
            if success:
                logger.info("Milvus seeding process completed successfully!")
            else:
                logger.error("Milvus seeding process failed during ingestion phase")
                exit(1)
        else:
            logger.error("Milvus seeding process failed during translation/embedding phase")
            exit(1)
            
    except Exception as e:
        logger.error(f"Critical error in main process: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main() 