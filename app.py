from flask import Flask, request, jsonify
from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer
import logging

app = Flask(__name__)

# --- Logging Configuration ---
logging.basicConfig(filename='app.log', level='DEBUG', 
                    format='%(asctime)s %(levelname)s %(name)s : %(message)s')

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 5

# --- Global Initialization ---
print("Loading model and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
model = SentenceTransformer(MODEL_NAME)

# Load both collections
collection_ar = Collection("fatwas_ar")
collection_ar.load()
collection_en = Collection("fatwas_en")
collection_en.load()

print("Initialization complete. Ready for search requests.")

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.get_json()
        query = data.get('query', '')
        lang = data.get('lang', 'ar').lower()

        if not query:
            return jsonify({"error": "Query parameter is required"}), 400
        
        # Choose collection and fields based on language
        if lang == 'en':
            collection = collection_en
            embedding_field = "embedding_en"
            output_fields = ["title_en", "question_en", "answer_en"]
        else:
            collection = collection_ar
            embedding_field = "embedding_ar"
            output_fields = ["title_ar", "question_ar", "answer_ar"]
        
        query_embedding = model.encode([query])
        search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
        
        results = collection.search(
            data=query_embedding,
            anns_field=embedding_field,
            param=search_params,
            limit=TOP_K,
            output_fields=output_fields
        )

        output = []
        for hit in results[0]:
            output.append({
                "score": hit.distance,
                "fatwa_id": hit.id,
                "result": {
                    "title": hit.entity.get('title_ar') or hit.entity.get('title_en'),
                    "question": hit.entity.get('question_ar') or hit.entity.get('question_en'),
                    "answer": hit.entity.get('answer_ar') or hit.entity.get('answer_en'),
                }
            })
        
        return jsonify(output)
    except Exception as e:
        app.logger.error("An error occurred during search", exc_info=e)
        return jsonify({"error": "An internal server error occurred. See app.log for details."}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=False) 