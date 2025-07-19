"""
FatwaQueryMaster API Service

A FastAPI service that provides query optimization for the IFTAA Fatwa Search API.
This service can be used standalone or integrated with the existing search system.

Author: Claude (FatwaQueryMaster)
Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import httpx
import logging
from datetime import datetime
import json

# Import our query optimizer
from fatwa_query_master import FatwaQueryMaster, QueryOptimizationResult, Language

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FatwaQueryMaster API",
    description="AI-driven query optimization service for Islamic Fatwa search",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API
class QueryRequest(BaseModel):
    query: str = Field(..., description="The search query to optimize")
    user_id: Optional[str] = Field(None, description="User ID for personalization")
    context: Optional[str] = Field(None, description="Additional context for optimization")

class QueryResponse(BaseModel):
    original_query: str
    optimized_query: str
    detected_language: str
    confidence: float
    suggested_alternates: List[str]
    spelling_corrections: List[str]
    expanded_terms: List[str]
    search_strategy: str
    processing_time_ms: float

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(10, ge=1, le=100, description="Results per page")
    user_id: Optional[str] = Field("123", description="User ID")
    base_url: Optional[str] = Field("http://localhost:8080", description="Base URL of the search API")
    use_optimization: bool = Field(True, description="Whether to use query optimization")

class SearchResponse(BaseModel):
    optimization_result: QueryResponse
    search_url: str
    search_results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Global query master instance
query_master = FatwaQueryMaster()

@app.on_event("startup")
async def startup_event():
    """Initialize the service on startup"""
    logger.info("🚀 FatwaQueryMaster API Service starting up...")
    logger.info("✅ Query optimization service ready")

@app.get("/", summary="Service health check")
async def root():
    """Health check endpoint"""
    return {
        "service": "FatwaQueryMaster API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/optimize", response_model=QueryResponse, summary="Optimize a search query")
async def optimize_query(request: QueryRequest):
    """
    Optimize a search query for better search results
    
    This endpoint takes a raw search query and returns an optimized version
    with language detection, spelling correction, and synonym expansion.
    """
    try:
        start_time = datetime.now()
        
        # Optimize the query
        result = query_master.optimize_query(request.query)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Convert to response model
        response = QueryResponse(
            original_query=result.original_query,
            optimized_query=result.optimized_query,
            detected_language=result.detected_language.value,
            confidence=result.confidence,
            suggested_alternates=result.suggested_alternates,
            spelling_corrections=result.spelling_corrections,
            expanded_terms=result.expanded_terms,
            search_strategy=result.search_strategy,
            processing_time_ms=processing_time
        )
        
        logger.info(f"Query optimized: '{request.query}' -> '{result.optimized_query}'")
        return response
        
    except Exception as e:
        logger.error(f"Error optimizing query: {e}")
        raise HTTPException(status_code=500, detail=f"Query optimization failed: {str(e)}")

@app.post("/search", response_model=SearchResponse, summary="Optimized search")
async def optimized_search(request: SearchRequest):
    """
    Perform an optimized search using the Fatwa Search API
    
    This endpoint optimizes the query and then calls the actual search API
    to return both the optimization details and search results.
    """
    try:
        start_time = datetime.now()
        
        # Step 1: Optimize the query (if requested)
        if request.use_optimization:
            optimization_result = query_master.optimize_query(request.query)
            search_query = optimization_result.optimized_query
        else:
            # Create a basic optimization result
            optimization_result = QueryOptimizationResult(
                original_query=request.query,
                optimized_query=request.query,
                detected_language=Language.UNKNOWN,
                confidence=1.0,
                suggested_alternates=[],
                spelling_corrections=[],
                expanded_terms=[],
                search_strategy="no_optimization"
            )
            search_query = request.query
        
        # Step 2: Generate search URL
        search_url = query_master.get_search_url(
            request.base_url, 
            optimization_result, 
            request.page, 
            request.page_size, 
            request.user_id or "123"
        )
        
        # Step 3: Call the actual search API
        search_results = None
        error = None
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Add basic auth header for the API
                auth_header = {
                    "Authorization": "Basic YWRtaW46SWZ0YUFBZG1pbjIwMjQh"  # admin:IftaaAdmin2024!
                }
                
                response = await client.get(search_url, headers=auth_header)
                
                if response.status_code == 200:
                    search_results = response.json()
                    logger.info(f"Search successful: {len(search_results.get('results', []))} results")
                else:
                    error = f"Search API returned status {response.status_code}: {response.text}"
                    logger.error(error)
                    
        except Exception as e:
            error = f"Failed to call search API: {str(e)}"
            logger.error(error)
        
        # Step 4: Calculate processing time and create response
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        optimization_response = QueryResponse(
            original_query=optimization_result.original_query,
            optimized_query=optimization_result.optimized_query,
            detected_language=optimization_result.detected_language.value,
            confidence=optimization_result.confidence,
            suggested_alternates=optimization_result.suggested_alternates,
            spelling_corrections=optimization_result.spelling_corrections,
            expanded_terms=optimization_result.expanded_terms,
            search_strategy=optimization_result.search_strategy,
            processing_time_ms=processing_time
        )
        
        return SearchResponse(
            optimization_result=optimization_response,
            search_url=search_url,
            search_results=search_results,
            error=error
        )
        
    except Exception as e:
        logger.error(f"Error in optimized search: {e}")
        raise HTTPException(status_code=500, detail=f"Optimized search failed: {str(e)}")

@app.get("/languages", summary="Get supported languages")
async def get_supported_languages():
    """Get list of supported languages for query optimization"""
    return {
        "supported_languages": [
            {"code": "ar", "name": "Arabic", "native_name": "العربية"},
            {"code": "en", "name": "English", "native_name": "English"}
        ],
        "detection_supported": True,
        "auto_translation": False
    }

@app.get("/synonyms/{language}", summary="Get synonyms for a language")
async def get_synonyms(language: str = Query(..., description="Language code (ar or en)")):
    """Get available synonyms for a specific language"""
    try:
        if language == "ar":
            return {"language": "Arabic", "synonyms": query_master.arabic_synonyms}
        elif language == "en":
            return {"language": "English", "synonyms": query_master.english_synonyms}
        else:
            raise HTTPException(status_code=400, detail="Unsupported language. Use 'ar' or 'en'")
    except Exception as e:
        logger.error(f"Error getting synonyms: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get synonyms: {str(e)}")

@app.get("/test", summary="Test the query optimizer with sample queries")
async def test_optimizer():
    """Test the query optimizer with various sample queries"""
    test_queries = [
        "صلاة",
        "الصلوة في المسجد", 
        "prayer in mosque",
        "زكاة المال",
        "fasting in ramadan",
        "هل يجوز",
        "is it permissible",
        "حكم الطلاق",
        "divorce ruling"
    ]
    
    results = []
    
    for query in test_queries:
        try:
            optimization_result = query_master.optimize_query(query)
            
            results.append({
                "original": query,
                "optimized": optimization_result.optimized_query,
                "language": optimization_result.detected_language.value,
                "confidence": optimization_result.confidence,
                "strategy": optimization_result.search_strategy,
                "alternatives": optimization_result.suggested_alternates[:3]
            })
        except Exception as e:
            results.append({
                "original": query,
                "error": str(e)
            })
    
    return {
        "test_results": results,
        "total_queries": len(test_queries),
        "successful": len([r for r in results if "error" not in r])
    }

# Add some utility endpoints for debugging
@app.get("/debug/detect-language", summary="Debug language detection")
async def debug_detect_language(query: str = Query(..., description="Query to analyze")):
    """Debug endpoint to test language detection"""
    try:
        language, confidence = query_master.detect_language(query)
        return {
            "query": query,
            "detected_language": language.value,
            "confidence": confidence,
            "arabic_chars": len([c for c in query if '\u0600' <= c <= '\u06FF']),
            "english_chars": len([c for c in query if c.isalpha() and c.isascii()]),
            "total_chars": len(query.replace(' ', ''))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug/normalize-arabic", summary="Debug Arabic normalization")
async def debug_normalize_arabic(text: str = Query(..., description="Arabic text to normalize")):
    """Debug endpoint to test Arabic text normalization"""
    try:
        normalized = query_master.normalize_arabic_text(text)
        return {
            "original": text,
            "normalized": normalized,
            "changed": text != normalized
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting FatwaQueryMaster API Service...")
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")