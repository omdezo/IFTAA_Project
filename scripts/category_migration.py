#!/usr/bin/env python3
"""
Category Hierarchy Migration Script for IFTAA Fatwa System

This script normalizes the category structure in the existing Fatwa datastore
by creating a hierarchical parent-child relationship system and updating
MongoDB documents accordingly.

Author: Backend Migration System
Created: 2025-01-19
"""

import json
import logging
import sys
from typing import Dict, List, Optional, Set
from datetime import datetime
import re

# Standard library and MongoDB driver only
try:
    from pymongo import MongoClient, UpdateOne
    from pymongo.errors import BulkWriteError
except ImportError:
    print("Error: pymongo is required. Install with: pip install pymongo")
    sys.exit(1)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CategoryMigration:
    """Handles the migration of flat categories to hierarchical structure"""
    
    def __init__(self, mongodb_uri: str = "mongodb://admin:IftaaDB2024!@localhost:27017/iftaa_db?authSource=admin"):
        """Initialize migration with MongoDB connection"""
        self.mongodb_uri = mongodb_uri
        self.client = None
        self.db = None
        
        # Define the target hierarchy structure based on requirements
        self.hierarchy_map = {
            # Main category: فتاوى العبادات
            "فتاوى العبادات": {
                "parent": None,
                "children": ["فتاوى الصلاة", "فتاوى الزكاة", "فتاوى الصوم", "فتاوى الحج"]
            },
            "فتاوى الصلاة": {"parent": "فتاوى العبادات", "children": []},
            "فتاوى الزكاة": {"parent": "فتاوى العبادات", "children": []},
            "فتاوى الصوم": {"parent": "فتاوى العبادات", "children": []},
            "فتاوى الحج": {"parent": "فتاوى العبادات", "children": []},
            
            # Main category: فتاوى النكاح
            "فتاوى النكاح": {
                "parent": None,
                "children": ["فتاوى الزواج", "فتاوى الفراق"]
            },
            "فتاوى الزواج": {"parent": "فتاوى النكاح", "children": []},
            "فتاوى الفراق": {"parent": "فتاوى النكاح", "children": []},
            
            # Main category: فتاوى المعاملات
            "فتاوى المعاملات": {
                "parent": None,
                "children": ["فتاوى البيوع", "الربا", "الديون", "الشركات", "أوجه من المعاملات"]
            },
            "فتاوى البيوع": {"parent": "فتاوى المعاملات", "children": []},
            "الربا": {"parent": "فتاوى المعاملات", "children": []},
            "الديون": {"parent": "فتاوى المعاملات", "children": []},
            "الشركات": {"parent": "فتاوى المعاملات", "children": []},
            "أوجه من المعاملات": {"parent": "فتاوى المعاملات", "children": []},
            
            # Main category: فتاوى الوصية – الوقف – بيت المال
            "فتاوى الوصية – الوقف – بيت المال": {
                "parent": None,
                "children": ["فتاوى الوصية", "فتاوى الوقف", "فتاوى بيت المال"]
            },
            "فتاوى الوصية": {"parent": "فتاوى الوصية – الوقف – بيت المال", "children": []},
            "فتاوى الوقف": {"parent": "فتاوى الوصية – الوقف – بيت المال", "children": []},
            "فتاوى بيت المال": {"parent": "فتاوى الوصية – الوقف – بيت المال", "children": []},
            
            # Main category: فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج
            "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج": {
                "parent": None,
                "children": ["فتاوى المساجد", "مدارس تعليم القرآن الكريم", "الأفلاج"]
            },
            "فتاوى المساجد": {"parent": "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج", "children": []},
            "مدارس تعليم القرآن الكريم": {"parent": "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج", "children": []},
            "الأفلاج": {"parent": "فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج", "children": []},
            
            # Main category: فتاوى الأيمان – الكفارات – النذور
            "فتاوى الأيمان – الكفارات – النذور": {
                "parent": None,
                "children": ["فتاوى الأيمان", "الكفارات", "النذور"]
            },
            "فتاوى الأيمان": {"parent": "فتاوى الأيمان – الكفارات – النذور", "children": []},
            "الكفارات": {"parent": "فتاوى الأيمان – الكفارات – النذور", "children": []},
            "النذور": {"parent": "فتاوى الأيمان – الكفارات – النذور", "children": []},
            
            # Main category: فتاوى الذبائح – الأطعمة – التدخين
            "فتاوى الذبائح – الأطعمة – التدخين": {
                "parent": None,
                "children": ["فتاوى الذبائح", "الأطعمة", "التدخين"]
            },
            "فتاوى الذبائح": {"parent": "فتاوى الذبائح – الأطعمة – التدخين", "children": []},
            "الأطعمة": {"parent": "فتاوى الذبائح – الأطعمة – التدخين", "children": []},
            "التدخين": {"parent": "فتاوى الذبائح – الأطعمة – التدخين", "children": []},
            
            # Standalone categories (no children)
            "إعلام وتواصل": {"parent": None, "children": []},
            "التوبة والتبعات والحقوق": {"parent": None, "children": []},
            "اللباس والزينة": {"parent": None, "children": []},
            "الحدود والتعزيرات": {"parent": None, "children": []},
            "فقه المواريث": {"parent": None, "children": []},
            "طب": {"parent": None, "children": []},
        }
        
        # Category mapping rules for existing categories
        self.category_mapping_rules = {
            # Prayer related
            "أحكام الإمامة وصلاة الجماعة": "فتاوى الصلاة",
            "الصلاة في الطائرة": "فتاوى الصلاة",
            "أحكام صلاة السفر": "فتاوى الصلاة",
            "صلاة المرأة": "فتاوى الصلاة",
            "الوضوء ونواقضه": "فتاوى الصلاة",
            "التيمم": "فتاوى الصلاة",
            "السنن والنوافل": "فتاوى الصلاة",
            "سجود التلاوة والشكر": "فتاوى الصلاة",
            "صلاة العيدين": "فتاوى الصلاة",
            "الصلاة على الميت": "فتاوى الصلاة",
            "صلاة الجمعة": "فتاوى الصلاة",
            "الأذان والإقامة": "فتاوى الصلاة",
            
            # Zakat related
            "مصارف الزكاة": "فتاوى الزكاة",
            "زكاة الزروع والثمار": "فتاوى الزكاة",
            "زكاة الذهب والفضة": "فتاوى الزكاة",
            "زكاة الأنعام": "فتاوى الزكاة",
            "زكاة المال": "فتاوى الزكاة",
            "زكاة الفطر": "فتاوى الزكاة",
            
            # Fasting related
            "أحكام الصوم": "فتاوى الصوم",
            "صوم المريض": "فتاوى الصوم",
            "صوم المسافر": "فتاوى الصوم",
            "مفطرات الصوم": "فتاوى الصوم",
            "الجنابة والجماع في رمضان": "فتاوى الصوم",
            "صوم النفل": "فتاوى الصوم",
            "قضاء الصوم": "فتاوى الصوم",
            
            # Hajj related
            "أحكام الحج والعمرة": "فتاوى الحج",
            "مناسك الحج": "فتاوى الحج",
            "العمرة": "فتاوى الحج",
            "الهدي والأضحية": "فتاوى الحج",
            "الوصية بالحج": "فتاوى الحج",
            
            # Marriage related
            "فتاوى النكاح": "فتاوى الزواج",
            "أحكام النكاح": "فتاوى الزواج",
            "أحكام الخطبة": "فتاوى الزواج",
            "المهر والصداق": "فتاوى الزواج",
            "فتاوى نسائية": "فتاوى الزواج",
            
            # Divorce related
            "أحكام الطلاق": "فتاوى الفراق",
            "الحلف بالطلاق": "فتاوى الفراق",
            "العدة": "فتاوى الفراق",
            "أحكام الخلع": "فتاوى الفراق",
            "الإحسان إلى المطلقة": "فتاوى الفراق",
            
            # Business transactions
            "أحكام البيع والشراء": "فتاوى البيوع",
            "أحكام المتبايعين": "فتاوى البيوع",
            "بيع وشراء الأراضي": "فتاوى البيوع",
            "الشفعة": "فتاوى البيوع",
            
            # Interest/Riba
            "أحكام الربا": "الربا",
            "الربا في المعاملات": "الربا",
            
            # Debts
            "أحكام الديون": "الديون",
            "قضاء الديون": "الديون",
            
            # Companies/Partnerships
            "أحكام الشركات": "الشركات",
            "الشراكة في التجارة": "الشركات",
            
            # Waqf related
            "بيع الوقف والقياض به": "فتاوى الوقف",
            "صرف الوقف في غير ما وقف له جوازاً ومنعاً": "فتاوى الوقف",
            "إدارة الوقف": "فتاوى الوقف",
            "أحكام الوقف": "فتاوى الوقف",
            "صرف الفاضل من غلة مدارس القرآن": "فتاوى الوقف",
            "الاعتداء على الأفلاج وأموالها": "الأفلاج",
            
            # Will/Testament related
            "أحكام الوصية": "فتاوى الوصية",
            "أحكام الموصي والموصى له": "فتاوى الوصية",
            "أحكام الوصي": "فتاوى الوصية",
            
            # Mosque related
            "أحكام المساجد والمصليات": "فتاوى المساجد",
            "إتلاف أموال المسجد": "فتاوى المساجد",
            "بناء المساجد": "فتاوى المساجد",
            
            # Oaths and vows
            "أحكام الأيمان": "فتاوى الأيمان",
            "أنواع الكفارات": "الكفارات",
            "كفارة اليمين": "الكفارات",
            "أحكام النذور": "النذور",
            
            # Food and slaughter
            "أحكام الذبح": "فتاوى الذبائح",
            "آداب الأكل والشرب": "الأطعمة",
            "أكل الحشرات": "الأطعمة",
            "أكل لحوم السباع": "الأطعمة",
            "أكل المحرم للضرورة": "الأطعمة",
            "أكل ما صنعه المشرك أو الفاسق": "الأطعمة",
            "حكم التدخين": "التدخين",
        }

    def connect_mongodb(self) -> bool:
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client.get_database()
            # Test connection
            self.client.admin.command('ping')
            logger.info("✅ Successfully connected to MongoDB")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            return False

    def close_connection(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("🔗 MongoDB connection closed")

    def load_json_data(self, file_path: str) -> List[Dict]:
        """Load fatwa data from JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"✅ Loaded {len(data)} category groups from {file_path}")
            return data
        except Exception as e:
            logger.error(f"❌ Failed to load JSON data: {e}")
            return []

    def analyze_existing_categories(self) -> Set[str]:
        """Analyze existing categories in MongoDB"""
        try:
            # Get all distinct categories from fatwas collection
            existing_categories = set(self.db.fatwas.distinct('category'))
            logger.info(f"📊 Found {len(existing_categories)} distinct categories in MongoDB")
            
            # Log some examples
            logger.info("🔍 Sample existing categories:")
            for i, cat in enumerate(sorted(existing_categories)[:10]):
                logger.info(f"   {i+1}. {cat}")
            
            return existing_categories
        except Exception as e:
            logger.error(f"❌ Failed to analyze existing categories: {e}")
            return set()

    def map_category_to_hierarchy(self, category: str) -> str:
        """Map an existing category to the hierarchical structure"""
        # First, check if it's already in our hierarchy
        if category in self.hierarchy_map:
            return category
        
        # Check mapping rules
        if category in self.category_mapping_rules:
            return self.category_mapping_rules[category]
        
        # Try partial matching for similar categories
        for rule_pattern, target_category in self.category_mapping_rules.items():
            if rule_pattern in category or category in rule_pattern:
                return target_category
        
        # Default mapping based on keywords
        category_lower = category.lower()
        
        if any(word in category for word in ["صلاة", "وضوء", "إمامة", "أذان", "جماعة", "تيمم"]):
            return "فتاوى الصلاة"
        elif any(word in category for word in ["زكاة", "صدقة"]):
            return "فتاوى الزكاة"
        elif any(word in category for word in ["صوم", "صيام", "إفطار", "رمضان"]):
            return "فتاوى الصوم"
        elif any(word in category for word in ["حج", "عمرة", "طواف", "هدي"]):
            return "فتاوى الحج"
        elif any(word in category for word in ["نكاح", "زواج", "خطبة", "مهر", "نسائية"]):
            return "فتاوى الزواج"
        elif any(word in category for word in ["طلاق", "فراق", "عدة", "خلع"]):
            return "فتاوى الفراق"
        elif any(word in category for word in ["بيع", "شراء", "متبايعين", "شفعة"]):
            return "فتاوى البيوع"
        elif any(word in category for word in ["ربا"]):
            return "الربا"
        elif any(word in category for word in ["دين", "ديون"]):
            return "الديون"
        elif any(word in category for word in ["شركة", "شراكة"]):
            return "الشركات"
        elif any(word in category for word in ["وقف", "موقوف"]):
            return "فتاوى الوقف"
        elif any(word in category for word in ["وصية", "موصي"]):
            return "فتاوى الوصية"
        elif any(word in category for word in ["مسجد", "مصلى"]):
            return "فتاوى المساجد"
        elif any(word in category for word in ["مدرسة", "تعليم", "قرآن"]):
            return "مدارس تعليم القرآن الكريم"
        elif any(word in category for word in ["فلج", "أفلاج"]):
            return "الأفلاج"
        elif any(word in category for word in ["يمين", "أيمان"]):
            return "فتاوى الأيمان"
        elif any(word in category for word in ["كفارة", "كفارات"]):
            return "الكفارات"
        elif any(word in category for word in ["نذر", "نذور"]):
            return "النذور"
        elif any(word in category for word in ["ذبح", "ذبائح"]):
            return "فتاوى الذبائح"
        elif any(word in category for word in ["أكل", "طعام", "أطعمة", "شرب"]):
            return "الأطعمة"
        elif any(word in category for word in ["تدخين", "دخان"]):
            return "التدخين"
        elif any(word in category for word in ["إعلام", "تواصل"]):
            return "إعلام وتواصل"
        elif any(word in category for word in ["توبة", "تبعة", "حق"]):
            return "التوبة والتبعات والحقوق"
        elif any(word in category for word in ["لباس", "زينة"]):
            return "اللباس والزينة"
        elif any(word in category for word in ["حد", "تعزير"]):
            return "الحدود والتعزيرات"
        elif any(word in category for word in ["ميراث", "وراثة"]):
            return "فقه المواريث"
        elif any(word in category for word in ["طب", "دواء", "علاج"]):
            return "طب"
        else:
            # Default to general category based on content
            return "أوجه من المعاملات"

    def create_categories_collection(self) -> bool:
        """Create the normalized categories collection"""
        try:
            # Drop existing categories collection if it exists
            if 'categories' in self.db.list_collection_names():
                self.db.categories.drop()
                logger.info("🗑️ Dropped existing categories collection")

            categories_to_insert = []
            category_id = 1
            
            # Create category documents with proper hierarchy
            for category_title, hierarchy_info in self.hierarchy_map.items():
                parent_id = None
                if hierarchy_info["parent"]:
                    # Find parent ID
                    for cat_title, _ in self.hierarchy_map.items():
                        if cat_title == hierarchy_info["parent"]:
                            # Parent will have a lower ID since we process in order
                            parent_id = list(self.hierarchy_map.keys()).index(cat_title) + 1
                            break
                
                category_doc = {
                    "id": category_id,
                    "title": category_title,
                    "parentId": parent_id,
                    "description": f"Category for {category_title}",
                    "fatwaIds": [],  # Will be populated during migration
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "is_active": True
                }
                
                categories_to_insert.append(category_doc)
                category_id += 1
            
            # Bulk insert categories
            if categories_to_insert:
                result = self.db.categories.insert_many(categories_to_insert)
                logger.info(f"✅ Created {len(result.inserted_ids)} categories in MongoDB")
                
                # Create indexes
                self.db.categories.create_index("id", unique=True)
                self.db.categories.create_index("title", unique=True)
                self.db.categories.create_index("parentId")
                logger.info("📑 Created indexes on categories collection")
                
                return True
            else:
                logger.error("❌ No categories to insert")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to create categories collection: {e}")
            return False

    def migrate_fatwa_categories(self) -> bool:
        """Migrate existing fatwas to use the new category structure"""
        try:
            # Get all fatwas
            fatwas = list(self.db.fatwas.find({}, {"fatwa_id": 1, "category": 1}))
            logger.info(f"🔄 Processing {len(fatwas)} fatwas for category migration")
            
            # Track category usage
            category_fatwa_map = {}
            update_operations = []
            unmapped_categories = set()
            
            for fatwa in fatwas:
                current_category = fatwa.get('category', '')
                fatwa_id = fatwa.get('fatwa_id')
                
                if not current_category or not fatwa_id:
                    continue
                
                # Map to new category
                new_category = self.map_category_to_hierarchy(current_category)
                
                if new_category not in self.hierarchy_map:
                    unmapped_categories.add(current_category)
                    new_category = "أوجه من المعاملات"  # Default fallback
                
                # Track for category fatwa lists
                if new_category not in category_fatwa_map:
                    category_fatwa_map[new_category] = []
                category_fatwa_map[new_category].append(fatwa_id)
                
                # Create update operation
                update_operations.append(
                    UpdateOne(
                        {"fatwa_id": fatwa_id},
                        {
                            "$set": {
                                "category": new_category,
                                "original_category": current_category,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                )
            
            # Log unmapped categories
            if unmapped_categories:
                logger.warning(f"⚠️ Found {len(unmapped_categories)} unmapped categories:")
                for cat in sorted(unmapped_categories):
                    logger.warning(f"   - {cat}")
            
            # Execute bulk updates
            if update_operations:
                try:
                    result = self.db.fatwas.bulk_write(update_operations, ordered=False)
                    logger.info(f"✅ Updated {result.modified_count} fatwas with new categories")
                except BulkWriteError as e:
                    logger.error(f"❌ Bulk write error: {e.details}")
                    return False
            
            # Update category fatwa lists
            category_update_ops = []
            for category_title, fatwa_ids in category_fatwa_map.items():
                category_update_ops.append(
                    UpdateOne(
                        {"title": category_title},
                        {
                            "$set": {
                                "fatwaIds": fatwa_ids,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                )
            
            if category_update_ops:
                result = self.db.categories.bulk_write(category_update_ops, ordered=False)
                logger.info(f"✅ Updated {result.modified_count} categories with fatwa lists")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to migrate fatwa categories: {e}")
            return False

    def export_normalized_data(self, output_file: str) -> bool:
        """Export the normalized category structure to JSON file"""
        try:
            # Get all categories with their fatwas
            categories = list(self.db.categories.find({}, {"_id": 0}).sort("id"))
            
            # Convert datetime objects to strings
            for category in categories:
                if 'created_at' in category:
                    category['created_at'] = category['created_at'].isoformat()
                if 'updated_at' in category:
                    category['updated_at'] = category['updated_at'].isoformat()
            
            # Format for output
            export_data = {
                "metadata": {
                    "export_date": datetime.utcnow().isoformat(),
                    "total_categories": len(categories),
                    "schema_version": "1.0"
                },
                "categories": categories
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"✅ Exported normalized categories to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to export data: {e}")
            return False

    def validate_migration(self) -> bool:
        """Validate the migration results"""
        try:
            # Check categories collection
            categories_count = self.db.categories.count_documents({})
            expected_categories = len(self.hierarchy_map)
            
            if categories_count != expected_categories:
                logger.error(f"❌ Categories count mismatch: expected {expected_categories}, got {categories_count}")
                return False
            
            # Check fatwas have valid categories
            invalid_fatwas = self.db.fatwas.count_documents({
                "category": {"$nin": list(self.hierarchy_map.keys())}
            })
            
            if invalid_fatwas > 0:
                logger.warning(f"⚠️ Found {invalid_fatwas} fatwas with invalid categories")
            
            # Check parent-child relationships
            for category in self.db.categories.find():
                if category.get('parentId'):
                    parent = self.db.categories.find_one({"id": category['parentId']})
                    if not parent:
                        logger.error(f"❌ Category '{category['title']}' has invalid parent ID {category['parentId']}")
                        return False
            
            logger.info("✅ Migration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Validation failed: {e}")
            return False

    def run_migration(self, json_file_path: str = None, export_file: str = None) -> bool:
        """Run the complete migration process"""
        logger.info("🚀 Starting category hierarchy migration")
        
        if not self.connect_mongodb():
            return False
        
        try:
            # Step 1: Analyze existing data
            existing_categories = self.analyze_existing_categories()
            logger.info(f"📊 Found {len(existing_categories)} existing categories")
            
            # Step 2: Create normalized categories collection
            if not self.create_categories_collection():
                return False
            
            # Step 3: Migrate fatwas to new category structure
            if not self.migrate_fatwa_categories():
                return False
            
            # Step 4: Validate migration
            if not self.validate_migration():
                return False
            
            # Step 5: Export results if requested
            if export_file:
                if not self.export_normalized_data(export_file):
                    logger.warning("⚠️ Export failed, but migration was successful")
            
            logger.info("🎉 Category hierarchy migration completed successfully!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False
        finally:
            self.close_connection()


def main():
    """Main execution function"""
    # Configuration
    MONGODB_URI = "mongodb://admin:IftaaDB2024!@localhost:27017/iftaa_db?authSource=admin"
    EXPORT_FILE = "../data/json/categories_normalized.json"
    
    # Create and run migration
    migration = CategoryMigration(MONGODB_URI)
    success = migration.run_migration(export_file=EXPORT_FILE)
    
    if success:
        logger.info("Migration completed successfully!")
        print("\n" + "="*60)
        print("CATEGORY HIERARCHY MIGRATION COMPLETED!")
        print("="*60)
        print(f"Normalized categories exported to: {EXPORT_FILE}")
        print("MongoDB collections updated:")
        print("   - categories: New hierarchical structure")
        print("   - fatwas: Updated with normalized categories")
        print("\nYou can now use the hierarchical category system in your application!")
        sys.exit(0)
    else:
        logger.error("Migration failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()