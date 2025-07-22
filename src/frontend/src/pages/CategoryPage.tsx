import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@contexts/LanguageContext';
import { useAuth } from '@contexts/AuthContext';
import { categoryApi, fatwaApi } from '@utils/api';
import type { CategoryHierarchy, PaginatedSearchResponse, SearchResult } from '@types/index';
import { LoadingSpinner, Pagination } from '@components/ui';
import { Header } from '@components/layout/Header';

export const CategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, t, isRTL } = useTranslation();
  const { user } = useAuth();

  const categoryName = searchParams.get('name') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categoryFatwas, setCategoryFatwas] = useState<SearchResult[]>([]);
  const [subcategories, setSubcategories] = useState<CategoryHierarchy[]>([]);
  const [isLoadingFatwas, setIsLoadingFatwas] = useState(true);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchPagination, setSearchPagination] = useState({
    page: 1,
    pageSize: 10,
    totalResults: 0,
    totalPages: 0
  });
  const [parentCategory, setParentCategory] = useState<CategoryHierarchy | null>(null);
  const [siblingCategories, setSiblingCategories] = useState<CategoryHierarchy[]>([]);
  const [currentCategory, setCurrentCategory] = useState<CategoryHierarchy | null>(null);

  useEffect(() => {
    if (categoryId) {
      loadCategoryData();
      loadSubcategories();
      loadParentAndSiblings();
    }
  }, [categoryId, currentPage, language]);

  const loadCategoryData = async () => {
    try {
      setIsLoadingFatwas(true);
      const response = await categoryApi.getFatwas(Number(categoryId), {
        page: currentPage,
        pageSize: 20,
        language
      }) as any; // Use any to handle both response formats
      
      // Handle both response formats: new (Results) and current (fatwas)
      let fatwas = response.Results || [];
      const totalPages = response.TotalPages || response.totalPages || 1;
      
      // If we get the old format (fatwas array), transform it to SearchResult format
      if (response.fatwas && !response.Results) {
        fatwas = response.fatwas.map((fatwa: any) => ({
          Fatwa: {
            FatwaId: fatwa.fatwaId,
            TitleAr: fatwa.titleAr,
            TitleEn: fatwa.titleEn,
            QuestionAr: fatwa.questionAr,
            QuestionEn: fatwa.questionEn,
            AnswerAr: fatwa.answerAr,
            AnswerEn: fatwa.answerEn,
            Category: fatwa.category,
            Tags: fatwa.tags || [],
            CreatedAt: fatwa.createdAt,
            UpdatedAt: fatwa.updatedAt
          },
          RelevanceScore: 1.0
        }));
      }
      
      setCategoryFatwas(fatwas);
      setTotalPages(totalPages);
    } catch (error) {
      console.error('Failed to load category fatwas:', error);
      setCategoryFatwas([]);
    } finally {
      setIsLoadingFatwas(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      setIsLoadingSubcategories(true);
      const response = await categoryApi.getChildren(Number(categoryId), language) as any[];
      
      // Convert CategoryDto format to CategoryHierarchy format
      const subcategories: CategoryHierarchy[] = (response || []).map((cat: any) => ({
        Id: cat.Id || cat.id,
        Title: cat.Title || cat.title,
        TitleEn: cat.TitleEn || cat.titleEn || cat.title_en, // Handle multiple possible field names
        ParentId: cat.ParentId || cat.parentId,
        Description: cat.Description || cat.description || '',
        DescriptionEn: cat.DescriptionEn || cat.descriptionEn || cat.description_en,
        Children: [], // Children will be loaded when needed
        IsActive: cat.IsActive !== undefined ? cat.IsActive : (cat.is_active !== undefined ? cat.is_active : true),
        FatwaCount: cat.FatwaCount || cat.fatwaCount || 0
      }));
      
      setSubcategories(subcategories);
    } catch (error) {
      console.error('Failed to load subcategories:', error);
      setSubcategories([]);
    } finally {
      setIsLoadingSubcategories(false);
    }
  };

  const loadParentAndSiblings = async () => {
    try {
      // Get the full category hierarchy to find parent and siblings
      const hierarchy = await categoryApi.getHierarchy(language) as CategoryHierarchy[];
      
      // Find current category and its parent
      let foundCurrentCategory: CategoryHierarchy | null = null;
      let parent: CategoryHierarchy | null = null;
      
      // Search in top-level categories
      for (const cat of hierarchy) {
        if (cat.Id === Number(categoryId)) {
          foundCurrentCategory = cat;
          break;
        }
        // Search in children
        if (cat.Children) {
          for (const child of cat.Children) {
            if (child.Id === Number(categoryId)) {
              foundCurrentCategory = child;
              parent = cat;
              break;
            }
          }
        }
        if (foundCurrentCategory) break;
      }
      
      setCurrentCategory(foundCurrentCategory);
      setParentCategory(parent);
      
      // If we found a parent, get all its children as siblings
      if (parent && parent.Children) {
        setSiblingCategories(parent.Children.filter(child => child.Id !== Number(categoryId)));
      } else {
        setSiblingCategories([]);
      }
    } catch (error) {
      console.error('Failed to load parent and siblings:', error);
      setCurrentCategory(null);
      setParentCategory(null);
      setSiblingCategories([]);
    }
  };

  const handleCategorySearch = async (query: string = searchQuery, page: number = 1) => {
    console.log('=== SEARCH FUNCTION CALLED ===');
    console.log('Query:', query);
    console.log('CategoryId:', categoryId);
    
    if (!query.trim()) {
      console.log('Empty query, clearing results');
      setSearchResults([]);
      setHasSearched(false);
      setSearchPagination(prev => ({ ...prev, page: 1, totalResults: 0, totalPages: 0 }));
      return;
    }

    console.log('Starting search...');
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const searchParams = {
        query,
        categoryId: categoryId && !isNaN(Number(categoryId)) ? Number(categoryId) : undefined,
        language,
        page,
        pageSize: searchPagination.pageSize
      };

      console.log('Search params:', searchParams);
      
      const response = await fatwaApi.search(searchParams) as PaginatedSearchResponse;
      
      console.log('Search response:', response);
      console.log('Response.Results:', response.Results);
      console.log('Response.Results length:', response.Results?.length);
      
      const results = response.Results || [];
      console.log('Setting search results:', results);
      
      setSearchResults(results);
      setSearchPagination({
        page: response.Page || page,
        pageSize: response.PageSize || searchPagination.pageSize,
        totalResults: response.TotalResults || 0,
        totalPages: response.TotalPages || 0
      });
      
      console.log('Search completed. hasSearched:', true, 'results count:', results.length);
    } catch (error) {
      console.error('Category search failed:', error);
      setSearchResults([]);
      setSearchPagination(prev => ({ ...prev, totalResults: 0, totalPages: 0 }));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= searchPagination.totalPages) {
      handleCategorySearch(searchQuery, newPage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCategorySearch();
    }
  };

  // Helper function to get translated category title
  const getCategoryTitle = (category: CategoryHierarchy) => {
    return language === 'ar' ? category.Title : (category.TitleEn || category.Title);
  };

  // Helper function to get current category title with proper translation
  const getCurrentCategoryTitle = () => {
    if (currentCategory) {
      return getCategoryTitle(currentCategory);
    }
    return categoryName; // Fallback to URL param
  };

  const handleSubcategoryClick = (subcategory: CategoryHierarchy) => {
    const title = getCategoryTitle(subcategory);
    navigate(`/category/${subcategory.Id}?name=${encodeURIComponent(title)}`);
  };

  const handleFatwaClick = (fatwaId: number) => {
    navigate(`/fatwa/${fatwaId}`);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const renderBreadcrumb = () => (
    <div className="breadcrumb">
      <button onClick={() => navigate('/')} className="breadcrumb-link">
        {t('home')}
      </button>
      <span className="breadcrumb-separator">{'>'}</span>
      <span className="breadcrumb-current">{categoryName}</span>
    </div>
  );

  const renderSiblingNavigation = () => {
    if (!parentCategory || siblingCategories.length === 0) return null;

    return (
      <section className="py-6 bg-gradient-to-r from-islamic-gold/5 to-islamic-blue/5 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-4">
            <h3 className={`text-lg font-semibold text-islamic-blue mb-2 ${ 
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {language === 'ar' 
                ? `فئات أخرى في ${getCategoryTitle(parentCategory)}`
                : `Other categories in ${getCategoryTitle(parentCategory)}`
              }
            </h3>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            {/* Parent category button */}
            <button
              className="px-4 py-2 bg-islamic-blue text-white rounded-lg hover:bg-islamic-blue-dark transition-colors font-medium text-sm"
              onClick={() => handleSubcategoryClick(parentCategory)}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
                </svg>
                {getCategoryTitle(parentCategory)}
              </span>
            </button>
            
            {/* Sibling category buttons */}
            {siblingCategories.map(sibling => (
              <button
                key={sibling.Id}
                className="px-4 py-2 bg-white border-2 border-islamic-gold text-islamic-gold hover:bg-islamic-gold hover:text-white transition-colors rounded-lg font-medium text-sm"
                onClick={() => handleSubcategoryClick(sibling)}
              >
                {getCategoryTitle(sibling)}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderSubcategories = () => {
    if (isLoadingSubcategories) {
      return (
        <section className="py-8 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col items-center justify-center py-8">
              <LoadingSpinner size="sm" />
              <p className="mt-4 text-neutral-600">{t('loadingSubcategories')}...</p>
            </div>
          </div>
        </section>
      );
    }

    if (subcategories.length === 0) return null;

    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className={`text-2xl font-bold text-islamic-blue mb-2 ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {language === 'ar' ? 'الفئات الفرعية' : 'Subcategories'}
            </h3>
            <div className="w-20 h-1 bg-gradient-to-r from-islamic-gold to-islamic-gold-light rounded-full mx-auto"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subcategories.map(subcategory => (
              <div
                key={subcategory.Id}
                className="group bg-white hover:bg-islamic-ivory rounded-lg border-2 border-neutral-200 hover:border-islamic-gold transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg overflow-hidden"
                onClick={() => handleSubcategoryClick(subcategory)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-semibold text-islamic-blue group-hover:text-islamic-gold transition-colors ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}>
                      {getCategoryTitle(subcategory)}
                    </h4>
                    <div className="w-6 h-6 rounded-full bg-islamic-gold/10 flex items-center justify-center group-hover:bg-islamic-gold group-hover:text-white transition-all">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Subcategory info */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{subcategory.FatwaCount || 0} {language === 'ar' ? 'فتوى' : 'fatwas'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-islamic-gold">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <span>{language === 'ar' ? 'فئة فرعية' : 'Subcategory'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderFatwaCard = (result: SearchResult) => {
    // Handle both API response formats
    const title = language === 'ar' 
      ? (result.Fatwa.TitleAr || result.Fatwa.Title || '')
      : (result.Fatwa.TitleEn || result.Fatwa.Title || result.Fatwa.TitleAr || '');
    
    const question = language === 'ar' 
      ? (result.Fatwa.QuestionAr || result.Fatwa.Question || '')
      : (result.Fatwa.QuestionEn || result.Fatwa.Question || result.Fatwa.QuestionAr || '');

    // Debug log to see what data we're getting
    if (!title && !question) {
      console.log('Empty fatwa card data:', result);
    }

    return (
      <div
        key={result.Fatwa.FatwaId}
        className="bg-white rounded-xl border border-neutral-200 hover:border-islamic-gold hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
        onClick={() => handleFatwaClick(result.Fatwa.FatwaId)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-3">
            <h4 className={`text-lg font-bold text-islamic-blue group-hover:text-islamic-gold transition-colors flex-1 ${
              isRTL ? 'text-right' : 'text-left'
            }`}>
              {title || `Fatwa #${result.Fatwa.FatwaId}` || 'Untitled Fatwa'}
            </h4>
            {result.RelevanceScore && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold ml-3">
                {Math.round(result.RelevanceScore * 100)}%
              </span>
            )}
          </div>
          
          <p className={`text-neutral-600 mb-4 line-clamp-2 ${
            isRTL ? 'text-right' : 'text-left'
          }`}>
            {question ? `${question.substring(0, 200)}...` : 'No question available'}
          </p>
          
          <div className="flex items-center justify-between text-sm">
            <span className="bg-islamic-gold/10 text-islamic-blue px-3 py-1 rounded-full font-medium">
              {result.Fatwa.Category}
            </span>
            <span className="text-neutral-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
              {new Date(result.Fatwa.CreatedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!hasSearched) return null;

    if (isSearching) {
      return (
        <div className="mt-8 flex flex-col items-center py-8">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-600">{t('searching')}...</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="mt-8 text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-neutral-600">
            {language === 'ar' 
              ? `لم يتم العثور على نتائج في ${getCurrentCategoryTitle()}`
              : `No results found in ${getCurrentCategoryTitle()}`
            }
          </p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-islamic-blue">
            {language === 'ar' 
              ? `نتائج البحث في ${getCurrentCategoryTitle()}`
              : `Search Results in ${getCurrentCategoryTitle()}`
            }
            <span className="text-sm font-normal text-neutral-500 ml-2">
              ({searchResults.length} {language === 'ar' ? 'نتيجة' : 'results'})
            </span>
          </h3>
        </div>
        
        <div className="space-y-4 mb-8">
          {searchResults.map(renderFatwaCard)}
        </div>
        
        {/* Search Results Pagination */}
        {searchPagination.totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={searchPagination.page}
              totalPages={searchPagination.totalPages}
              onPageChange={handleSearchPageChange}
              showFirstLast={true}
              showPrevNext={true}
              maxVisible={5}
            />
          </div>
        )}
      </div>
    );
  };

  const renderCategoryFatwas = () => {
    if (hasSearched) return null;

    if (isLoadingFatwas) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-600">{t('loadingFatwas')}...</p>
        </div>
      );
    }

    if (categoryFatwas.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-lg text-neutral-600">
            {language === 'ar' 
              ? `لا توجد فتاوى في ${getCurrentCategoryTitle()}`
              : `No fatwas found in ${getCurrentCategoryTitle()}`
            }
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="text-center mb-8">
          <h3 className={`text-2xl font-bold text-islamic-blue mb-2 ${
            isRTL ? 'font-arabic' : 'font-english'
          }`}>
            {language === 'ar' 
              ? `فتاوى ${getCurrentCategoryTitle()}`
              : `Fatwas in ${getCurrentCategoryTitle()}`
            }
            <span className="text-sm font-normal text-neutral-500 ml-2">
              ({categoryFatwas.length} {language === 'ar' ? 'فتوى' : 'fatwas'})
            </span>
          </h3>
          <div className="w-20 h-1 bg-gradient-to-r from-islamic-gold to-islamic-gold-light rounded-full mx-auto"></div>
        </div>
        
        <div className="space-y-4 mb-8">
          {categoryFatwas.map(renderFatwaCard)}
        </div>
        
        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              showFirstLast={true}
              showPrevNext={true}
              maxVisible={5}
            />
          </div>
        )}
      </div>
    );
  };

  // Create breadcrumb items for the Header with proper hierarchy
  const createBreadcrumbItems = () => {
    const items = [{ label: t('nav.home'), path: '/' }];
    
    if (parentCategory) {
      // If this is a child category, show parent first
      const parentTitle = getCategoryTitle(parentCategory);
      items.push({ 
        label: parentTitle, 
        path: `/category/${parentCategory.Id}?name=${encodeURIComponent(parentTitle)}` 
      });
    }
    
    // Add current category with proper translation
    items.push({ label: getCurrentCategoryTitle() });
    
    return items;
  };

  const breadcrumbItems = createBreadcrumbItems();

  return (
    <div className={`min-h-screen bg-gradient-to-br from-islamic-ivory via-white to-neutral-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Use the new Header component */}
      <Header 
        title={getCurrentCategoryTitle()}
        subtitle={language === 'ar' 
          ? 'ابحث في هذه الفئة وجميع الفئات الفرعية'
          : 'Search in this category and all its subcategories'
        }
        breadcrumbItems={breadcrumbItems}
        variant="islamic"
      />

      {/* Category Navigation Helper */}
      <section className="py-6 bg-gradient-to-r from-islamic-blue/5 to-islamic-gold/5 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4">
          {parentCategory ? (
            // This is a subcategory
            <div className="bg-white rounded-lg p-4 shadow-sm border border-islamic-gold/20">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-islamic-gold/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-islamic-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600">
                      {language === 'ar' ? 'فئة فرعية' : 'Subcategory'}
                    </p>
                    <p className="font-semibold text-islamic-blue">
                      {language === 'ar' 
                        ? `جزء من: ${getCategoryTitle(parentCategory)}`
                        : `Part of: ${getCategoryTitle(parentCategory)}`
                      }
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleSubcategoryClick(parentCategory)}
                  className="flex items-center gap-2 bg-islamic-blue text-white px-4 py-2 rounded-lg hover:bg-islamic-blue-dark transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  {language === 'ar' ? 'عرض الفئة الرئيسية' : 'View Main Category'}
                </button>
              </div>
            </div>
          ) : (
            // This is a main category
            <div className="bg-white rounded-lg p-4 shadow-sm border border-islamic-blue/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-islamic-blue/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-islamic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-neutral-600">
                    {language === 'ar' ? 'فئة رئيسية' : 'Main Category'}
                  </p>
                  <p className="font-semibold text-islamic-blue">
                    {language === 'ar' 
                      ? 'تحتوي على فئات فرعية وفتاوى'
                      : 'Contains subcategories and fatwas'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Search Section */}
      <section className="py-8 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className={`text-2xl font-bold text-islamic-blue mb-2 ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {language === 'ar' 
                ? `البحث في ${getCurrentCategoryTitle()}`
                : `Search in ${getCurrentCategoryTitle()}`
              }
            </h2>
            <p className={`text-neutral-600 ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {language === 'ar' 
                ? 'ابحث في هذه الفئة وجميع الفئات الفرعية'
                : 'Search in this category and all its subcategories'
              }
            </p>
          </div>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === 'ar' 
                    ? `ابحث في ${getCurrentCategoryTitle()}...`
                    : `Search in ${getCurrentCategoryTitle()}...`
                  }
                  className={`w-full px-6 py-4 text-lg border-2 border-neutral-200 rounded-xl focus:border-islamic-gold focus:ring-4 focus:ring-islamic-gold/10 outline-none transition-all ${
                    isRTL ? 'text-right pr-12' : 'text-left pl-12'
                  }`}
                />
                <div className={`absolute top-1/2 transform -translate-y-1/2 text-neutral-400 ${
                  isRTL ? 'right-4' : 'left-4'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button 
                onClick={() => handleCategorySearch()}
                disabled={isSearching}
                className="bg-islamic-gold hover:bg-islamic-gold-dark text-white px-8 py-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {t('search')}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Search Results */}
          {renderSearchResults()}
        </div>
      </section>

      {/* Sibling Categories Navigation */}
      {renderSiblingNavigation()}

      {/* Subcategories with beautiful cards */}
      {renderSubcategories()}

      {/* Content Info Section */}
      <section className="py-6 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-islamic-blue/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-islamic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-700">
                  {parentCategory 
                    ? (language === 'ar' 
                        ? `عرض الفتاوى من فئة "${getCurrentCategoryTitle()}" فقط. للاطلاع على جميع فتاوى الفئة الرئيسية، انقر على الرابط أعلاه.`
                        : `Showing fatwas from "${getCurrentCategoryTitle()}" subcategory only. To view all fatwas from the main category, click the link above.`
                      )
                    : (language === 'ar'
                        ? `عرض جميع الفتاوى من فئة "${getCurrentCategoryTitle()}" وجميع الفئات الفرعية التابعة لها.`
                        : `Showing all fatwas from "${getCurrentCategoryTitle()}" category and all its subcategories.`
                      )
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Fatwas */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {renderCategoryFatwas()}
        </div>
      </section>

      {/* Islamic Footer */}
      <footer className="bg-islamic-blue text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 bg-islamic-gold hover:bg-islamic-gold-dark text-islamic-blue px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('backToHome')}
            </button>
            
            {!user && (
              <button 
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                onClick={() => navigate('/login')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t('adminLogin')}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CategoryPage;