"""
FatwaQueryMaster: AI-Driven Query Optimizer for Fatwa Search API

This module provides intelligent query optimization for the IFTAA Fatwa Search system,
handling Arabic and English queries with advanced language processing capabilities.

Author: Claude (FatwaQueryMaster)
Version: 1.0.0
"""

import re
import string
import unicodedata
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Language(Enum):
    ARABIC = "ar"
    ENGLISH = "en"
    UNKNOWN = "unknown"

@dataclass
class QueryOptimizationResult:
    """Result of query optimization"""
    original_query: str
    optimized_query: str
    detected_language: Language
    confidence: float
    suggested_alternates: List[str]
    spelling_corrections: List[str]
    expanded_terms: List[str]
    search_strategy: str

class FatwaQueryMaster:
    """
    AI-driven query optimizer for Fatwa Search API
    
    Features:
    - Language detection (Arabic/English)
    - Spelling correction and normalization
    - Morphological normalization for Arabic
    - Synonym expansion and term enrichment
    - Query strategy optimization
    """
    
    def __init__(self):
        self.arabic_synonyms = self._load_arabic_synonyms()
        self.english_synonyms = self._load_english_synonyms()
        self.islamic_terms = self._load_islamic_terms()
        self.common_misspellings = self._load_common_misspellings()
        self.arabic_morphology = self._load_arabic_morphology()
        
    def _load_arabic_synonyms(self) -> Dict[str, List[str]]:
        """Load Arabic synonyms for Islamic terms"""
        return {
            # Prayer related
            "صلاة": ["صلوة", "فريضة", "عبادة", "ركعة", "سجود", "قيام"],
            "الصلاة": ["الصلوة", "الفريضة", "العبادة", "الركعة", "السجود", "القيام"],
            "صلى": ["صلّى", "أدى", "قام", "ركع", "سجد"],
            "مصلى": ["مسجد", "جامع", "معبد", "محراب"],
            
            # Fasting related
            "صوم": ["صيام", "إمساك", "إفطار", "سحور"],
            "الصوم": ["الصيام", "الإمساك", "الإفطار", "السحور"],
            "صائم": ["صايم", "ممسك", "متعبد"],
            "رمضان": ["شهر رمضان", "الشهر الكريم", "شهر الصيام"],
            
            # Zakat related
            "زكاة": ["زكوة", "صدقة", "إحسان", "بر", "خير"],
            "الزكاة": ["الزكوة", "الصدقة", "الإحسان", "البر", "الخير"],
            "نصاب": ["حد", "مقدار", "كمية"],
            "فقير": ["مسكين", "محتاج", "معوز", "مستحق"],
            
            # Hajj related
            "حج": ["حجة", "مناسك", "عمرة"],
            "الحج": ["الحجة", "المناسك", "العمرة"],
            "طواف": ["دوران", "لف", "طوفان"],
            "سعي": ["هرولة", "جري", "ركض"],
            "عرفة": ["عرفات", "الموقف", "المشعر"],
            
            # Purity related
            "طهارة": ["نظافة", "وضوء", "غسل", "تطهر"],
            "الطهارة": ["النظافة", "الوضوء", "الغسل", "التطهر"],
            "وضوء": ["وضو", "تطهر", "غسل", "استعداد"],
            "نجاسة": ["قذارة", "دنس", "تلوث", "شائبة"],
            
            # Marriage related
            "نكاح": ["زواج", "تزوج", "عقد", "قران"],
            "الزواج": ["النكاح", "التزوج", "العقد", "القران"],
            "مهر": ["صداق", "عطية", "هدية", "مال"],
            "طلاق": ["فسخ", "انفصال", "تفريق", "خلع"],
            
            # General Islamic terms
            "حلال": ["مباح", "جائز", "مسموح", "مشروع"],
            "حرام": ["ممنوع", "محظور", "غير جائز", "مكروه"],
            "مسجد": ["جامع", "مصلى", "بيت الله", "دار العبادة"],
            "قرآن": ["القرآن الكريم", "الكتاب", "المصحف", "التنزيل"],
            "سنة": ["حديث", "أثر", "رواية", "نقل"],
            "فقه": ["علم", "معرفة", "أحكام", "مذهب"],
            "عالم": ["فقيه", "مفتي", "شيخ", "إمام"],
            "فتوى": ["رأي", "حكم", "قول", "إجابة"],
            
            # Common words
            "سؤال": ["استفسار", "مسألة", "موضوع", "قضية"],
            "جواب": ["إجابة", "رد", "حل", "توضيح"],
            "شرح": ["تفسير", "بيان", "توضيح", "تعليل"],
            "حكم": ["قرار", "فتوى", "قول", "رأي"],
        }
    
    def _load_english_synonyms(self) -> Dict[str, List[str]]:
        """Load English synonyms for Islamic terms"""
        return {
            # Prayer related
            "prayer": ["salah", "salat", "worship", "prostration", "bow", "prayers"],
            "pray": ["worship", "prostrate", "bow", "kneel", "supplicate"],
            "mosque": ["masjid", "church", "temple", "place of worship"],
            "imam": ["leader", "guide", "cleric", "preacher"],
            
            # Fasting related
            "fasting": ["fast", "sawm", "abstinence", "ramadan"],
            "fast": ["fasting", "sawm", "abstain", "refrain"],
            "ramadan": ["ramzan", "holy month", "fasting month"],
            "iftar": ["breaking fast", "sunset meal", "evening meal"],
            "suhoor": ["pre-dawn meal", "early morning meal", "dawn meal"],
            
            # Zakat related
            "zakat": ["charity", "alms", "donation", "giving"],
            "charity": ["zakat", "alms", "donation", "sadaqah"],
            "poor": ["needy", "destitute", "indigent", "underprivileged"],
            "wealth": ["money", "riches", "property", "assets"],
            
            # Hajj related
            "hajj": ["pilgrimage", "holy journey", "mecca visit"],
            "pilgrimage": ["hajj", "holy journey", "sacred travel"],
            "mecca": ["makkah", "holy city", "kaaba"],
            "kaaba": ["kabah", "holy house", "sacred cube"],
            
            # Purity related
            "purity": ["cleanliness", "purification", "wudu", "ablution"],
            "ablution": ["wudu", "washing", "purification", "cleansing"],
            "impurity": ["najasah", "uncleanness", "pollution", "contamination"],
            
            # Marriage related
            "marriage": ["nikah", "wedding", "matrimony", "union"],
            "divorce": ["talaq", "separation", "dissolution", "split"],
            "husband": ["spouse", "partner", "mate", "consort"],
            "wife": ["spouse", "partner", "mate", "consort"],
            
            # General Islamic terms
            "halal": ["permissible", "lawful", "allowed", "legitimate"],
            "haram": ["forbidden", "prohibited", "unlawful", "impermissible"],
            "quran": ["koran", "holy book", "scripture", "revelation"],
            "sunnah": ["hadith", "tradition", "practice", "way"],
            "scholar": ["alim", "mufti", "sheikh", "learned person"],
            "fatwa": ["ruling", "opinion", "judgment", "decree"],
            
            # Common words
            "question": ["query", "inquiry", "ask", "problem"],
            "answer": ["response", "reply", "solution", "explanation"],
            "ruling": ["judgment", "decision", "verdict", "decree"],
            "explanation": ["clarification", "interpretation", "description", "elucidation"],
        }
    
    def _load_islamic_terms(self) -> Dict[str, Dict[str, List[str]]]:
        """Load comprehensive Islamic terms with context"""
        return {
            "worship": {
                "arabic": ["عبادة", "صلاة", "صوم", "حج", "زكاة", "ذكر", "دعاء", "تسبيح"],
                "english": ["worship", "prayer", "fasting", "hajj", "zakat", "remembrance", "supplication"]
            },
            "jurisprudence": {
                "arabic": ["فقه", "أحكام", "حلال", "حرام", "مكروه", "مستحب", "واجب"],
                "english": ["jurisprudence", "rulings", "halal", "haram", "disliked", "recommended", "obligatory"]
            },
            "family": {
                "arabic": ["نكاح", "زواج", "طلاق", "عدة", "نفقة", "حضانة", "مهر"],
                "english": ["marriage", "divorce", "waiting period", "maintenance", "custody", "dowry"]
            },
            "finance": {
                "arabic": ["ربا", "بيع", "شراء", "دين", "قرض", "تجارة", "معاملة"],
                "english": ["interest", "sale", "purchase", "debt", "loan", "trade", "transaction"]
            }
        }
    
    def _load_common_misspellings(self) -> Dict[str, str]:
        """Load common misspellings and their corrections"""
        return {
            # Arabic common misspellings
            "صلوة": "صلاة",
            "زكوة": "زكاة",
            "صيام": "صوم",
            "الصيام": "الصوم",
            "صوره": "صورة",
            "مسئله": "مسألة",
            "مسئلة": "مسألة",
            "اسئله": "أسئلة",
            "اسئلة": "أسئلة",
            
            # English common misspellings
            "quran": "quran",
            "koran": "quran",
            "moslem": "muslim",
            "mohammedan": "muslim",
            "namaz": "prayer",
            "salaat": "salah",
            "zakat": "zakat",
            "zakaat": "zakat",
        }
    
    def _load_arabic_morphology(self) -> Dict[str, List[str]]:
        """Load Arabic morphological patterns"""
        return {
            # Remove common prefixes and suffixes
            "prefixes": ["ال", "و", "ف", "ب", "ك", "ل", "من", "إلى", "على", "في", "عن"],
            "suffixes": ["ة", "ه", "ها", "هم", "هن", "نا", "كم", "كن", "ين", "ون", "ان"],
            
            # Common patterns
            "patterns": {
                "فعل": ["يفعل", "فاعل", "مفعول", "فعال", "فعيل"],
                "كتب": ["يكتب", "كاتب", "مكتوب", "كتاب", "كتيب"],
                "علم": ["يعلم", "عالم", "معلوم", "علام", "عليم"],
            }
        }
    
    def detect_language(self, query: str) -> Tuple[Language, float]:
        """
        Detect the language of the query
        
        Args:
            query: Input query string
            
        Returns:
            Tuple of (detected_language, confidence_score)
        """
        if not query or not query.strip():
            return Language.UNKNOWN, 0.0
        
        # Remove punctuation and whitespace
        clean_query = re.sub(r'[^\w\s]', '', query.strip())
        
        # Count Arabic characters
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', clean_query))
        
        # Count English characters
        english_chars = len(re.findall(r'[a-zA-Z]', clean_query))
        
        # Count total characters
        total_chars = len(re.sub(r'\s', '', clean_query))
        
        if total_chars == 0:
            return Language.UNKNOWN, 0.0
        
        # Calculate percentages
        arabic_percentage = arabic_chars / total_chars
        english_percentage = english_chars / total_chars
        
        # Determine language based on character distribution
        if arabic_percentage > 0.3:
            confidence = min(arabic_percentage * 1.2, 1.0)
            return Language.ARABIC, confidence
        elif english_percentage > 0.5:
            confidence = min(english_percentage * 1.1, 1.0)
            return Language.ENGLISH, confidence
        else:
            return Language.UNKNOWN, 0.3
    
    def normalize_arabic_text(self, text: str) -> str:
        """
        Normalize Arabic text by removing diacritics and standardizing characters
        
        Args:
            text: Arabic text to normalize
            
        Returns:
            Normalized Arabic text
        """
        if not text:
            return ""
        
        # Remove diacritics (tashkeel)
        normalized = re.sub(r'[\u064B-\u065F\u0670\u06D6-\u06ED]', '', text)
        
        # Standardize characters
        replacements = {
            'أ': 'ا', 'إ': 'ا', 'آ': 'ا',  # Standardize alif
            'ة': 'ه',  # Standardize taa marbuta
            'ى': 'ي',  # Standardize alif maqsura
            'ؤ': 'و',  # Standardize waw with hamza
            'ئ': 'ي',  # Standardize yaa with hamza
        }
        
        for old, new in replacements.items():
            normalized = normalized.replace(old, new)
        
        # Remove extra spaces
        normalized = re.sub(r'\s+', ' ', normalized.strip())
        
        return normalized
    
    def correct_spelling(self, query: str, language: Language) -> List[str]:
        """
        Correct common spelling mistakes
        
        Args:
            query: Input query
            language: Detected language
            
        Returns:
            List of corrected spellings
        """
        corrections = []
        
        if language == Language.ARABIC:
            # Normalize Arabic text
            normalized = self.normalize_arabic_text(query)
            if normalized != query:
                corrections.append(normalized)
        
        # Apply common misspelling corrections
        words = query.split()
        corrected_words = []
        has_corrections = False
        
        for word in words:
            if word in self.common_misspellings:
                corrected_words.append(self.common_misspellings[word])
                has_corrections = True
            else:
                corrected_words.append(word)
        
        if has_corrections:
            corrections.append(' '.join(corrected_words))
        
        return corrections
    
    def expand_synonyms(self, query: str, language: Language) -> List[str]:
        """
        Expand query with synonyms and related terms
        
        Args:
            query: Input query
            language: Detected language
            
        Returns:
            List of expanded queries
        """
        expanded_queries = []
        
        # Choose appropriate synonym dictionary
        synonyms = self.arabic_synonyms if language == Language.ARABIC else self.english_synonyms
        
        # Find synonyms for individual words
        words = query.split()
        expanded_terms = []
        
        for word in words:
            word_lower = word.lower()
            if word_lower in synonyms:
                # Add original word plus synonyms
                expanded_terms.extend([word] + synonyms[word_lower][:3])  # Limit to 3 synonyms
            else:
                expanded_terms.append(word)
        
        # Create expanded query
        if len(expanded_terms) > len(words):
            expanded_queries.append(' '.join(expanded_terms))
        
        # Add contextual expansions based on Islamic terms
        for category, terms in self.islamic_terms.items():
            lang_key = "arabic" if language == Language.ARABIC else "english"
            if any(term in query.lower() for term in terms[lang_key]):
                # Add related terms from the same category
                related_terms = terms[lang_key][:3]  # Limit to 3 related terms
                expanded_queries.append(f"{query} {' '.join(related_terms)}")
        
        return expanded_queries
    
    def determine_search_strategy(self, query: str, language: Language) -> str:
        """
        Determine the best search strategy based on query characteristics
        
        Args:
            query: Input query
            language: Detected language
            
        Returns:
            Recommended search strategy
        """
        query_lower = query.lower()
        
        # Check for specific patterns
        if len(query.split()) == 1:
            return "single_term_semantic"
        elif any(term in query_lower for term in ["كيف", "ماذا", "متى", "أين", "why", "how", "what", "when", "where"]):
            return "question_focused"
        elif any(term in query_lower for term in ["حكم", "فتوى", "جائز", "حلال", "حرام", "ruling", "fatwa", "permissible", "allowed", "forbidden"]):
            return "jurisprudence_focused"
        elif len(query.split()) > 5:
            return "long_query_semantic"
        else:
            return "hybrid_search"
    
    def optimize_query(self, query: str) -> QueryOptimizationResult:
        """
        Main optimization function that processes the query
        
        Args:
            query: Input query string
            
        Returns:
            QueryOptimizationResult with optimized query and metadata
        """
        if not query or not query.strip():
            return QueryOptimizationResult(
                original_query=query,
                optimized_query=query,
                detected_language=Language.UNKNOWN,
                confidence=0.0,
                suggested_alternates=[],
                spelling_corrections=[],
                expanded_terms=[],
                search_strategy="default"
            )
        
        # 1. Detect language
        detected_language, confidence = self.detect_language(query)
        
        # 2. Normalize and correct spelling
        spelling_corrections = self.correct_spelling(query, detected_language)
        
        # 3. Use the best corrected version as base
        base_query = spelling_corrections[0] if spelling_corrections else query
        
        # 4. Expand with synonyms
        expanded_queries = self.expand_synonyms(base_query, detected_language)
        
        # 5. Determine search strategy
        search_strategy = self.determine_search_strategy(base_query, detected_language)
        
        # 6. Create optimized query
        if expanded_queries:
            optimized_query = expanded_queries[0]
        else:
            optimized_query = base_query
        
        # 7. Generate alternative suggestions
        suggested_alternates = []
        if spelling_corrections:
            suggested_alternates.extend(spelling_corrections[1:])
        if expanded_queries:
            suggested_alternates.extend(expanded_queries[1:])
        
        # Remove duplicates while preserving order
        unique_alternates = []
        seen = set()
        for alt in suggested_alternates:
            if alt not in seen and alt != optimized_query:
                unique_alternates.append(alt)
                seen.add(alt)
        
        return QueryOptimizationResult(
            original_query=query,
            optimized_query=optimized_query,
            detected_language=detected_language,
            confidence=confidence,
            suggested_alternates=unique_alternates[:5],  # Limit to 5 alternatives
            spelling_corrections=spelling_corrections,
            expanded_terms=expanded_queries,
            search_strategy=search_strategy
        )
    
    def get_search_url(self, base_url: str, optimized_result: QueryOptimizationResult, 
                      page: int = 1, page_size: int = 10, user_id: str = "123") -> str:
        """
        Generate the appropriate search URL based on optimization results
        
        Args:
            base_url: Base URL of the API
            optimized_result: Result from optimize_query
            page: Page number
            page_size: Number of results per page
            user_id: User ID for personalization
            
        Returns:
            Complete search URL
        """
        # Choose language parameter
        lang_param = ""
        if optimized_result.detected_language == Language.ENGLISH:
            lang_param = "&lang=en"
        elif optimized_result.detected_language == Language.ARABIC:
            lang_param = "&lang=ar"
        
        # URL encode the query
        import urllib.parse
        encoded_query = urllib.parse.quote(optimized_result.optimized_query)
        
        # Build the URL
        url = f"{base_url}/api/fatwa/search?query={encoded_query}{lang_param}&page={page}&pageSize={page_size}&userId={user_id}"
        
        return url

# Example usage and testing
def main():
    """Demo function showing FatwaQueryMaster capabilities"""
    
    # Initialize the query master
    query_master = FatwaQueryMaster()
    
    # Test queries
    test_queries = [
        "صلاة",
        "الصلوة في المسجد",
        "prayer in mosque",
        "زكاة المال",
        "fasting in ramadan",
        "هل يجوز",
        "is it permissible",
        "حكم الطلاق",
        "divorce ruling",
        "وضوء قبل الصلاة",
        "ablution before prayer"
    ]
    
    print("🤖 FatwaQueryMaster Demo")
    print("=" * 50)
    
    for query in test_queries:
        print(f"\n📝 Original Query: '{query}'")
        
        # Optimize the query
        result = query_master.optimize_query(query)
        
        print(f"🔍 Optimized Query: '{result.optimized_query}'")
        print(f"🌐 Detected Language: {result.detected_language.value}")
        print(f"📊 Confidence: {result.confidence:.2f}")
        print(f"🎯 Search Strategy: {result.search_strategy}")
        
        if result.spelling_corrections:
            print(f"✏️  Spelling Corrections: {result.spelling_corrections}")
        
        if result.suggested_alternates:
            print(f"🔄 Suggested Alternates: {result.suggested_alternates[:3]}")
        
        # Generate search URL
        base_url = "http://localhost:8080"
        search_url = query_master.get_search_url(base_url, result)
        print(f"🔗 Search URL: {search_url}")
        
        print("-" * 30)

if __name__ == "__main__":
    main()