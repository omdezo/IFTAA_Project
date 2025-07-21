import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Category } from '@types/index';
import { categoryApi } from '@utils/api';
import { t } from '../../translations';
import { useLanguage } from '@contexts/LanguageContext';
import { LoadingSpinner } from '@components/ui';
import { cn } from '@utils/index';

interface LazyTreeSidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface CategoryNodeProps {
  category: Category & { isLoading?: boolean; childrenLoaded?: boolean };
  level: number;
  expandedNodes: Set<number>;
  selectedCategoryId?: number;
  onToggleExpand: (categoryId: number) => void;
  onSelectCategory: (categoryId: number, categoryTitle: string) => void;
  onLoadChildren: (categoryId: number) => void;
}

// Mock data for development
const generateMockCategories = (): Category[] => [
  {
    id: 1,
    title: 'فتاوى العبادات',
    parentId: undefined,
    fatwaIds: Array.from({length: 150}, (_, i) => 1000 + i),
    children: []
  },
  {
    id: 2,
    title: 'فتاوى الصلاة',
    parentId: 1,
    fatwaIds: Array.from({length: 45}, (_, i) => 2000 + i),
    children: []
  },
  {
    id: 3,
    title: 'فتاوى الزكاة',
    parentId: 1,
    fatwaIds: Array.from({length: 32}, (_, i) => 3000 + i),
    children: []
  },
  {
    id: 4,
    title: 'فتاوى الصوم',
    parentId: 1,
    fatwaIds: Array.from({length: 28}, (_, i) => 4000 + i),
    children: []
  },
  {
    id: 5,
    title: 'فتاوى النكاح',
    parentId: undefined,
    fatwaIds: Array.from({length: 89}, (_, i) => 5000 + i),
    children: []
  },
  {
    id: 6,
    title: 'فتاوى الزواج',
    parentId: 5,
    fatwaIds: Array.from({length: 56}, (_, i) => 6000 + i),
    children: []
  },
  {
    id: 7,
    title: 'فتاوى الطلاق',
    parentId: 5,
    fatwaIds: Array.from({length: 33}, (_, i) => 7000 + i),
    children: []
  },
  {
    id: 8,
    title: 'فتاوى المعاملات',
    parentId: undefined,
    fatwaIds: Array.from({length: 120}, (_, i) => 8000 + i),
    children: []
  }
];

const CategoryNode: React.FC<CategoryNodeProps> = ({
  category,
  level,
  expandedNodes,
  selectedCategoryId,
  onToggleExpand,
  onSelectCategory,
  onLoadChildren
}) => {
  const { language } = useLanguage();
  const hasChildren = category.children && category.children.length > 0;
  const hasUnloadedChildren = !category.childrenLoaded && category.parentId === undefined;
  const isExpanded = expandedNodes.has(category.id);
  const isSelected = selectedCategoryId === category.id;
  
  const handleToggleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isExpanded && hasUnloadedChildren) {
      await onLoadChildren(category.id);
    }
    
    onToggleExpand(category.id);
  };

  const paddingStart = `${12 + level * 16}px`;

  return (
    <div className="w-full">
      <button
        onClick={() => onSelectCategory(category.id, category.title)}
        className={cn(
          'w-full flex items-center justify-between text-start py-2 px-3 rounded-lg transition-all duration-200 hover:bg-neutral-100 group',
          isSelected && 'bg-islamic-gold text-white hover:bg-islamic-gold-dark'
        )}
        style={{ paddingInlineStart: paddingStart }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Category icon */}
          <div className={cn(
            'w-2 h-2 rounded-full flex-shrink-0',
            isSelected ? 'bg-white' : 'bg-islamic-gold'
          )} />
          
          {/* Category title */}
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-white' : 'text-neutral-700 group-hover:text-islamic-blue'
          )}>
            {category.title}
          </span>
          
          {/* Fatwa count */}
          {category.fatwaIds && category.fatwaIds.length > 0 && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
              isSelected 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'bg-neutral-200 text-neutral-600'
            )}>
              {category.fatwaIds.length}
            </span>
          )}
        </div>

        {/* Expand/collapse button */}
        {(hasChildren || hasUnloadedChildren) && (
          <button
            onClick={handleToggleClick}
            className={cn(
              'flex-shrink-0 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors',
              isSelected ? 'text-white' : 'text-neutral-400 hover:text-islamic-gold'
            )}
            disabled={category.isLoading}
          >
            {category.isLoading ? (
              <div className="w-4 h-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <svg 
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isExpanded ? 'rotate-90' : 'rotate-0',
                  language === 'ar' && !isExpanded && 'rotate-180'
                )} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
      </button>

      {/* Child categories */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 animate-fade-in">
          {category.children?.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              selectedCategoryId={selectedCategoryId}
              onToggleExpand={onToggleExpand}
              onSelectCategory={onSelectCategory}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LazyTreeSidebar: React.FC<LazyTreeSidebarProps> = ({ 
  className, 
  isOpen = true, 
  onClose 
}) => {
  const [categories, setCategories] = useState<(Category & { isLoading?: boolean; childrenLoaded?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  // Extract selected category from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      setSelectedCategoryId(parseInt(categoryId));
    } else {
      setSelectedCategoryId(undefined);
    }
  }, [location]);

  // Load top-level categories
  const loadTopLevelCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use mock data for development
      const mockCategories = generateMockCategories();
      const topLevelCategories = mockCategories
        .filter(cat => !cat.parentId)
        .map(cat => ({ ...cat, childrenLoaded: false }));
      
      setCategories(topLevelCategories);
      
      // Auto-expand first category
      if (topLevelCategories.length > 0) {
        setExpandedNodes(new Set([topLevelCategories[0].id]));
      }
      
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(t('error.loadingFailed', language));
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Load children for a specific category
  const loadChildren = useCallback(async (parentId: number) => {
    try {
      // Set loading state
      setCategories(prev => prev.map(cat => 
        cat.id === parentId ? { ...cat, isLoading: true } : cat
      ));

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use mock data for development
      const mockCategories = generateMockCategories();
      const children = mockCategories.filter(cat => cat.parentId === parentId);
      
      // Update categories with children
      setCategories(prev => prev.map(cat => {
        if (cat.id === parentId) {
          return {
            ...cat,
            children,
            childrenLoaded: true,
            isLoading: false
          };
        }
        return cat;
      }));
      
    } catch (err) {
      console.error('Failed to load children:', err);
      // Reset loading state on error
      setCategories(prev => prev.map(cat => 
        cat.id === parentId ? { ...cat, isLoading: false } : cat
      ));
    }
  }, []);

  // Initialize categories
  useEffect(() => {
    loadTopLevelCategories();
  }, [loadTopLevelCategories]);

  const handleToggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectCategory = (categoryId: number, categoryTitle: string) => {
    setSelectedCategoryId(categoryId);
    
    // Navigate to dashboard with category filter
    const searchParams = new URLSearchParams();
    searchParams.set('categoryId', categoryId.toString());
    navigate(`/dashboard?${searchParams.toString()}`);
    
    // Close sidebar on mobile
    if (onClose) {
      onClose();
    }
  };

  const handleShowAllCategories = () => {
    setSelectedCategoryId(undefined);
    navigate('/dashboard');
    
    // Close sidebar on mobile
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className={cn(
      'bg-white border-e border-neutral-200 transition-all duration-300 ease-in-out',
      'flex flex-col h-full',
      isOpen ? 'w-80' : 'w-0 overflow-hidden',
      className
    )}>
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 className="text-lg font-semibold text-islamic-blue">
          {t('dashboard.categories', language)}
        </h2>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 transition-colors lg:hidden"
          >
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4">
        
        {/* All Categories Button */}
        <button
          onClick={handleShowAllCategories}
          className={cn(
            'w-full flex items-center gap-2 text-start py-3 px-3 rounded-lg transition-all duration-200 hover:bg-neutral-100 mb-4 border',
            !selectedCategoryId 
              ? 'bg-islamic-gold text-white border-islamic-gold hover:bg-islamic-gold-dark' 
              : 'bg-white text-neutral-700 border-neutral-200 hover:border-islamic-gold'
          )}
        >
          <svg 
            className="w-5 h-5 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-medium">{t('dashboard.allCategories', language)}</span>
        </button>

        {/* Categories Tree */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner text={t('category.loading', language)} />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={loadTopLevelCategories}
              className="text-islamic-gold hover:text-islamic-gold-dark text-sm font-medium"
            >
              {t('error.tryAgain', language)}
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            {t('dashboard.noFatwas', language)}
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                level={0}
                expandedNodes={expandedNodes}
                selectedCategoryId={selectedCategoryId}
                onToggleExpand={handleToggleExpand}
                onSelectCategory={handleSelectCategory}
                onLoadChildren={loadChildren}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-neutral-200">
        <div className="text-xs text-neutral-500 text-center">
          {categories.length > 0 && (
            <span>
              {t('category.count', language, { count: categories.length })}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};