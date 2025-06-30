import argparse
from pymilvus import connections, Collection, utility
from sentence_transformers import SentenceTransformer

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 3 # Number of results to return

def main(query_text):
    # Connect to Milvus
    print("Connecting to Milvus...")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    
    if not utility.has_collection(COLLECTION_NAME):
        print(f"Error: Collection '{COLLECTION_NAME}' not found.")
        print("Please run 'seed_milvus.py' first.")
        return

    collection = Collection(COLLECTION_NAME)
    collection.load()

    # Load model
    print(f"Loading sentence transformer model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    # Embed query
    print(f"Embedding search query: '{query_text}'")
    query_embedding = model.encode([query_text])[0]

    # Search
    search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
    
    results = collection.search(
        data=[query_embedding],
        anns_field="embedding",
        param=search_params,
        limit=TOP_K,
        output_fields=["title", "question", "fatwa_answer", "category_title"]
    )

    print("\n--- Search Results ---")
    if not results[0]:
        print("No results found.")
    else:
        for hit in results[0]:
            print(f"Score (Distance): {hit.distance:.4f}")
            print(f"Title: {hit.entity.get('title')}")
            print(f"Category: {hit.entity.get('category_title')}")
            print(f"Question: {hit.entity.get('question')}")
            print(f"Answer: {hit.entity.get('fatwa_answer')[:300]}...") # Print first 300 chars of answer
            print("-" * 30)

    connections.disconnect("default")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search for fatwas in Milvus.")
    parser.add_argument("query", type=str, help="The search query in Arabic.")
    args = parser.parse_args()
    
    main(args.query) 