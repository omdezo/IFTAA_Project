from flask import Flask, request, jsonify
from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer
from FlagEmbedding import FlagReranker

app = Flask(__name__)

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
RETRIEVER_MODEL = 'Omartificial-Intelligence-Space/GATE-AraBert-v1'
RERANKER_MODEL = 'BAAI/bge-reranker-base'
TOP_K_RETRIEVE = 25  # Retrieve more results initially
TOP_K_RERANK = 5   # Return the top 5 after re-ranking

# --- Global Initialization ---
print("Loading models and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
retriever = SentenceTransformer(RETRIEVER_MODEL)
reranker = FlagReranker(RERANKER_MODEL)

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
    
    # 1. Retrieve
    query_embedding = retriever.encode([query])
    search_results = collection.search(
        data=query_embedding,
        anns_field="embedding",
        param={"metric_type": "L2", "params": {"nprobe": 10}},
        limit=TOP_K_RETRIEVE,
        output_fields=["title", "question", "answer"]
    )

    # 2. Re-rank
    passages = [f"{hit.entity.get('title')}. {hit.entity.get('question')}" for hit in search_results[0]]
    scores = reranker.compute_score([[query, p] for p in passages])
    
    # Combine hits with new scores and sort
    reranked_hits = sorted(zip(scores, search_results[0]), key=lambda x: x[0], reverse=True)
    
    # 3. Format Output
    output = []
    for score, hit in reranked_hits[:TOP_K_RERANK]:
        output.append({
            "rerank_score": score,
            "original_score": hit.distance,
            "fatwa_id": hit.id,
            "result": {
                "title": hit.entity.get("title"),
                "question": hit.entity.get("question"),
                "answer": hit.entity.get("answer")
            }
        })
    
    return jsonify(output)

if __name__ == '__main__':
    app.run(port=5001, debug=False) 