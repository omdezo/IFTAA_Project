#!/usr/bin/env python3
"""
Manual Data Initialization Script
Run this to initialize data manually for testing
"""

import os
import sys
from smart_data_loader import DataLoader
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Initialize data manually"""
    logger.info("🚀 Starting manual data initialization...")
    
    # Create data loader
    loader = DataLoader(use_lite=False)
    
    # Override MongoDB URI for Docker environment
    loader.mongo_uri = "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin"
    loader.milvus_host = "milvus"
    
    # Check if running in Docker
    if "MONGODB_URI" in os.environ:
        loader.mongo_uri = os.environ["MONGODB_URI"]
        loader.milvus_host = os.environ.get("MILVUS_HOST", "milvus")
        logger.info("📦 Running in Docker environment")
    else:
        logger.info("💻 Running in local environment")
    
    # Run the data loader with force reload
    success = loader.run(force_reload=True)
    
    if success:
        logger.info("✅ Manual data initialization completed successfully!")
        return 0
    else:
        logger.error("❌ Manual data initialization failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())