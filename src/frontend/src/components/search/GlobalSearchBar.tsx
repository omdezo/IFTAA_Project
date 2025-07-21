import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, LoadingSpinner } from '@components/ui';
import { useLanguage } from '@contexts/LanguageContext';
import { fatwaApi } from '@utils/api';
import { t } from '../../translations';
import { debounce, cn } from '@utils/index';
import { SearchResult, PaginatedSearchResponse } from '@types/index';

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}

interface SearchSuggestion {
  id: number;
  title: string;
  category: string;
  relevanceScore: number;
  type: 'fatwa' | 'category';
}

// Mock search suggestions
const generateMockSuggestions = (query: string): SearchSuggestion[] => {
  if (!query || query.length < 2) return [];
  
  const mockSuggestions: SearchSuggestion[] = [
    {
      id: 1001,
      title: 'أحكام الصلاة في السفر',
      category: 'فتاوى الصلاة',
      relevanceScore: 0.95,
      type: 'fatwa'
    },
    {
      id: 1002,
      title: 'زكاة الأموال المدخرة',
      category: 'فتاوى الزكاة',
      relevanceScore: 0.88,
      type: 'fatwa'
    },
    {
      id: 1003,
      title: 'صيام الحامل والمرضع',
      category: 'فتاوى الصوم',
      relevanceScore: 0.82,
      type: 'fatwa'
    },
    {
      id: 2001,
      title: 'فتاوى الصلاة',
      category: 'فتاوى العبادات',
      relevanceScore: 0.90,
      type: 'category'
    },
    {
      id: 1004,
      title: 'أحكام النكاح في الإسلام',
      category: 'فتاوى النكاح',
      relevanceScore: 0.78,
      type: 'fatwa'
    }
  ];

  // Filter by query (simple contains check)
  return mockSuggestions
    .filter(suggestion => 
      suggestion.title.includes(query) || 
      suggestion.category.includes(query)
    )
    .slice(0, 5);
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  className,
  placeholder,
  autoFocus = false,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const { language } = useLanguage();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Use mock data for development
        const mockSuggestions = generateMockSuggestions(searchQuery);
        setSuggestions(mockSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search failed:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      setIsLoading(true);
      performSearch(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigateToSearch(query.trim());
    }
  };

  // Navigate to search results
  const navigateToSearch = (searchQuery: string, categoryId?: number) => {
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    if (categoryId) {
      params.set('categoryId', categoryId.toString());
    }
    
    navigate(`/dashboard?${params.toString()}`);
    setShowSuggestions(false);
    if (onClose) onClose();
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'fatwa') {
      navigate(`/fatwa/${suggestion.id}`);
    } else {
      navigateToSearch(query, suggestion.id);
    }
    setShowSuggestions(false);
    if (onClose) onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (query.trim()) {
          navigateToSearch(query.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        if (onClose) onClose();
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const searchPlaceholder = placeholder || t('search.global', language);

  return (
    <div ref={searchRef} className={cn('relative w-full max-w-2xl', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="text-lg py-3 px-4 pe-20 shadow-lg border-2 focus:border-islamic-gold"
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          rightIcon={
            <div className="flex items-center gap-2">
              {isLoading && <LoadingSpinner size="sm" />}
              {query && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                disabled={!query.trim()}
                className="bg-islamic-gold hover:bg-islamic-gold-dark text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.search', language)}
              </button>
            </div>
          }
        />
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-neutral-500 px-2 py-1 border-b border-neutral-100 mb-2">
              {t('common.results', language)} ({suggestions.length})
            </div>
            
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={cn(
                  'w-full text-start p-3 rounded-lg hover:bg-neutral-50 transition-colors',
                  selectedIndex === index && 'bg-islamic-gold bg-opacity-10 border border-islamic-gold'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {suggestion.type === 'fatwa' ? (
                        <svg className="w-4 h-4 text-islamic-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-islamic-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      )}
                      <span className="font-medium text-neutral-800 truncate">
                        {suggestion.title}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 truncate">
                      {suggestion.category}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-islamic-gold font-medium">
                      {Math.round(suggestion.relevanceScore * 100)}%
                    </span>
                    <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
          <div className="p-4 text-center text-neutral-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">{t('common.noResults', language)}</p>
            <p className="text-xs text-neutral-400 mt-1">
              {language === 'ar' ? 'جرب كلمات مختلفة' : 'Try different keywords'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};