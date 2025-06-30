import json
import os
import time
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
from transformers import pipeline
import re

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas_multilingual"

# Source and Cache files
SOURCE_JSON_PATH = "fatwas.json"
ENRICHED_JSON_PATH = "fatwas_multilingual.json"

# Models (Using public, non-gated models)
EMBEDDING_MODEL = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TRANSLATION_MODEL = 'Helsinki-NLP/opus-mt-ar-en'
BATCH_SIZE = 16

# --- Quran Detector Class ---
class QuranDetector:
    def __init__(self, surah_file_path):
        with open(surah_file_path, 'r', encoding='utf-8') as f:
            self.surahs_data = json.load(f)
        surah_names = [re.escape(s['titleAr']) for s in self.surahs_data]
        self.surah_pattern = re.compile(r'سورة\s*(' + '|'.join(surah_names) + r')')
        self.verse_pattern = re.compile(r'[\(\[]\s*([^\s:\)\]]+)\s*:\s*(\d+)\s*[\)\]]')

    def extract_citations(self, text):
        citations = []
        found_surahs = self.surah_pattern.findall(text)
        for surah_name in found_surahs:
            citations.append(f"سورة {surah_name.strip()}")
        found_verses = self.verse_pattern.findall(text)
        for surah_name, verse_num in found_verses:
            cleaned_surah_name = surah_name.strip()
            citations.append(f"{cleaned_surah_name}:{verse_num.strip()}")
        return list(set(c for c in citations if "Title" not in c and "Answer" not in c and "Question" not in c))

def translate_and_embed_fatwas():
    print("--- Phase 1: Starting Translation and Embedding ---")
    
    # Load models
    print("Loading embedding and translation models...")
    embedder = SentenceTransformer(EMBEDDING_MODEL)
    translator = pipeline("translation", model=TRANSLATION_MODEL, device=0 if torch.cuda.is_available() else -1)
    detector = QuranDetector("quran_surahs.json")
    
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

        titles_ar = [fatwa['Title'] for fatwa in batch_to_process]
        questions_ar = [fatwa['Question'] for fatwa in batch_to_process]
        answers_ar = [fatwa['FatwaAnswer'] for fatwa in batch_to_process]

        # Detect quranic content before translation/embedding
        citations_batch = [detector.extract_citations(f"{fatwa['Title']} {fatwa['Question']} {fatwa['FatwaAnswer']}") for fatwa in batch_to_process]
        
        # Clean text for embedding
        cleaned_texts_ar = []
        for i, fatwa in enumerate(batch_to_process):
            full_text = f"{fatwa['Title']} {fatwa['Question']} {fatwa['FatwaAnswer']}"
            cleaned_text = detector.surah_pattern.sub('', full_text)
            cleaned_text = detector.verse_pattern.sub('', cleaned_text).strip()
            cleaned_texts_ar.append(cleaned_text)

        titles_en = [res['translation_text'] for res in translator(titles_ar, max_length=512, truncation=True)]
        questions_en = [res['translation_text'] for res in translator(questions_ar, max_length=512, truncation=True)]
        answers_en = [res['translation_text'] for res in translator(answers_ar, max_length=512, truncation=True)]

        full_texts_en = [f"{t} {q} {a}" for t, q, a in zip(titles_en, questions_en, answers_en)]
        
        embeddings_en = embedder.encode(full_texts_en)
        embeddings_ar = embedder.encode(cleaned_texts_ar)

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
                "is_quranic_related": len(citations_batch[idx]) > 0,
                "quranic_verses": citations_batch[idx],
            }

        with open(ENRICHED_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(list(processed_fatwas.values()), f, ensure_ascii=False, indent=4)
            
    print("--- Phase 1: Complete ---")
    return list(processed_fatwas.values())

def create_and_seed_milvus(enriched_data):
    print("\n--- Phase 2: Starting Milvus Ingestion ---")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    
    # --- Create ARABIC collection ---
    collection_ar_name = "fatwas_ar"
    if utility.has_collection(collection_ar_name):
        utility.drop_collection(collection_ar_name)

    dim = len(enriched_data[0]['embedding_ar'])
    fields_ar = [
        FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
        FieldSchema(name="title_ar", dtype=DataType.VARCHAR, max_length=500),
        FieldSchema(name="question_ar", dtype=DataType.VARCHAR, max_length=10000),
        FieldSchema(name="answer_ar", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="is_quranic_related", dtype=DataType.VARCHAR, max_length=8),
        FieldSchema(name="quranic_verses", dtype=DataType.ARRAY, element_type=DataType.VARCHAR, max_capacity=100, max_length=100),
        FieldSchema(name="embedding_ar", dtype=DataType.FLOAT_VECTOR, dim=dim),
    ]
    schema_ar = CollectionSchema(fields_ar, "Arabic Fatwas with Quranic metadata")
    collection_ar = Collection(collection_ar_name, schema_ar)
    collection_ar.create_index(field_name="embedding_ar", index_params={"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})
    collection_ar.create_index(field_name="is_quranic_related") # Scalar Index
    
    # --- Create ENGLISH collection ---
    collection_en_name = "fatwas_en"
    if utility.has_collection(collection_en_name):
        utility.drop_collection(collection_en_name)

    fields_en = [
        FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True),
        FieldSchema(name="title_en", dtype=DataType.VARCHAR, max_length=2000),
        FieldSchema(name="question_en", dtype=DataType.VARCHAR, max_length=20000),
        FieldSchema(name="answer_en", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="is_quranic_related", dtype=DataType.VARCHAR, max_length=8),
        FieldSchema(name="quranic_verses", dtype=DataType.ARRAY, element_type=DataType.VARCHAR, max_capacity=100, max_length=100),
        FieldSchema(name="embedding_en", dtype=DataType.FLOAT_VECTOR, dim=dim),
    ]
    schema_en = CollectionSchema(fields_en, "English Fatwas with Quranic metadata")
    collection_en = Collection(collection_en_name, schema_en)
    collection_en.create_index(field_name="embedding_en", index_params={"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})
    collection_en.create_index(field_name="is_quranic_related") # Scalar Index

    # --- Insert data into both collections ---
    print(f"Inserting {len(enriched_data)} records into Milvus collections...")
    for i in tqdm(range(0, len(enriched_data), BATCH_SIZE), desc="Ingesting into Milvus"):
        batch = enriched_data[i:i + BATCH_SIZE]
        
        # Insert into Arabic collection
        entities_ar = [
            [item['fatwa_id'] for item in batch],
            [item['title_ar'] for item in batch],
            [item['question_ar'] for item in batch],
            [item['answer_ar'] for item in batch],
            [str(item['is_quranic_related']) for item in batch],
            [item['quranic_verses'] for item in batch],
            [item['embedding_ar'] for item in batch],
        ]
        collection_ar.insert(entities_ar)

        # Insert into English collection
        entities_en = [
            [item['fatwa_id'] for item in batch],
            [item['title_en'] for item in batch],
            [item['question_en'] for item in batch],
            [item['answer_en'] for item in batch],
            [str(item['is_quranic_related']) for item in batch],
            [item['quranic_verses'] for item in batch],
            [item['embedding_en'] for item in batch],
        ]
        collection_en.insert(entities_en)

    collection_ar.flush()
    collection_en.flush()
    print(f"Ingestion complete. Total entities in 'fatwas_ar': {collection_ar.num_entities}")
    print(f"Ingestion complete. Total entities in 'fatwas_en': {collection_en.num_entities}")
    connections.disconnect("default")

def main():
    enriched_data = translate_and_embed_fatwas()
    if enriched_data:
        create_and_seed_milvus(enriched_data)

if __name__ == "__main__":
    main() 