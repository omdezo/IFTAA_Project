from flask import Flask, request, jsonify
from pymilvus import connections, Collection, utility
from sentence_transformers import SentenceTransformer
import re
import json
import logging

app = Flask(__name__)

# --- Logging Configuration ---
logging.basicConfig(filename='app.log', level=logging.ERROR, 
                    format='%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s')

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 3

# --- Quran Detector Class (copied from seed_milvus.py) ---
class QuranDetector:
    def __init__(self, surah_file_path):
        with open(surah_file_path, 'r', encoding='utf-8') as f:
            self.surahs_data = json.load(f)
        surah_names = [s['titleAr'] for s in self.surahs_data]
        self.surah_pattern = re.compile(r'سورة\s*(' + '|'.join(surah_names) + r')')
        self.verse_pattern = re.compile(r'\(?(\S+?)\s*:\s*(\d+)\)?')

    def extract_citations(self, text):
        citations = []
        found_surahs = self.surah_pattern.findall(text)
        if found_surahs:
            for surah_name in found_surahs:
                citations.append(f"سورة {surah_name}")
        found_verses = self.verse_pattern.findall(text)
        if found_verses:
            for surah_name, verse_num in found_verses:
                 citations.append(f"{surah_name}:{verse_num}")
        return list(set(citations))

# --- Global Initialization ---
print("Loading models and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
model = SentenceTransformer(MODEL_NAME)
detector = QuranDetector('quran_surahs.json')
collection = Collection(COLLECTION_NAME)
collection.load()
print("Initialization complete.")

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.get_json()
        query = data.get('query', '')

        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        quranic_citations = detector.extract_citations(query)
        
        search_results = []
        search_type = "semantic"

        # --- Search Routing Logic ---
        if quranic_citations:
            search_type = "exact_quranic"
            # Use a filter expression to find exact matches
            # We search for any fatwa that contains any of the cited verses
            expr = " or ".join([f"quranic_verses like '%{citation}%'" for citation in quranic_citations])
            
            # We still need to provide a vector for the search method, but it won't be used for filtering
            # We can just use the query embedding
            query_embedding = model.encode([query])[0]

            results = collection.search(
                data=[query_embedding],
                anns_field="embedding",
                param={"metric_type": "L2", "params": {"nprobe": 1}}, # Low nprobe as filter is primary
                limit=TOP_K,
                expr=expr,
                output_fields=["title", "question", "fatwa_answer", "category_title", "quranic_verses"]
            )
            search_results = results[0]

        # Fallback or default semantic search
        if not search_results:
            search_type = "semantic_fallback" if quranic_citations else "semantic"
            query_embedding = model.encode([query])[0]
            results = collection.search(
                data=[query_embedding],
                anns_field="embedding",
                param={"metric_type": "L2", "params": {"nprobe": 10}},
                limit=TOP_K,
                output_fields=["title", "question", "fatwa_answer", "category_title", "quranic_verses"]
            )
            search_results = results[0]

        # --- Format and Return Results ---
        output = {
            "search_type": search_type,
            "query": query,
            "quranic_citations_detected": quranic_citations,
            "results": []
        }
        for hit in search_results:
            output["results"].append({
                "score": hit.distance,
                "title": hit.entity.get('title'),
                "category": hit.entity.get('category_title'),
                "question": hit.entity.get('question'),
                "answer": hit.entity.get('fatwa_answer'),
                "quranic_verses_in_fatwa": hit.entity.get('quranic_verses')
            })
        
        return jsonify(output)
    except Exception as e:
        app.logger.error("An error occurred during search", exc_info=e)
        return jsonify({"error": "An internal server error occurred."}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=False) 