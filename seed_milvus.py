import json
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
)
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas"
JSON_FILE_PATH = "fatwas.json"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
BATCH_SIZE = 128

# --- Milvus Collection Schema ---
def create_milvus_collection(collection_name, dim):
    if utility.has_collection(collection_name):
        utility.drop_collection(collection_name)
        print(f"Dropped existing collection: {collection_name}")

    fields = [
        FieldSchema(name="pk", dtype=DataType.VARCHAR, is_primary=True, auto_id=True, max_length=100),
        FieldSchema(name="fatwa_id", dtype=DataType.INT64),
        FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=500),
        FieldSchema(name="question", dtype=DataType.VARCHAR, max_length=10000),
        FieldSchema(name="fatwa_answer", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="category_id", dtype=DataType.INT64),
        FieldSchema(name="category_title", dtype=DataType.VARCHAR, max_length=500),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim)
    ]
    schema = CollectionSchema(fields, description="Fatwas Semantic Search Collection")
    collection = Collection(collection_name, schema)
    
    index_params = {
        "metric_type": "L2",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024}
    }
    collection.create_index(field_name="embedding", index_params=index_params)
    print(f"Collection '{collection_name}' created and index is built.")
    return collection

# --- Data Loading and Embedding ---
def load_and_prepare_data(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    fatwas_to_embed = []
    for category in data:
        for fatwa in category['Fatwas']:
            text_to_embed = f"Title: {fatwa['Title']} Question: {fatwa['Question']} Answer: {fatwa['FatwaAnswer']}"
            fatwas_to_embed.append({
                "fatwa_id": fatwa['FatwaId'],
                "title": fatwa['Title'],
                "question": fatwa['Question'],
                "fatwa_answer": fatwa['FatwaAnswer'],
                "category_id": fatwa['CategoryId'],
                "category_title": fatwa['CategoryTitle'],
                "text_to_embed": text_to_embed
            })
    return fatwas_to_embed

def main():
    # Connect to Milvus
    print("Connecting to Milvus...")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    print("Successfully connected to Milvus.")

    # Load and initialize model
    print(f"Loading sentence transformer model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    embedding_dim = model.get_sentence_embedding_dimension()

    # Create collection
    collection = create_milvus_collection(COLLECTION_NAME, embedding_dim)

    # Load data
    print("Loading and preparing data from JSON file...")
    fatwas = load_and_prepare_data(JSON_FILE_PATH)
    
    # Generate embeddings and insert data in batches
    print("Generating embeddings and inserting data into Milvus...")
    for i in tqdm(range(0, len(fatwas), BATCH_SIZE), desc="Inserting batches"):
        batch = fatwas[i:i + BATCH_SIZE]
        texts = [item['text_to_embed'] for item in batch]
        
        embeddings = model.encode(texts, show_progress_bar=False)
        
        entities = [
            [item['fatwa_id'] for item in batch],
            [item['title'] for item in batch],
            [item['question'] for item in batch],
            [item['fatwa_answer'] for item in batch],
            [item['category_id'] for item in batch],
            [item['category_title'] for item in batch],
            embeddings
        ]
        collection.insert(entities)
    
    collection.flush()
    print(f"\nData insertion complete. Total fatwas inserted: {collection.num_entities}")

    # --- Verification ---
    print("\n--- Verifying Search ---")
    collection.load()
    
    query_text = "ما حكم القصر في السفر؟"
    query_embedding = model.encode([query_text])[0]
    
    search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
    
    results = collection.search(
        data=[query_embedding],
        anns_field="embedding",
        param=search_params,
        limit=3,
        output_fields=["title", "question", "fatwa_answer"]
    )
    
    print(f"Search query: '{query_text}'")
    for hit in results[0]:
        print(f"  - ID: {hit.id}, Score: {hit.distance:.4f}")
        print(f"    Title: {hit.entity.get('title')}")
        print(f"    Question: {hit.entity.get('question')}")
        print("-" * 20)

    connections.disconnect("default")
    print("Disconnected from Milvus.")

if __name__ == "__main__":
    main() 