#!/usr/bin/env python3
"""
Category Service for IFTAA Fatwa System

This module provides utilities to work with the hierarchical category system
after migration. It integrates seamlessly with your existing codebase.

Usage:
    from scripts.category_service import CategoryService
    
    service = CategoryService()
    # Get all top-level categories
    top_categories = service.get_top_level_categories()
    
    # Get children of a category
    children = service.get_child_categories("فتاوى العبادات")
    
    # Get category hierarchy
    hierarchy = service.get_category_hierarchy()

Author: Backend Integration System
Created: 2025-01-19
"""

from typing import Dict, List, Optional, Any
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)


class CategoryService:
    """Service class for working with hierarchical categories"""
    
    def __init__(self, mongodb_uri: str = "mongodb://admin:IftaaDB2024!@localhost:27017/iftaa_db?authSource=admin"):
        """Initialize the category service"""
        self.mongodb_uri = mongodb_uri
        self.client = None
        self.db = None
        self._categories_cache = None
        
    def connect(self) -> bool:
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client.get_database()
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False
    
    def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
    
    def _get_all_categories(self) -> List[Dict]:
        """Get all categories with caching"""
        if self._categories_cache is None:
            if not self.client:
                if not self.connect():
                    return []
            
            self._categories_cache = list(
                self.db.categories.find({}, {"_id": 0}).sort("id")
            )
        
        return self._categories_cache
    
    def refresh_cache(self):
        """Refresh the categories cache"""
        self._categories_cache = None
    
    def get_top_level_categories(self) -> List[Dict]:
        """Get all top-level categories (parentId is null)"""
        categories = self._get_all_categories()
        return [cat for cat in categories if cat.get('parentId') is None]
    
    def get_child_categories(self, parent_title: str) -> List[Dict]:
        """Get all child categories of a parent category"""
        categories = self._get_all_categories()
        
        # Find parent ID
        parent_id = None
        for cat in categories:
            if cat['title'] == parent_title:
                parent_id = cat['id']
                break
        
        if parent_id is None:
            return []
        
        return [cat for cat in categories if cat.get('parentId') == parent_id]
    
    def get_category_by_id(self, category_id: int) -> Optional[Dict]:
        """Get a category by its ID"""
        categories = self._get_all_categories()
        for cat in categories:
            if cat['id'] == category_id:
                return cat
        return None
    
    def get_category_by_title(self, title: str) -> Optional[Dict]:
        """Get a category by its title"""
        categories = self._get_all_categories()
        for cat in categories:
            if cat['title'] == title:
                return cat
        return None
    
    def get_category_hierarchy(self) -> Dict[str, Any]:
        """Get the complete category hierarchy as a nested structure"""
        categories = self._get_all_categories()
        hierarchy = {}
        
        # Create a mapping for quick lookup
        categories_by_id = {cat['id']: cat for cat in categories}
        
        # Build hierarchy starting from top-level categories
        for cat in categories:
            if cat.get('parentId') is None:
                hierarchy[cat['title']] = self._build_category_tree(cat, categories_by_id)
        
        return hierarchy
    
    def _build_category_tree(self, category: Dict, categories_by_id: Dict) -> Dict:
        """Recursively build category tree"""
        tree = {
            'id': category['id'],
            'title': category['title'],
            'description': category.get('description', ''),
            'fatwa_count': len(category.get('fatwaIds', [])),
            'children': {}
        }
        
        # Find children
        for cat_id, cat in categories_by_id.items():
            if cat.get('parentId') == category['id']:
                tree['children'][cat['title']] = self._build_category_tree(cat, categories_by_id)
        
        return tree
    
    def get_category_path(self, category_title: str) -> List[str]:
        """Get the full path from root to the specified category"""
        categories = self._get_all_categories()
        category = self.get_category_by_title(category_title)
        
        if not category:
            return []
        
        path = [category['title']]
        current_parent_id = category.get('parentId')
        
        while current_parent_id:
            parent = self.get_category_by_id(current_parent_id)
            if parent:
                path.insert(0, parent['title'])
                current_parent_id = parent.get('parentId')
            else:
                break
        
        return path
    
    def get_fatwas_in_category(self, category_title: str, include_children: bool = True) -> List[int]:
        """Get all fatwa IDs in a category, optionally including child categories"""
        category = self.get_category_by_title(category_title)
        if not category:
            return []
        
        fatwa_ids = list(category.get('fatwaIds', []))
        
        if include_children:
            children = self.get_child_categories(category_title)
            for child in children:
                fatwa_ids.extend(child.get('fatwaIds', []))
        
        return list(set(fatwa_ids))  # Remove duplicates
    
    def search_categories(self, search_term: str) -> List[Dict]:
        """Search categories by title containing the search term"""
        categories = self._get_all_categories()
        search_term = search_term.lower()
        
        return [
            cat for cat in categories 
            if search_term in cat['title'].lower()
        ]
    
    def get_category_statistics(self) -> Dict[str, Any]:
        """Get statistics about the category system"""
        categories = self._get_all_categories()
        
        total_categories = len(categories)
        top_level_count = len([cat for cat in categories if cat.get('parentId') is None])
        total_fatwas = sum(len(cat.get('fatwaIds', [])) for cat in categories)
        
        # Categories with most fatwas
        categories_by_fatwa_count = sorted(
            categories, 
            key=lambda x: len(x.get('fatwaIds', [])), 
            reverse=True
        )[:5]
        
        return {
            'total_categories': total_categories,
            'top_level_categories': top_level_count,
            'total_fatwas': total_fatwas,
            'average_fatwas_per_category': total_fatwas / total_categories if total_categories > 0 else 0,
            'top_categories_by_fatwa_count': [
                {
                    'title': cat['title'],
                    'fatwa_count': len(cat.get('fatwaIds', []))
                }
                for cat in categories_by_fatwa_count
            ]
        }
    
    def export_category_tree_json(self) -> Dict:
        """Export the category tree in a JSON-friendly format"""
        return {
            'hierarchy': self.get_category_hierarchy(),
            'statistics': self.get_category_statistics(),
            'all_categories': self._get_all_categories()
        }


# Utility functions for easy integration
def get_category_service() -> CategoryService:
    """Get a configured category service instance"""
    service = CategoryService()
    service.connect()
    return service


def get_all_categories_flat() -> List[Dict]:
    """Get all categories as a flat list"""
    service = get_category_service()
    try:
        return service._get_all_categories()
    finally:
        service.disconnect()


def get_category_hierarchy_tree() -> Dict:
    """Get the complete category hierarchy"""
    service = get_category_service()
    try:
        return service.get_category_hierarchy()
    finally:
        service.disconnect()


# Integration with existing search service
class CategorySearchIntegration:
    """Integration helper for the search service"""
    
    def __init__(self, category_service: CategoryService):
        self.category_service = category_service
    
    def get_search_filters_by_category(self, category_title: str) -> Dict:
        """Get MongoDB filters for searching within a specific category"""
        fatwa_ids = self.category_service.get_fatwas_in_category(category_title, include_children=True)
        
        return {
            "fatwa_id": {"$in": fatwa_ids}
        }
    
    def enhance_search_results_with_category_info(self, search_results: List[Dict]) -> List[Dict]:
        """Add category hierarchy information to search results"""
        for result in search_results:
            category_title = result.get('category', '')
            if category_title:
                category_path = self.category_service.get_category_path(category_title)
                result['category_path'] = category_path
                result['category_hierarchy'] = ' > '.join(category_path)
        
        return search_results


if __name__ == "__main__":
    # Example usage
    service = CategoryService()
    service.connect()
    
    try:
        print("=== IFTAA Category Service Demo ===")
        
        # Get top-level categories
        top_categories = service.get_top_level_categories()
        print(f"\nTop-level categories ({len(top_categories)}):")
        for cat in top_categories:
            fatwa_count = len(cat.get('fatwaIds', []))
            print(f"  - {cat['title']} ({fatwa_count} fatwas)")
        
        # Get children of a specific category
        children = service.get_child_categories("فتاوى العبادات")
        print(f"\nChildren of 'فتاوى العبادات' ({len(children)}):")
        for child in children:
            fatwa_count = len(child.get('fatwaIds', []))
            print(f"  - {child['title']} ({fatwa_count} fatwas)")
        
        # Get category path
        path = service.get_category_path("فتاوى الصلاة")
        print(f"\nCategory path for 'فتاوى الصلاة': {' > '.join(path)}")
        
        # Get statistics
        stats = service.get_category_statistics()
        print(f"\n=== Category Statistics ===")
        print(f"Total categories: {stats['total_categories']}")
        print(f"Total fatwas: {stats['total_fatwas']}")
        print(f"Average fatwas per category: {stats['average_fatwas_per_category']:.1f}")
        
        print("\nTop categories by fatwa count:")
        for cat in stats['top_categories_by_fatwa_count']:
            print(f"  - {cat['title']}: {cat['fatwa_count']} fatwas")
        
    finally:
        service.disconnect()