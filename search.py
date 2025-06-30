import argparse
from pymilvus import connections, Collection, utility
from sentence_transformers import SentenceTransformer
import re
import json

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
COLLECTION_NAME = "fatwas"
MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TOP_K = 3

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

def main(query):
    print("Connecting to Milvus...")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    model = SentenceTransformer(MODEL_NAME)
    detector = QuranDetector('quran_surahs.json')
    collection = Collection(COLLECTION_NAME)
    collection.load()

    quranic_citations = detector.extract_citations(query)
    search_results = []
    search_type = "semantic"
    final_hits = []

    if quranic_citations:
        search_type = "exact_quranic_in_python"
        all_quranic_fatwas = collection.query(
            expr="is_quranic_related == true",
            output_fields=["title", "quranic_verses", "question"]
        )

        for fatwa in all_quranic_fatwas:
            if any(citation in fatwa['quranic_verses'] for citation in quranic_citations):
                final_hits.append({'distance': 0.0, 'entity': fatwa})
        
        # Limit results to TOP_K
        final_hits = final_hits[:TOP_K]

    if not final_hits:
        search_type = "semantic_fallback" if quranic_citations else "semantic"
        query_embedding = model.encode([query])[0]
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param={"metric_type": "L2", "params": {"nprobe": 10}},
            limit=TOP_K,
            output_fields=["title", "quranic_verses", "question"]
        )
        if results:
            final_hits = results[0]

    print(f"\n--- Search Results (Type: {search_type}) ---")
    if not final_hits:
        print("No results found.")
    else:
        for hit in final_hits:
            if isinstance(hit, dict):
                entity = hit['entity']
                distance = hit['distance']
            else: # It's a Hit object from Milvus
                entity = hit.entity
                distance = hit.distance
            
            print(f"Score (Distance): {distance:.4f}")
            print(f"Title: {entity.get('title')}")
            print(f"Question: {entity.get('question')}")
            print(f"Quranic Verses Detected in Fatwa: {entity.get('quranic_verses')}")
            print("-" * 30)
    
    connections.disconnect("default")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Search for fatwas in Milvus.")
    parser.add_argument("query", type=str, help="The search query in Arabic.")
    args = parser.parse_args()
    main(args.query) 