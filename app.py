from flask import Flask, request, jsonify
from pymilvus import connections, Collection, utility, FieldSchema, CollectionSchema, DataType
from sentence_transformers import SentenceTransformer
import re
import json
import time

app = Flask(__name__)

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 5
FATWAS_AR_COLLECTION = "fatwas_ar"
FATWAS_EN_COLLECTION = "fatwas_en"
QUERIES_COLLECTION = "search_queries"

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
embedding_dim = model.get_sentence_embedding_dimension()
detector = QuranDetector("quran_surahs.json")

# Load fatwa collections
collection_ar = Collection(FATWAS_AR_COLLECTION)
collection_en = Collection(FATWAS_EN_COLLECTION)

# Create search_queries collection if it doesn't exist
if not utility.has_collection(QUERIES_COLLECTION):
    fields = [
        FieldSchema(name="pk", dtype=DataType.VARCHAR, is_primary=True, auto_id=True, max_length=100),
        FieldSchema(name="original_query", dtype=DataType.VARCHAR, max_length=1000),
        FieldSchema(name="timestamp", dtype=DataType.INT64),
        FieldSchema(name="user_id", dtype=DataType.VARCHAR, max_length=256),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=embedding_dim)
    ]
    schema = CollectionSchema(fields, "User Search Queries")
    collection_queries = Collection(QUERIES_COLLECTION, schema)
    collection_queries.create_index(field_name="embedding", index_params={"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}})
else:
    collection_queries = Collection(QUERIES_COLLECTION)

print("Initialization complete. Ready for search requests.")

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    query = data.get('query', '')
    lang = data.get('lang', 'ar').lower()
    user_id = data.get('user_id', 'anonymous')

    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    # 1. Create embedding ONCE
    query_embedding = model.encode([query])

    # 2. Upsert query embedding into "search_queries"
    query_entity = {
        "original_query": query,
        "timestamp": int(time.time()),
        "user_id": user_id,
        "embedding": query_embedding[0]
    }
    upsert_result = collection_queries.insert([query_entity])
    query_embedding_id = upsert_result.primary_keys[0]

    # 3. Use the same embedding to search documents
    collection_to_search = collection_ar if lang == 'ar' else collection_en
    embedding_field = "embedding_ar" if lang == 'ar' else "embedding_en"
    output_fields = ["title_ar", "question_ar"] if lang == 'ar' else ["title_en", "question_en"]

    # Ensure collection is loaded
    if utility.load_state(collection_to_search.name) != "Loaded":
        collection_to_search.load()
        utility.wait_for_loading_complete(collection_to_search.name)

    search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
    results = collection_to_search.search(
        data=query_embedding,
        anns_field=embedding_field,
        param=search_params,
        limit=TOP_K,
        output_fields=output_fields
    )
    
    # 5. Format the output
    response_data = {
        "query_embedding_id": query_embedding_id,
        "results": []
    }
    
    if results:
        for hit in results[0]:
            snippet_text = hit.entity.get('question_ar') or hit.entity.get('question_en')
            response_data["results"].append({
                "document_id": str(hit.id),
                "score": hit.distance,
                "snippet": snippet_text[:250] + "..." if snippet_text else ""
            })

    return jsonify(response_data)

if __name__ == '__main__':
    app.run(port=5001, debug=False) 