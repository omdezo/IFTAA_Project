import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@contexts/LanguageContext';
import { useAuth } from '@contexts/AuthContext';
import { categoryApi, fatwaApi } from '@utils/api';
import type { CategoryHierarchy, PaginatedSearchResponse, SearchResult } from '@types/index';
import { LoadingSpinner, Pagination } from '@components/ui';
import { Header } from '@components/layout/Header';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { language, t, isRTL } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalResults: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadCategories();
  }, [language]);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await categoryApi.getHierarchy(language) as CategoryHierarchy[];
      setCategories(response);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSearch = async (query: string = searchQuery, page: number = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setPagination(prev => ({ ...prev, page: 1, totalResults: 0, totalPages: 0 }));
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const response = await fatwaApi.search({
        query,
        language,
        page,
        pageSize: pagination.pageSize
      }) as PaginatedSearchResponse;
      
      setSearchResults(response.Results || []);
      setPagination({
        page: response.Page || 1,
        pageSize: response.PageSize || 10,
        totalResults: response.TotalResults || 0,
        totalPages: response.TotalPages || 0
      });
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setPagination(prev => ({ ...prev, totalResults: 0, totalPages: 0 }));
    } finally {
      setIsSearching(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      handleSearch(searchQuery, newPage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCategoryClick = (categoryId: number, categoryTitle: string) => {
    navigate(`/category/${categoryId}?name=${encodeURIComponent(categoryTitle)}`);
  };

  const handleFatwaClick = (fatwaId: number) => {
    navigate(`/fatwa/${fatwaId}`);
  };

  const renderCategoryCard = (category: CategoryHierarchy) => (
    <div 
      key={category.Id} 
      className="group relative bg-white hover:bg-islamic-ivory rounded-xl border-2 border-neutral-200 hover:border-islamic-gold transition-all duration-300 cursor-pointer shadow-md hover:shadow-xl overflow-hidden"
      onClick={() => handleCategoryClick(category.Id, category.Title)}
    >
      {/* Islamic pattern overlay */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-islamic-gold to-islamic-blue"></div>
      
      {/* Main category title */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl font-bold text-islamic-blue group-hover:text-islamic-gold transition-colors ${
            isRTL ? 'text-right' : 'text-left'
          }`}>
            {category.Title}
          </h3>
          <div className="w-8 h-8 rounded-full bg-islamic-gold/10 flex items-center justify-center group-hover:bg-islamic-gold group-hover:text-white transition-all">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {/* Children subcategories */}
        {category.Children && category.Children.length > 0 && (
          <div className="space-y-2">
            <div className="h-px bg-gradient-to-r from-islamic-gold/30 to-transparent mb-3"></div>
            <div className="grid gap-2">
              {category.Children.map(child => (
                <button 
                  key={child.Id} 
                  className={`w-full px-3 py-2 text-sm bg-neutral-50 hover:bg-islamic-gold/10 rounded-lg border border-neutral-200 hover:border-islamic-gold/30 transition-all duration-200 ${
                    isRTL ? 'text-right' : 'text-left'
                  } text-neutral-700 hover:text-islamic-blue font-medium`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryClick(child.Id, child.Title);
                  }}
                >
                  <span className="flex items-center justify-between">
                    <span>{child.Title}</span>
                    <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderSearchResults = () => {
    if (!hasSearched) return null;

    if (isSearching) {
      return (
        <div className="mt-8 flex flex-col items-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-600">{t('searching')}...</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="mt-8 text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-lg text-neutral-600">{t('noResultsFound')}</p>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-islamic-blue">
            {t('searchResults')} 
            <span className="text-sm font-normal text-neutral-500 ml-2">
              ({pagination.totalResults} {t('results')})
            </span>
          </h3>
          <div className="text-sm text-neutral-500">
            {language === 'ar' 
              ? `الصفحة ${pagination.page} من ${pagination.totalPages}`
              : `Page ${pagination.page} of ${pagination.totalPages}`
            }
          </div>
        </div>
        
        <div className="space-y-4">
          {searchResults.map((result, index) => (
            <div 
              key={result.Fatwa.FatwaId} 
              className="bg-white rounded-xl border border-neutral-200 hover:border-islamic-gold hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
              onClick={() => handleFatwaClick(result.Fatwa.FatwaId)}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h4 className={`text-lg font-bold text-islamic-blue group-hover:text-islamic-gold transition-colors flex-1 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}>
                    {language === 'ar' ? result.Fatwa.Title : result.Fatwa.TitleEn || result.Fatwa.Title}
                  </h4>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold ml-3">
                    {Math.round(result.RelevanceScore * 100)}%
                  </span>
                </div>
                
                <p className={`text-neutral-600 mb-4 line-clamp-2 ${
                  isRTL ? 'text-right' : 'text-left'
                }`}>
                  {language === 'ar' 
                    ? result.Fatwa.Question?.substring(0, 200) 
                    : result.Fatwa.QuestionEn?.substring(0, 200) || result.Fatwa.Question?.substring(0, 200)
                  }...
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="bg-islamic-gold/10 text-islamic-blue px-3 py-1 rounded-full font-medium">
                    {result.Fatwa.Category}
                  </span>
                  <span className="text-neutral-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(result.Fatwa.CreatedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-islamic-ivory via-white to-neutral-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Header variant="islamic" />
      
      {/* Islamic Hero Section with Pattern */}
      <header className="relative bg-gradient-to-r from-islamic-blue to-islamic-blue-dark text-white overflow-hidden">
        {/* Islamic geometric pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.3'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px'
          }}></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className={`text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-islamic-gold to-islamic-gold-light bg-clip-text text-transparent ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {t('iftaaTitle') || 'نظام الإفتاء الإسلامي'}
            </h1>
            <p className={`text-xl md:text-2xl text-islamic-gold-light max-w-3xl mx-auto ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {t('iftaaSubtitle') || 'منصة شاملة للفتاوى الإسلامية والأحكام الشرعية'}
            </p>
          </div>
          
          {user && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <span className="text-islamic-gold-light">{t('welcome')}, {user.username}!</span>
                {user.role === 'admin' && (
                  <button 
                    className="bg-islamic-gold hover:bg-islamic-gold-dark text-islamic-blue px-4 py-2 rounded-full font-semibold transition-colors"
                    onClick={() => navigate('/admin')}
                  >
                    {t('adminDashboard')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Enhanced Search Section */}
      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('searchPlaceholder') || 'ابحث في الفتاوى...'}
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
                onClick={() => handleSearch()}
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

      {/* Categories Section with Islamic Design */}
      <section className="py-16 bg-gradient-to-b from-white to-islamic-ivory">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold text-islamic-blue mb-4 ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {t('browseByCategory') || 'تصفح حسب الفئة'}
            </h2>
            <p className={`text-lg text-neutral-600 max-w-2xl mx-auto ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {t('categoryDescription') || 'اختر من فئات الفتاوى المختلفة للعثور على ما تبحث عنه'}
            </p>
            <div className="mt-6 w-24 h-1 bg-gradient-to-r from-islamic-gold to-islamic-gold-light rounded-full mx-auto"></div>
          </div>

          {isLoadingCategories ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LoadingSpinner />
              <p className="mt-4 text-neutral-600">{t('loadingCategories')}...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(renderCategoryCard)}
            </div>
          )}
        </div>
      </section>

      {/* Islamic Interactive Elements Section */}
      <section className="py-16 bg-gradient-to-br from-islamic-ivory via-white to-islamic-gold/5 relative overflow-hidden">
        {/* Floating Islamic Geometric Patterns */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated Islamic Stars */}
          <div className="absolute top-10 left-10 w-12 h-12 text-islamic-gold/20 animate-pulse">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full animate-spin-slow">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="absolute top-32 right-20 w-8 h-8 text-islamic-blue/15 animate-bounce">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="absolute bottom-20 left-1/4 w-10 h-10 text-islamic-gold/25 animate-pulse">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full animate-spin-reverse">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Islamic Quote Section */}
          <div className="text-center mb-12 animate-fade-in-up">
            <div className="mb-6">
              <div className="inline-block p-6 bg-white rounded-2xl shadow-lg border border-islamic-gold/20 hover:shadow-xl transition-all duration-500 hover:scale-105">
                <div className={`text-2xl font-bold text-islamic-blue mb-3 ${isRTL ? 'font-arabic' : 'font-english'}`}>
                  {language === 'ar' 
                    ? '"وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ"'
                    : '"And We sent you not except as a mercy to the worlds"'
                  }
                </div>
                <div className="text-islamic-gold font-medium">
                  {language === 'ar' ? 'سورة الأنبياء: 107' : 'Quran 21:107'}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Islamic Principles Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                titleAr: "الصدق والأمانة",
                titleEn: "Truth & Trust",
                descAr: "أساس التعامل في الإسلام",
                descEn: "Foundation of Islamic dealings"
              },
              {
                icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                titleAr: "المحبة والرحمة",
                titleEn: "Love & Mercy",
                descAr: "رحمة الله وسعت كل شيء",
                descEn: "Allah's mercy encompasses all"
              },
              {
                icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
                titleAr: "العلم والحكمة",
                titleEn: "Knowledge & Wisdom",
                descAr: "اطلبوا العلم من المهد إلى اللحد",
                descEn: "Seek knowledge from cradle to grave"
              }
            ].map((principle, index) => (
              <div 
                key={index}
                className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-500 border border-neutral-100 hover:border-islamic-gold/30 cursor-pointer transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-islamic-gold to-islamic-gold-light rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={principle.icon} />
                  </svg>
                </div>
                <h3 className={`text-lg font-bold text-islamic-blue mb-2 text-center ${isRTL ? 'font-arabic' : 'font-english'}`}>
                  {language === 'ar' ? principle.titleAr : principle.titleEn}
                </h3>
                <p className={`text-neutral-600 text-center text-sm ${isRTL ? 'font-arabic' : 'font-english'}`}>
                  {language === 'ar' ? principle.descAr : principle.descEn}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Islamic Footer */}
      <footer className="bg-islamic-blue text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <p className={`text-lg mb-6 ${
              isRTL ? 'font-arabic' : 'font-english'
            }`}>
              {t('footerText') || 'نظام الإفتاء الإسلامي - جميع الحقوق محفوظة'}
            </p>
            {!user && (
              <button 
                className="bg-islamic-gold hover:bg-islamic-gold-dark text-islamic-blue px-6 py-3 rounded-full font-semibold transition-colors"
                onClick={() => navigate('/login')}
              >
                {t('adminLogin')}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;