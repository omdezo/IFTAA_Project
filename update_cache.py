import json
import re
from tqdm import tqdm

ENRICHED_JSON_PATH = "fatwas_multilingual.json"

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

def update_cache():
    print(f"Loading existing cache file: {ENRICHED_JSON_PATH}")
    with open(ENRICHED_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    detector = QuranDetector("quran_surahs.json")
    
    print("Updating records with Quranic metadata...")
    for item in tqdm(data, desc="Processing records"):
        if 'is_quranic_related' not in item:
            full_text = f"{item['title_ar']} {item['question_ar']} {item['answer_ar']}"
            citations = detector.extract_citations(full_text)
            item['is_quranic_related'] = str(len(citations) > 0) # Store as string "True" or "False"
            item['quranic_verses'] = citations

    print("Saving updated cache file...")
    with open(ENRICHED_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    print("Cache update complete!")

if __name__ == "__main__":
    update_cache() 