from flask import Flask, request, jsonify
from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer

app = Flask(__name__)

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
MODEL_NAME = 'Omartificial-Intelligence-Space/GATE-AraBert-v1'
TOP_K = 5

# --- Global Initialization ---
print("Loading model and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
model = SentenceTransformer(MODEL_NAME)

collection_ar = Collection("fatwas_ar_v2")
collection_ar.load()
collection_en = Collection("fatwas_en_v2")
collection_en.load()
print("Initialization complete.")

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    query = data.get('query', '')
    lang = data.get('lang', 'ar').lower()

    if not query:
        return jsonify({"error": "Query is required"}), 400

    collection = collection_ar if lang == 'ar' else collection_en
    
    query_embedding = model.encode([query])
    search_results = collection.search(
        data=query_embedding,
        anns_field="embedding",
        param={"metric_type": "L2", "params": {"nprobe": 10}},
        limit=TOP_K,
        output_fields=["title", "question", "answer"]
    )

    output = []
    if search_results and search_results[0]:
        for hit in search_results[0]:
            output.append({
                "score": hit.distance,
                "fatwa_id": hit.id,
                "result": hit.entity.to_dict()
            })
    
    return jsonify({"results": output})

if __name__ == '__main__':
    app.run(port=5001, debug=False) 