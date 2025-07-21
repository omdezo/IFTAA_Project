import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Category } from '@types/index';
import { categoryApi } from '@utils/api';
import { useTranslation } from '@contexts/LanguageContext';
import { LoadingSpinner } from '@components/ui';
import { cn } from '@utils/index';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface CategoryItemProps {
  category: Category;
  level: number;
  isExpanded: boolean;
  onToggle: (categoryId: number) => void;
  onSelectCategory: (categoryId: number, categoryTitle: string) => void;
  selectedCategoryId?: number;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  level,
  isExpanded,
  onToggle,
  onSelectCategory,
  selectedCategoryId
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedCategoryId === category.id;
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <button
        onClick={() => onSelectCategory(category.id, category.title)}
        className={cn(
          'w-full flex items-center justify-between text-start py-2 px-3 rounded-lg transition-all duration-200 hover:bg-neutral-100 group',
          isSelected && 'bg-islamic-gold text-white hover:bg-islamic-gold-dark',
          `ps-${3 + level * 4}` // Dynamic padding based on nesting level
        )}
        style={{ paddingInlineStart: `${12 + level * 16}px` }}
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
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(category.id);
            }}
            className={cn(
              'flex-shrink-0 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors',
              isSelected ? 'text-white' : 'text-neutral-400 hover:text-islamic-gold'
            )}
          >
            <svg 
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isExpanded ? 'rotate-90' : 'rotate-0'
              )} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </button>

      {/* Child categories */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1 animate-fade-in">
          {category.children?.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onSelectCategory={onSelectCategory}
              selectedCategoryId={selectedCategoryId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  isOpen = true, 
  onClose 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useTranslation();

  // Load categories on mount and when language changes
  useEffect(() => {
    loadCategories();
  }, [language]);

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

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await categoryApi.getAll(language) as Category[];
      
      // Build hierarchical structure
      const categoryMap = new Map<number, Category>();
      const rootCategories: Category[] = [];

      // First pass: create map
      response.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      // Second pass: build hierarchy
      response.forEach(category => {
        const categoryWithChildren = categoryMap.get(category.id)!;
        
        if (category.parentId) {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(categoryWithChildren);
          }
        } else {
          rootCategories.push(categoryWithChildren);
        }
      });

      setCategories(rootCategories);
      
      // Auto-expand categories with many fatwas
      const autoExpand = new Set<number>();
      rootCategories.forEach(category => {
        if (category.children && category.children.length > 0) {
          autoExpand.add(category.id);
        }
      });
      setExpandedCategories(autoExpand);
      
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError(t('error.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
          {t('dashboard.categories')}
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
          <span className="font-medium">{t('dashboard.allCategories')}</span>
        </button>

        {/* Categories List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner text={t('common.loading')} />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={loadCategories}
              className="text-islamic-gold hover:text-islamic-gold-dark text-sm font-medium"
            >
              {t('error.tryAgain')}
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            {t('dashboard.noFatwas')}
          </div>
        ) : (
          <div className="space-y-1">
            {categories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                level={0}
                isExpanded={expandedCategories.has(category.id)}
                onToggle={handleToggleCategory}
                onSelectCategory={handleSelectCategory}
                selectedCategoryId={selectedCategoryId}
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
              {categories.length} {t('dashboard.categories')}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};