import React from 'react';
import { Link } from 'react-router-dom';
import { SimpleLayout } from '@components/layout';
import { Button } from '@components/ui';
import { useTranslation } from '@contexts/LanguageContext';

export const NotFoundPage: React.FC = () => {
  const { t, language } = useTranslation();

  return (
    <SimpleLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-4">
        <div className="max-w-md mx-auto text-center">
          
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-islamic-gold to-islamic-gold-dark rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg opacity-80">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h1 className="text-6xl font-bold text-islamic-blue mb-4">
              404
            </h1>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-4">
              {language === 'ar' ? 'الصفحة غير موجودة' : 'Page Not Found'}
            </h2>
            
            <p className="text-neutral-600 mb-6 leading-relaxed">
              {language === 'ar' 
                ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى موقع آخر.'
                : 'Sorry, the page you are looking for doesn\'t exist or has been moved to another location.'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Link to="/">
              <Button size="lg" className="w-full sm:w-auto">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {t('nav.home')}
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/dashboard">
                <Button variant="outline" className="w-full sm:w-auto">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t('nav.dashboard')}
                </Button>
              </Link>

              <button
                onClick={() => window.history.back()}
                className="text-islamic-gold hover:text-islamic-gold-dark font-medium transition-colors"
              >
                {t('common.back')}
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-neutral-200">
            <p className="text-sm text-neutral-500">
              {language === 'ar' 
                ? 'إذا كنت تعتقد أن هذا خطأ، يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.'
                : 'If you think this is an error, please try again or contact technical support.'
              }
            </p>
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
};