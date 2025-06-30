import json
import re
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
)
from sentence_transformers import SentenceTransformer
from transformers import pipeline, AutoTokenizer
from tqdm import tqdm

# --- Configuration ---
MILVUS_HOST = "127.0.0.1"
MILVUS_PORT = "19530"
AR_COLLECTION_NAME = "fatwas_ar"
EN_COLLECTION_NAME = "fatwas_en"
JSON_FILE_PATH = "fatwas.json"
EMBEDDING_MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'
TRANSLATION_MODEL_NAME = 'Helsinki-NLP/opus-mt-ar-en'
BATCH_SIZE = 16

# --- New Quran Detector Class ---
class QuranDetector:
    def __init__(self, surah_file_path):
        with open(surah_file_path, 'r', encoding='utf-8') as f:
            self.surahs_data = json.load(f)
        
        # Create a regex pattern to find mentions of surahs
        # This looks for "سورة" followed by any of the surah names
        surah_names = [re.escape(s['titleAr']) for s in self.surahs_data]
        self.surah_pattern = re.compile(r'سورة\s*(' + '|'.join(surah_names) + r')')
        # Precise pattern for (Surah:Verse) or [Surah:Verse]
        self.verse_pattern = re.compile(r'[\(\[]\s*([^\s:\)\]]+)\s*:\s*(\d+)\s*[\)\]]')

    def extract_citations(self, text):
        citations = []
        
        # Find explicit "Surah X" mentions
        found_surahs = self.surah_pattern.findall(text)
        for surah_name in found_surahs:
            citations.append(f"سورة {surah_name.strip()}")

        # Find "Surah:Verse" patterns
        found_verses = self.verse_pattern.findall(text)
        for surah_name, verse_num in found_verses:
            # Normalize and clean the captured group
            cleaned_surah_name = surah_name.strip()
            citations.append(f"{cleaned_surah_name}:{verse_num.strip()}")
        
        # Return unique, cleaned citations
        return list(set(c for c in citations if "Title" not in c and "Answer" not in c and "Question" not in c))

# --- New Schema for separate AR and EN collections ---
def create_or_get_collection(collection_name, dim, lang='ar'):
    if utility.has_collection(collection_name):
        print(f"Collection '{collection_name}' already exists. Reusing it.")
        return Collection(collection_name)

    # Common fields
    pk_field = FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True)
    fatwa_id_field = FieldSchema(name="fatwa_id", dtype=DataType.INT64)
    
    if lang == 'ar':
        fields = [
            pk_field,
            fatwa_id_field,
            FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="question", dtype=DataType.VARCHAR, max_length=10000),
            FieldSchema(name="fatwa_answer", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="category_title", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="is_quranic_related", dtype=DataType.BOOL),
            FieldSchema(name="quranic_verses", dtype=DataType.ARRAY, element_type=DataType.VARCHAR, max_capacity=100, max_length=100),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim)
        ]
        description = "Arabic Fatwas Collection"
    else: # lang == 'en'
        fields = [
            pk_field,
            fatwa_id_field,
            FieldSchema(name="title_en", dtype=DataType.VARCHAR, max_length=1500),
            FieldSchema(name="question_en", dtype=DataType.VARCHAR, max_length=30000),
            FieldSchema(name="fatwa_answer_en", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=dim)
        ]
        description = "English Fatwas Collection"

    schema = CollectionSchema(fields, description, primary_field="pk")
    collection = Collection(collection_name, schema, consistency_level="Strong")
    
    index_params = {"metric_type": "L2", "index_type": "IVF_FLAT", "params": {"nlist": 1024}}
    collection.create_index(field_name="embedding", index_params=index_params)
    print(f"Collection '{collection_name}' created with an index on 'embedding'.")
    return collection

# --- Main Execution Logic ---
def main():
    # --- Initialization ---
    print("Connecting to Milvus...")
    connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    print("Initializing models...")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    translator = pipeline("translation", model=TRANSLATION_MODEL_NAME)
    # Manually load the tokenizer for the translation model
    translation_tokenizer = AutoTokenizer.from_pretrained(TRANSLATION_MODEL_NAME)
    detector = QuranDetector('quran_surahs.json')
    embedding_dim = embedding_model.get_sentence_embedding_dimension()

    # --- Drop old collections if they exist ---
    if utility.has_collection(AR_COLLECTION_NAME):
        utility.drop_collection(AR_COLLECTION_NAME)
    if utility.has_collection(EN_COLLECTION_NAME):
        utility.drop_collection(EN_COLLECTION_NAME)

    # --- Schema and Collection Setup ---
    ar_collection = create_or_get_collection(AR_COLLECTION_NAME, embedding_dim, lang='ar')
    en_collection = create_or_get_collection(EN_COLLECTION_NAME, embedding_dim, lang='en')
    
    # --- Data Loading ---
    print("Loading data from JSON file...")
    with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    all_fatwas = [fatwa for category in data for fatwa in category['Fatwas']]
    
    print(f"Processing {len(all_fatwas)} fatwas in batches of {BATCH_SIZE}...")
    for i in tqdm(range(0, len(all_fatwas), BATCH_SIZE), desc="Translating and Ingesting"):
        batch_fatwas = all_fatwas[i:i + BATCH_SIZE]
        
        # Unique primary keys for this batch
        pks = [i + j for j, _ in enumerate(batch_fatwas)]

        # --- Arabic Processing ---
        ar_texts_for_embedding = []
        quranic_info = []
        for fatwa in batch_fatwas:
            full_text = f"Title: {fatwa['Title']} Question: {fatwa['Question']} Answer: {fatwa['FatwaAnswer']}"
            citations = detector.extract_citations(full_text)
            text_for_embedding = detector.surah_pattern.sub('', detector.verse_pattern.sub('', full_text)).strip()
            ar_texts_for_embedding.append(text_for_embedding)
            quranic_info.append({'citations': citations, 'is_quranic': len(citations) > 0})
        ar_embeddings = embedding_model.encode(ar_texts_for_embedding, show_progress_bar=False)
        
        ar_entities = [
            pks,
            [f['FatwaId'] for f in batch_fatwas],
            [f['Title'] for f in batch_fatwas],
            [f['Question'] for f in batch_fatwas],
            [f['FatwaAnswer'] for f in batch_fatwas],
            [f['CategoryTitle'] for f in batch_fatwas],
            [info['is_quranic'] for info in quranic_info],
            [info['citations'] for info in quranic_info],
            ar_embeddings
        ]
        ar_collection.insert(ar_entities)

        # --- English Processing ---
        def truncate_for_translation(text, tokenizer, max_length=512):
            """Tokenize, truncate, and decode back to string."""
            token_ids = tokenizer.encode(text, add_special_tokens=True, truncation=False)
            truncated_ids = token_ids[:max_length]
            return tokenizer.decode(truncated_ids, skip_special_tokens=True)

        titles_to_translate = [truncate_for_translation(f['Title'], translation_tokenizer) for f in batch_fatwas]
        questions_to_translate = [truncate_for_translation(f['Question'], translation_tokenizer) for f in batch_fatwas]
        answers_to_translate = [truncate_for_translation(f['FatwaAnswer'], translation_tokenizer) for f in batch_fatwas]

        translated_titles = [res['translation_text'] for res in translator(titles_to_translate)]
        translated_questions = [res['translation_text'] for res in translator(questions_to_translate)]
        translated_answers = [res['translation_text'] for res in translator(answers_to_translate)]

        en_texts_for_embedding = [f"Title: {t} Question: {q} Answer: {a}" for t, q, a in zip(translated_titles, translated_questions, translated_answers)]
        en_embeddings = embedding_model.encode(en_texts_for_embedding, show_progress_bar=False)

        en_entities = [
            pks,
            [f['FatwaId'] for f in batch_fatwas],
            translated_titles,
            translated_questions,
            translated_answers,
            en_embeddings
        ]
        en_collection.insert(en_entities)

    ar_collection.flush()
    en_collection.flush()
    print(f"\nData insertion complete. Total fatwas inserted: AR={ar_collection.num_entities}, EN={en_collection.num_entities}")
    connections.disconnect("default")

if __name__ == "__main__":
    main() 