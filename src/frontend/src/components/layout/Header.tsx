import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useTranslation } from '@contexts/LanguageContext';
import { Button } from '@components/ui';
import { cn } from '@utils/index';

interface HeaderProps {
  className?: string;
  title?: string;
  subtitle?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: { label: string; path?: string }[];
  variant?: 'default' | 'islamic';
}

export const Header: React.FC<HeaderProps> = ({ 
  className,
  title,
  subtitle,
  showBreadcrumb = true,
  breadcrumbItems = [],
  variant = 'islamic'
}) => {
  const { user, logout } = useAuth();
  const { language, t, isRTL, toggleLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const defaultBreadcrumb = [
    { label: t('nav.home'), path: '/' },
    ...(location.pathname !== '/' ? [{ label: title || '' }] : [])
  ];

  const finalBreadcrumb = breadcrumbItems.length > 0 ? breadcrumbItems : defaultBreadcrumb;

  const isIslamicVariant = variant === 'islamic';

  return (
    <header className={cn(
      'sticky top-0 z-50 shadow-lg',
      isIslamicVariant 
        ? 'bg-gradient-to-r from-islamic-blue to-islamic-blue-dark text-white'
        : 'bg-white border-b border-neutral-200 text-neutral-700',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              {/* IFTAA Book Logo */}
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isIslamicVariant
                  ? "bg-white/10"
                  : "bg-gradient-to-br from-islamic-gold to-islamic-gold-dark"
              )}>
                <img 
                  src="/logo.svg" 
                  alt="IFTAA Logo" 
                  className="w-8 h-8"
                />
              </div>
              
              <div className="hidden sm:block">
                <h1 className={cn(
                  "text-xl font-bold",
                  isIslamicVariant ? "text-white" : "text-islamic-blue",
                  isRTL ? 'font-arabic' : 'font-english'
                )}>
                  {language === 'ar' ? 'نظام الإفتاء' : 'IFTAA System'}
                </h1>
                <p className={cn(
                  "text-xs -mt-1",
                  isIslamicVariant ? "text-islamic-gold-light" : "text-neutral-600"
                )}>
                  {language === 'ar' ? 'نظام إدارة الفتاوى الإسلامية' : 'Islamic Fatwa Management'}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={cn(
                "hover:text-islamic-gold transition-colors font-medium",
                isIslamicVariant ? "text-white/90" : "text-neutral-700"
              )}
            >
              {t('nav.home')}
            </Link>
            
            
            {user?.role === 'admin' && (
              <Link 
                to="/admin" 
                className={cn(
                  "hover:text-islamic-gold transition-colors font-medium",
                  isIslamicVariant ? "text-white/90" : "text-neutral-700"
                )}
              >
                {t('nav.admin')}
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className={cn(
                "px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                isIslamicVariant
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "text-neutral-600 hover:text-islamic-gold border border-neutral-300 hover:border-islamic-gold"
              )}
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              {language === 'ar' ? 'EN' : 'عر'}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center gap-3">
                {/* Welcome message */}
                <div className={cn(
                  "hidden lg:block text-sm",
                  isRTL ? 'text-right' : 'text-left'
                )}>
                  <div className={cn(
                    "opacity-90",
                    isIslamicVariant ? "text-white" : "text-neutral-600"
                  )}>
                    {t('auth.welcome')}, {user.username}
                  </div>
                  <div className={cn(
                    "text-xs opacity-70 capitalize",
                    isIslamicVariant ? "text-islamic-gold-light" : "text-neutral-500"
                  )}>
                    {user.role}
                  </div>
                </div>

                {/* Admin panel (if admin) */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                      isIslamicVariant
                        ? "bg-white/10 hover:bg-white/20 text-white"
                        : "border border-neutral-300 hover:border-islamic-gold text-neutral-700 hover:text-islamic-gold"
                    )}
                  >
                    {t('nav.admin')}
                  </button>
                )}

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className={cn(
                    "px-3 py-2 rounded-lg transition-colors text-sm font-medium hidden sm:flex items-center gap-1",
                    isIslamicVariant
                      ? "bg-red-500/20 hover:bg-red-500/30 text-white"
                      : "border border-red-300 hover:border-red-500 text-red-600 hover:text-red-700"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <Link to="/login">
                <button className={cn(
                  "px-4 py-2 rounded-lg font-semibold transition-colors",
                  isIslamicVariant
                    ? "bg-islamic-gold text-islamic-blue hover:bg-islamic-gold-dark"
                    : "bg-islamic-gold text-white hover:bg-islamic-gold-dark"
                )}>
                  {t('nav.login')}
                </button>
              </Link>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Page title and breadcrumb section */}
      {(title || showBreadcrumb) && isIslamicVariant && (
        <div className="relative overflow-hidden border-t border-white/10">
          {/* Islamic pattern background */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.3'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20s20 8.954 20 20-8.954 20-20 20-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '120px 120px'
          }}></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
            {/* Breadcrumb */}
            {showBreadcrumb && finalBreadcrumb.length > 1 && (
              <nav className="flex items-center space-x-2 text-sm mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
                {finalBreadcrumb.map((item, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <svg className="w-4 h-4 text-white/60 mx-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.path ? (
                      <button
                        onClick={() => navigate(item.path!)}
                        className="text-islamic-gold-light hover:text-islamic-gold transition-colors"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <span className="text-islamic-gold font-medium">
                        {item.label}
                      </span>
                    )}
                  </div>
                ))}
              </nav>
            )}

            {/* Page title */}
            {title && (
              <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r from-islamic-gold to-islamic-gold-light bg-clip-text text-transparent mb-2 ${
                  isRTL ? 'font-arabic' : 'font-english'
                }`}>
                  {title}
                </h1>
                {subtitle && (
                  <p className={`text-xl text-islamic-gold-light max-w-3xl ${
                    isRTL ? 'font-arabic mr-auto' : 'font-english ml-auto'
                  }`}>
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className={cn(
          "md:hidden py-4 animate-fade-in",
          isIslamicVariant ? "border-t border-white/10" : "border-t border-neutral-200"
        )}>
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex flex-col gap-3">
              <Link 
                to="/" 
                className={cn(
                  "hover:text-islamic-gold transition-colors font-medium py-2",
                  isIslamicVariant ? "text-white/90" : "text-neutral-700"
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.home')}
              </Link>
              
              
              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={cn(
                    "hover:text-islamic-gold transition-colors font-medium py-2",
                    isIslamicVariant ? "text-white/90" : "text-neutral-700"
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.admin')}
                </Link>
              )}

              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "self-start mt-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2",
                    isIslamicVariant
                      ? "bg-red-500/20 hover:bg-red-500/30 text-white"
                      : "border border-red-300 hover:border-red-500 text-red-600 hover:text-red-700"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('nav.logout')}
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};