import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@contexts/LanguageContext';
import { useAuth } from '@contexts/AuthContext';
import { fatwaApi } from '@utils/api';
import type { Fatwa, SearchResult } from '@types/index';
import { LoadingSpinner } from '@components/ui';
import { Header } from '@components/layout/Header';

export const FatwaDetailPage: React.FC = () => {
  const { fatwaId } = useParams<{ fatwaId: string }>();
  const navigate = useNavigate();
  const { language, t, isRTL } = useTranslation();
  const { user } = useAuth();

  const [fatwa, setFatwa] = useState<Fatwa | null>(null);
  const [similarFatwas, setSimilarFatwas] = useState<SearchResult[]>([]);
  const [isLoadingFatwa, setIsLoadingFatwa] = useState(true);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug component mounting
  console.log('FatwaDetailPage mounted with fatwaId:', fatwaId);

  useEffect(() => {
    console.log('useEffect triggered with fatwaId:', fatwaId, 'language:', language);
    if (fatwaId) {
      loadFatwa();
      // loadSimilarFatwas(); // TEMPORARILY DISABLED
    } else {
      console.log('No fatwaId provided');
    }
  }, [fatwaId, language]);

  const loadFatwa = async () => {
    try {
      console.log('Loading fatwa:', fatwaId);
      setIsLoadingFatwa(true);
      setError(null);
      const response = await fatwaApi.getById(Number(fatwaId), language) as any;
      console.log('API response:', response);
      
      // Handle API response format - convert to expected Fatwa format
      const fatwa: Fatwa = {
        FatwaId: response.FatwaId,
        TitleAr: response.Title || response.TitleAr,
        TitleEn: response.TitleEn,
        QuestionAr: response.Question || response.QuestionAr,
        QuestionEn: response.QuestionEn,
        AnswerAr: response.Answer || response.AnswerAr,
        AnswerEn: response.AnswerEn,
        Category: response.Category,
        Tags: response.Tags || [],
        Language: response.Language,
        CreatedAt: response.CreatedAt,
        UpdatedAt: response.UpdatedAt
      };
      
      console.log('Converted fatwa:', fatwa);
      setFatwa(fatwa);
    } catch (error) {
      console.error('Failed to load fatwa:', error);
      setError(t('fatwaNotFound'));
    } finally {
      setIsLoadingFatwa(false);
    }
  };

  const loadSimilarFatwas = async () => {
    try {
      setIsLoadingSimilar(true);
      const response = await fatwaApi.getSimilar(Number(fatwaId), {
        language,
        pageSize: 5
      }) as any;
      
      // Handle different response formats
      let fatwas: SearchResult[] = [];
      
      if (Array.isArray(response)) {
        // API returns array of Fatwa objects directly, need to wrap in SearchResult format
        fatwas = response
          .filter(fatwa => fatwa && fatwa.FatwaId)
          .map(fatwa => ({
            Fatwa: {
              FatwaId: fatwa.FatwaId,
              TitleAr: fatwa.Title || fatwa.TitleAr,
              TitleEn: fatwa.TitleEn,
              QuestionAr: fatwa.Question || fatwa.QuestionAr,
              QuestionEn: fatwa.QuestionEn,
              AnswerAr: fatwa.Answer || fatwa.AnswerAr,
              AnswerEn: fatwa.AnswerEn,
              Category: fatwa.Category,
              Tags: fatwa.Tags || [],
              CreatedAt: fatwa.CreatedAt,
              UpdatedAt: fatwa.UpdatedAt
            },
            RelevanceScore: 1.0 // Default relevance score for similar fatwas
          }));
      } else if (response && response.Results && Array.isArray(response.Results)) {
        // API returns SearchResult format
        fatwas = response.Results.filter(item => item && item.Fatwa && item.Fatwa.FatwaId);
      }
      
      setSimilarFatwas(fatwas);
    } catch (error) {
      console.error('Failed to load similar fatwas:', error);
      setSimilarFatwas([]);
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const handleSimilarFatwaClick = (similarFatwaId: number) => {
    if (similarFatwaId !== Number(fatwaId)) {
      navigate(`/fatwa/${similarFatwaId}`);
    }
  };

  const handleCategoryClick = () => {
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  };

  const renderFatwaContent = () => {
    if (isLoadingFatwa) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner />
          <p className="mt-4 text-neutral-600">{t('loadingFatwa')}...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-600 mb-2">{t('error')}</h2>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-islamic-gold hover:bg-islamic-gold-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('backToHome')}
          </button>
        </div>
      );
    }

    if (!fatwa) {
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-600 mb-2">No fatwa data</h2>
          <p className="text-neutral-500 mb-6">Fatwa data could not be loaded</p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-islamic-gold hover:bg-islamic-gold-dark text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('backToHome')}
          </button>
        </div>
      );
    }

    const title = language === 'ar' 
      ? (fatwa.TitleAr || fatwa.Title || 'No Title')
      : (fatwa.TitleEn || fatwa.Title || fatwa.TitleAr || 'No Title');
    const question = language === 'ar' 
      ? (fatwa.QuestionAr || fatwa.Question || '')
      : (fatwa.QuestionEn || fatwa.Question || fatwa.QuestionAr || '');
    const answer = language === 'ar' 
      ? (fatwa.AnswerAr || fatwa.Answer || '')
      : (fatwa.AnswerEn || fatwa.Answer || fatwa.AnswerAr || '');

    return (
      <div className="max-w-4xl mx-auto">
        {/* Beautiful Islamic Header */}
        <div className="relative bg-gradient-to-r from-islamic-blue to-islamic-blue-dark rounded-2xl text-white p-8 mb-8 overflow-hidden">
          {/* Islamic pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4AF37' fill-opacity='0.4'%3E%3Cpath d='M20 20c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10-10-4.5-10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px'
          }}></div>
          
          <div className="relative z-10">
            <h1 className={`text-3xl md:text-4xl font-bold mb-6 leading-tight ${
              isRTL ? 'text-right font-arabic' : 'text-left font-english'
            }`}>
              {title}
            </h1>
            
            {/* Meta information */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <svg className="w-5 h-5 text-islamic-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-medium">{t('category')}</span>
                <button 
                  className="text-islamic-gold hover:text-islamic-gold-light font-semibold transition-colors"
                  onClick={handleCategoryClick}
                >
                  {fatwa.Category}
                </button>
              </div>
              
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <svg className="w-5 h-5 text-islamic-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">{t('date')}</span>
                <span className="text-islamic-gold-light">{formatDate(fatwa.CreatedAt)}</span>
              </div>
              
              {fatwa.Tags && fatwa.Tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-islamic-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div className="flex flex-wrap gap-1">
                    {fatwa.Tags.map((tag, index) => (
                      <span key={index} className="bg-white/20 text-white px-2 py-1 rounded text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-islamic-gold/10 to-islamic-gold/5 p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-islamic-gold rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold text-islamic-blue ${
                isRTL ? 'font-arabic' : 'font-english'
              }`}>
                {t('question') || 'السؤال'}
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className={`text-lg leading-relaxed text-neutral-700 ${
              isRTL ? 'text-right font-arabic' : 'text-left font-english'
            }`}>
              {question?.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Answer Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-islamic-blue/10 to-islamic-blue/5 p-6 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-islamic-blue rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className={`text-2xl font-bold text-islamic-blue ${
                isRTL ? 'font-arabic' : 'font-english'
              }`}>
                {t('answer') || 'الجواب'}
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className={`text-lg leading-relaxed text-neutral-700 mb-6 ${
              isRTL ? 'text-right font-arabic' : 'text-left font-english'
            }`}>
              {answer?.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">{paragraph}</p>
              ))}
            </div>
            
            {/* Scholar Signature */}
            <div className="text-center pt-6 border-t border-neutral-200">
              <div className="inline-block bg-gradient-to-r from-islamic-blue to-islamic-blue-dark text-white px-8 py-4 rounded-xl shadow-lg">
                <span className="text-xl font-bold font-arabic tracking-wide">والله أعلم</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <button 
            className="flex items-center gap-2 bg-islamic-gold hover:bg-islamic-gold-dark text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
            onClick={() => window.print()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('print') || 'طباعة'}
          </button>
          
          <button 
            className="flex items-center gap-2 bg-islamic-blue hover:bg-islamic-blue-dark text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
            onClick={() => navigator.share?.({
              title: title,
              text: `${question}\n\n${answer}`,
              url: window.location.href
            }) || navigator.clipboard?.writeText(window.location.href)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {t('share') || 'مشاركة'}
          </button>
          
          <button 
            className="flex items-center gap-2 bg-neutral-600 hover:bg-neutral-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
            onClick={() => navigate('/')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {t('backToHome') || 'العودة للرئيسية'}
          </button>
        </div>
      </div>
    );
  };

  const renderSimilarFatwas = () => {
    // TEMPORARILY DISABLED - Debugging main fatwa display first
    return (
      <div style={{padding: '20px', background: '#f0f0f0', margin: '10px'}}>
        <h3>Similar Fatwas (Temporarily Disabled)</h3>
        <p>Similar fatwas section disabled for debugging</p>
      </div>
    );
  };

  // Create breadcrumb items for the Header
  const breadcrumbItems = [
    { label: t('nav.home'), path: '/' },
    { label: t('fatwaDetails') }
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-islamic-ivory via-white to-neutral-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Header 
        title={t('fatwaDetails')}
        subtitle={fatwa ? (language === 'ar' ? fatwa.TitleAr : fatwa.TitleEn) : ''}
        breadcrumbItems={breadcrumbItems}
        variant="islamic"
      />

      {/* Main content with proper spacing */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {renderFatwaContent()}
      </main>

      {/* Islamic Footer */}
      <footer className="bg-islamic-blue text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 bg-islamic-gold hover:bg-islamic-gold-dark text-islamic-blue px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('goBack')}
            </button>
            
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t('backToHome')}
            </button>
            
            {!user && (
              <button 
                className="flex items-center gap-2 bg-islamic-gold hover:bg-islamic-gold-dark text-islamic-blue px-4 py-2 rounded-lg font-semibold transition-colors"
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