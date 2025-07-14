import json
import os
import logging
from typing import List, Dict, Any
from tqdm import tqdm
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
)
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('seed_quran.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QuranSeeder:
    def __init__(self):
        self.milvus_host = os.getenv("MILVUS_HOST", "127.0.0.1")
        self.milvus_port = os.getenv("MILVUS_PORT", "19530")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
        self.quran_data_path = os.getenv("QURAN_DATA_PATH", "quran_surahs.json")
        self.batch_size = int(os.getenv("BATCH_SIZE", "16"))
        
        # Collection names
        self.collection_ar_name = os.getenv("QURAN_COLLECTION_AR", "quran_ar")
        self.collection_en_name = os.getenv("QURAN_COLLECTION_EN", "quran_en")
        
        # Initialize models
        self.embedder = None
        
    def initialize(self):
        """Initialize connections and models"""
        try:
            # Connect to Milvus
            connections.connect("default", host=self.milvus_host, port=self.milvus_port)
            logger.info(f"Connected to Milvus at {self.milvus_host}:{self.milvus_port}")
            
            # Load embedding model
            self.embedder = SentenceTransformer(self.embedding_model)
            logger.info(f"Loaded embedding model: {self.embedding_model}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to initialize: {str(e)}")
            return False
    
    def load_quran_data(self) -> List[Dict[str, Any]]:
        """Load and parse Quran data from JSON file"""
        try:
            if not os.path.exists(self.quran_data_path):
                logger.error(f"Quran data file not found: {self.quran_data_path}")
                return []
            
            with open(self.quran_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            verses = []
            for surah in data:
                surah_number = surah['id']
                surah_name_ar = surah['name']
                surah_name_en = surah.get('transliteration', f"Surah {surah_number}")
                
                # Process verses if they exist
                if 'verses' in surah:
                    for verse in surah['verses']:
                        verse_data = {
                            'verse_id': f"{surah_number}:{verse['id']}",
                            'surah_number': surah_number,
                            'surah_name_ar': surah_name_ar,
                            'surah_name_en': surah_name_en,
                            'ayah_number': verse['id'],
                            'text_ar': verse['text'],
                            'text_en': verse.get('translation', ''),
                            'keywords_ar': self._extract_keywords(verse['text']),
                            'keywords_en': self._extract_keywords(verse.get('translation', ''))
                        }
                        verses.append(verse_data)
            
            logger.info(f"Loaded {len(verses)} verses from {len(data)} surahs")
            return verses
            
        except Exception as e:
            logger.error(f"Failed to load Quran data: {str(e)}")
            return []
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract important keywords from verse text"""
        if not text:
            return []
        
        # Simple keyword extraction - can be enhanced with NLP
        # Remove common stop words and extract meaningful terms
        stop_words_ar = {'في', 'من', 'إلى', 'على', 'أن', 'هو', 'هي', 'ذلك', 'التي', 'الذي'}
        stop_words_en = {'the', 'and', 'of', 'to', 'in', 'for', 'with', 'that', 'this', 'is', 'are'}
        
        words = text.split()
        keywords = []
        
        for word in words:
            # Clean word
            clean_word = word.strip('.,;:!?"()[]{}')
            
            # Filter out stop words and short words
            if len(clean_word) > 2 and clean_word.lower() not in stop_words_ar and clean_word.lower() not in stop_words_en:
                keywords.append(clean_word)
        
        return keywords[:10]  # Limit to top 10 keywords
    
    def generate_embeddings(self, verses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate embeddings for all verses"""
        logger.info("Generating embeddings for verses...")
        
        for i in tqdm(range(0, len(verses), self.batch_size), desc="Processing batches"):
            batch = verses[i:i + self.batch_size]
            
            try:
                # Prepare texts for embedding
                texts_ar = [verse['text_ar'] for verse in batch]
                texts_en = [verse['text_en'] for verse in batch if verse['text_en']]
                
                # Generate embeddings
                embeddings_ar = self.embedder.encode(texts_ar)
                embeddings_en = self.embedder.encode(texts_en) if texts_en else []
                
                # Add embeddings to verses
                for idx, verse in enumerate(batch):
                    verse['embedding_ar'] = embeddings_ar[idx].tolist()
                    if idx < len(embeddings_en):
                        verse['embedding_en'] = embeddings_en[idx].tolist()
                    else:
                        verse['embedding_en'] = [0.0] * 768  # Default empty embedding
                        
            except Exception as e:
                logger.error(f"Error processing batch {i}: {str(e)}")
                continue
        
        logger.info("Embedding generation complete")
        return verses
    
    def create_collections(self, embedding_dim: int = 768):
        """Create Milvus collections for Quran verses"""
        # Create Arabic collection
        self._create_collection(self.collection_ar_name, embedding_dim, "Arabic Quran verses")
        
        # Create English collection  
        self._create_collection(self.collection_en_name, embedding_dim, "English Quran verses")
    
    def _create_collection(self, collection_name: str, embedding_dim: int, description: str):
        """Create a single Milvus collection"""
        try:
            # Drop existing collection if it exists
            if utility.has_collection(collection_name):
                logger.info(f"Dropping existing collection: {collection_name}")
                utility.drop_collection(collection_name)
            
            # Define schema
            fields = [
                FieldSchema(name="pk", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="verse_id", dtype=DataType.VARCHAR, max_length=20),
                FieldSchema(name="surah_number", dtype=DataType.INT32),
                FieldSchema(name="surah_name_ar", dtype=DataType.VARCHAR, max_length=100),
                FieldSchema(name="surah_name_en", dtype=DataType.VARCHAR, max_length=100),
                FieldSchema(name="ayah_number", dtype=DataType.INT32),
                FieldSchema(name="text_ar", dtype=DataType.VARCHAR, max_length=2000),
                FieldSchema(name="text_en", dtype=DataType.VARCHAR, max_length=2000),
                FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=embedding_dim),
            ]
            
            schema = CollectionSchema(fields, description)
            collection = Collection(collection_name, schema)
            
            # Create index
            index_params = {
                "metric_type": "L2",
                "index_type": "IVF_FLAT",
                "params": {"nlist": 1024}
            }
            collection.create_index(field_name="embedding", index_params=index_params)
            
            logger.info(f"Created collection: {collection_name}")
            
        except Exception as e:
            logger.error(f"Failed to create collection {collection_name}: {str(e)}")
            raise
    
    def insert_verses(self, verses: List[Dict[str, Any]]):
        """Insert verses into Milvus collections"""
        logger.info(f"Inserting {len(verses)} verses into collections...")
        
        # Insert into Arabic collection
        self._insert_to_collection(verses, self.collection_ar_name, use_arabic=True)
        
        # Insert into English collection
        self._insert_to_collection(verses, self.collection_en_name, use_arabic=False)
    
    def _insert_to_collection(self, verses: List[Dict[str, Any]], collection_name: str, use_arabic: bool):
        """Insert verses into a specific collection"""
        try:
            collection = Collection(collection_name)
            
            total_inserted = 0
            
            for i in tqdm(range(0, len(verses), self.batch_size), 
                         desc=f"Inserting into {collection_name}"):
                batch = verses[i:i + self.batch_size]
                
                try:
                    # Prepare data for insertion
                    entities = [
                        [verse['verse_id'] for verse in batch],
                        [verse['surah_number'] for verse in batch],
                        [verse['surah_name_ar'] for verse in batch],
                        [verse['surah_name_en'] for verse in batch],
                        [verse['ayah_number'] for verse in batch],
                        [verse['text_ar'] for verse in batch],
                        [verse['text_en'] for verse in batch],
                        [verse['embedding_ar'] if use_arabic else verse['embedding_en'] for verse in batch]
                    ]
                    
                    collection.insert(entities)
                    total_inserted += len(batch)
                    
                except Exception as e:
                    logger.error(f"Error inserting batch {i} into {collection_name}: {str(e)}")
                    continue
            
            # Flush the collection
            collection.flush()
            
            logger.info(f"Inserted {total_inserted} verses into {collection_name}")
            logger.info(f"Total entities in {collection_name}: {collection.num_entities}")
            
        except Exception as e:
            logger.error(f"Failed to insert into collection {collection_name}: {str(e)}")
            raise
    
    def run(self):
        """Main execution method"""
        try:
            logger.info("Starting Quran seeding process...")
            
            # Initialize
            if not self.initialize():
                raise Exception("Failed to initialize seeder")
            
            # Load data
            verses = self.load_quran_data()
            if not verses:
                raise Exception("No verses loaded")
            
            # Generate embeddings
            verses = self.generate_embeddings(verses)
            
            # Create collections
            self.create_collections()
            
            # Insert data
            self.insert_verses(verses)
            
            logger.info("Quran seeding completed successfully!")
            
        except Exception as e:
            logger.error(f"Quran seeding failed: {str(e)}")
            raise
        finally:
            connections.disconnect("default")

if __name__ == "__main__":
    seeder = QuranSeeder()
    seeder.run() 