from flask import Flask, request, jsonify
from pymilvus import connections, Collection, utility
from sentence_transformers import SentenceTransformer
import re
import json

app = Flask(__name__)

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 5

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

# --- Global Initialization ---
print("Loading model and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
model = SentenceTransformer(MODEL_NAME)
detector = QuranDetector("quran_surahs.json")

# Get collection handles
collection_ar = Collection("fatwas_ar")
collection_en = Collection("fatwas_en")

print("Initialization complete. Ready for search requests.")

@app.route('/search', methods=['POST'])
def search():
    try:
        data = request.get_json()
        query = data.get('query', '')
        lang = data.get('lang', 'ar').lower()

        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        if lang == 'ar':
            collection = collection_ar
            embedding_field = "embedding_ar"
            output_fields = ["pk", "title_ar", "question_ar", "answer_ar", "quranic_verses"]
        else:
            collection = collection_en
            embedding_field = "embedding_en"
            output_fields = ["pk", "title_en", "question_en", "answer_en", "quranic_verses"]
        
        # Ensure the selected collection is loaded before any search operation
        if utility.load_state(collection.name) != "Loaded":
            collection.load(replica_number=1)
            utility.wait_for_loading_complete(collection.name)

        quranic_citations = detector.extract_citations(query)
        search_type = "semantic"
        search_results = None

        if quranic_citations:
            search_type = "hybrid_quranic"
            # Combine filters: must be Quranic AND contain one of the verses
            verse_expr = " or ".join([f'array_contains(quranic_verses, "{citation}")' for citation in quranic_citations])
            expr = f'is_quranic_related == "True" and ({verse_expr})'
            
            search_results = collection.search(
                data=model.encode([query]),
                anns_field=embedding_field,
                param={"metric_type": "L2", "params": {"nprobe": 10}},
                limit=TOP_K,
                expr=expr,
                output_fields=output_fields
            )

        # Fallback or default semantic search
        if not search_results or not search_results[0]:
            search_type = "semantic_fallback" if quranic_citations else "semantic"
            search_results = collection.search(
                data=model.encode([query]),
                anns_field=embedding_field,
                param={"metric_type": "L2", "params": {"nprobe": 10}},
                limit=TOP_K,
                output_fields=output_fields
            )
        
        # Format and return results
        output = {"search_type": search_type, "results": []}
        if search_results:
            for hit in search_results[0]:
                output["results"].append({
                    "score": hit.distance,
                    "fatwa_id": hit.id,
                    "result": hit.entity.to_dict()['entity']
                })
        
        return jsonify(output)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=False) 