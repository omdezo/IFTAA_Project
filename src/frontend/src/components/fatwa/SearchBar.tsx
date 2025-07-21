import React, { useState, useCallback } from 'react';
import { Input, Button, Select } from '@components/ui';
import { useTranslation } from '@contexts/LanguageContext';
import { debounce } from '@utils/index';

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  isLoading?: boolean;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  showFilters?: boolean;
  placeholder?: string;
  className?: string;
}

export interface SearchFilters {
  categoryId?: number;
  language?: 'ar' | 'en';
  pageSize?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading = false,
  initialQuery = '',
  initialFilters = {},
  showFilters = true,
  placeholder,
  className
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { t, language } = useTranslation();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, searchFilters: SearchFilters) => {
      onSearch(searchQuery, searchFilters);
    }, 300),
    [onSearch]
  );

  // Handle query change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery, filters);
  };

  // Handle filter change
  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    debouncedSearch(query, newFilters);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, filters);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setFilters({});
    onSearch('', {});
  };

  const pageSizeOptions = [
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' }
  ];

  const languageOptions = [
    { value: 'ar', label: t('fatwa.arabic') },
    { value: 'en', label: t('fatwa.english') }
  ];

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Main Search Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder={placeholder || t('dashboard.searchPlaceholder')}
              value={query}
              onChange={handleQueryChange}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              rightIcon={
                query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )
              }
              isLoading={isLoading}
            />
          </div>

          {/* Search Button */}
          <Button 
            type="submit" 
            isLoading={isLoading}
            disabled={!query.trim()}
          >
            <span className="hidden sm:inline">{t('common.search')}</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Button>

          {/* Advanced Filters Toggle */}
          {showFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="hidden sm:flex"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              {language === 'ar' ? 'فلاتر' : 'Filters'}
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && showAdvanced && (
          <div className="bg-neutral-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-neutral-800 mb-3">
              {language === 'ar' ? 'الفلاتر المتقدمة' : 'Advanced Filters'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Language Filter */}
              <Select
                label={t('fatwa.language')}
                value={filters.language || language}
                onChange={(e) => handleFilterChange('language', e.target.value as 'ar' | 'en')}
                options={languageOptions}
              />

              {/* Page Size */}
              <Select
                label={t('pagination.itemsPerPage')}
                value={filters.pageSize || 10}
                onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
                options={pageSizeOptions}
              />

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilters({});
                    debouncedSearch(query, {});
                  }}
                  className="w-full"
                >
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Filters */}
        {showFilters && (
          <div className="sm:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              {language === 'ar' ? 'فلاتر متقدمة' : 'Advanced Filters'}
            </Button>
            
            {showAdvanced && (
              <div className="mt-4 space-y-3">
                <Select
                  label={t('fatwa.language')}
                  value={filters.language || language}
                  onChange={(e) => handleFilterChange('language', e.target.value as 'ar' | 'en')}
                  options={languageOptions}
                />
                
                <Select
                  label={t('pagination.itemsPerPage')}
                  value={filters.pageSize || 10}
                  onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
                  options={pageSizeOptions}
                />
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};