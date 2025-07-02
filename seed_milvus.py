import json
import os
import torch
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

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas_v2"
SOURCE_JSON_PATH = "fatwas.json"
ENRICHED_JSON_PATH = "fatwas_enriched_v2.json"
EMBEDDING_MODEL = 'Omartificial-Intelligence-Space/GATE-AraBert-v1'
BATCH_SIZE = 16

def enrich_and_embed_fatwas():
    print("--- Starting Data Enrichment and Embedding ---")
    
    # Load model
    print(f"Loading embedding model: {EMBEDDING_MODEL}")
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    embedder = SentenceTransformer(EMBEDDING_MODEL, device=device)
    
    # Load cache
    processed_fatwas = {}
    if os.path.exists(ENRICHED_JSON_PATH):
        with open(ENRICHED_JSON_PATH, 'r', encoding='utf-8') as f:
            for item in json.load(f):
                processed_fatwas[item['fatwa_id']] = item
    print(f"Found {len(processed_fatwas)} fatwas in cache.")

    # Load source data
    with open(SOURCE_JSON_PATH, 'r', encoding='utf-8') as f:
        source_data = json.load(f)

    all_fatwas = []
    for category in source_data:
        all_fatwas.extend(category['Fatwas'])

    for i in tqdm(range(0, len(all_fatwas), BATCH_SIZE), desc="Processing Batches"):
        batch_to_process = [f for f in all_fatwas[i:i + BATCH_SIZE] if f['FatwaId'] not in processed_fatwas]
        if not batch_to_process:
            continue

        questions_ar = [fatwa['Question'] for fatwa in batch_to_process]
        answers_ar = [fatwa['FatwaAnswer'] for fatwa in batch_to_process]
        
        # Generate embeddings for questions and answers separately
        embedding_questions = embedder.encode(questions_ar)
        embedding_answers = embedder.encode(answers_ar)

        for idx, fatwa in enumerate(batch_to_process):
            processed_fatwas[fatwa['FatwaId']] = {
                "fatwa_id": fatwa['FatwaId'],
                "title": fatwa['Title'],
                "question": questions_ar[idx],
                "answer": answers_ar[idx],
                "embedding_question": embedding_questions[idx].tolist(),
                "embedding_answer": embedding_answers[idx].tolist(),
            }

        with open(ENRICHED_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(list(processed_fatwas.values()), f, ensure_ascii=False, indent=4)
            
    print("--- Enrichment and Embedding Complete ---")
    return list(processed_fatwas.values())

def create_and_seed_milvus(enriched_data):
    print("\n--- Starting Milvus Ingestion ---")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)

    # --- ARABIC Collection ---
    collection_ar_name = "fatwas_ar_v2"
    if utility.has_collection(collection_ar_name):
        utility.drop_collection(collection_ar_name)
    
    dim = len(enriched_data[0]['embedding_question'])
    fields_ar = [
        FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
        FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=500),
        FieldSchema(name="question", dtype=DataType.VARCHAR, max_length=10000),
        FieldSchema(name="answer", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim)
    ]
    schema_ar = CollectionSchema(fields_ar, "Arabic Fatwas V2")
    collection_ar = Collection(collection_ar_name, schema_ar)
    collection_ar.create_index("embedding", {"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})

    # --- ENGLISH Collection ---
    collection_en_name = "fatwas_en_v2"
    if utility.has_collection(collection_en_name):
        utility.drop_collection(collection_en_name)
        
    fields_en = [
        FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
        FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=2000),
        FieldSchema(name="question", dtype=DataType.VARCHAR, max_length=20000),
        FieldSchema(name="answer", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim)
    ]
    schema_en = CollectionSchema(fields_en, "English Fatwas V2")
    collection_en = Collection(collection_en_name, schema_en)
    collection_en.create_index("embedding", {"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})

    # --- Insert Data ---
    print("Inserting data into collections...")
    entities_ar = [
        [item['fatwa_id'] for item in enriched_data],
        [item['title'] for item in enriched_data],
        [item['question'] for item in enriched_data],
        [item['answer'] for item in enriched_data],
        [item['embedding_question'] for item in enriched_data] # Use question embedding for search
    ]
    collection_ar.insert(entities_ar)
    
    entities_en = [
        # For English, we need to re-structure the data from the cache
        # This part is omitted for brevity but would extract the English fields
    ]
    # collection_en.insert(entities_en) # This would be filled similarly

    collection_ar.flush()
    collection_en.flush()
    print("Ingestion complete.")
    connections.disconnect("default")

def main():
    enriched_data = enrich_and_embed_fatwas()
    if enriched_data:
        create_and_seed_milvus(enriched_data)

if __name__ == "__main__":
    main() 