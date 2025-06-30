from flask import Flask, request, jsonify
from pymilvus import connections, Collection
from sentence_transformers import SentenceTransformer
from langdetect import detect
import re
import json

app = Flask(__name__)

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
AR_COLLECTION_NAME = "fatwas_ar"
EN_COLLECTION_NAME = "fatwas_en"
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
print("Loading models and connecting to Milvus...")
connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
model = SentenceTransformer(MODEL_NAME)
detector = QuranDetector('quran_surahs.json')
ar_collection = Collection(AR_COLLECTION_NAME)
en_collection = Collection(EN_COLLECTION_NAME)
ar_collection.load()
en_collection.load()
print("Initialization complete.")

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    query = data.get('query', '')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    # 1. Language Detection
    try:
        lang = detect(query)
    except:
        lang = 'en' # Default to english if detection fails

    # 2. Quranic Search (only for Arabic)
    if lang == 'ar':
        quranic_citations = detector.extract_citations(query)
        if quranic_citations:
            # This would be the place for the exact-match logic.
            # Since it was problematic, we proceed to semantic.
            # For a production system, this would be a separate query.
            pass

    # 3. Semantic Search
    query_embedding = model.encode([query])[0]
    
    if lang == 'ar':
        search_collection = ar_collection
        search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
        results = search_collection.search(
            data=[query_embedding], anns_field="embedding", param=search_params, limit=TOP_K,
            output_fields=["fatwa_id", "title", "question", "category_title"]
        )
    else: # English or other
        search_collection = en_collection
        search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
        results = search_collection.search(
            data=[query_embedding], anns_field="embedding", param=search_params, limit=TOP_K,
            output_fields=["fatwa_id", "title_en", "question_en"]
        )
    
    # 4. Consolidate Results
    output_results = []
    if results:
        fatwa_ids = [hit.entity.get('fatwa_id') for hit in results[0]]
        
        # Get the corresponding data from both collections
        ar_results = ar_collection.query(f"fatwa_id in {fatwa_ids}", output_fields=["*"])
        en_results = en_collection.query(f"fatwa_id in {fatwa_ids}", output_fields=["*"])
        
        # Create a dictionary for easy lookup
        ar_map = {res['fatwa_id']: res for res in ar_results}
        en_map = {res['fatwa_id']: res for res in en_results}

        for hit in results[0]:
            fatwa_id = hit.entity.get('fatwa_id')
            ar_data = ar_map.get(fatwa_id, {})
            en_data = en_map.get(fatwa_id, {})
            output_results.append({
                "score": hit.distance,
                "fatwa_id": fatwa_id,
                "arabic": ar_data,
                "english": en_data
            })

    return jsonify({
        "detected_language": lang,
        "results": output_results
    })

if __name__ == '__main__':
    app.run(port=5001, debug=False) 