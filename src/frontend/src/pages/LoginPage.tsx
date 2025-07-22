import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useTranslation } from '@contexts/LanguageContext';
import { SimpleLayout } from '@components/layout';
import { Card, Input, Button } from '@components/ui';
import { cn } from '@utils/index';

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated, error, clearError } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from || '/admin';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, []);

  // Clear error when form data changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await login({
        username: formData.username.trim(),
        password: formData.password
      });
      
      // Navigation will happen automatically via useEffect when isAuthenticated becomes true
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const adminCredential = {
    role: 'Admin', 
    username: 'admin', 
    password: 'admin123'
  };

  const fillDemoCredentials = (username: string, password: string) => {
    setFormData({ username, password });
  };

  return (
    <SimpleLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden px-4 py-8">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-emerald-900/5 to-amber-900/5"></div>
          {/* Geometric Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="islamic-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M20 0L30 10L20 20L10 10Z M0 20L10 30L20 20L10 10Z M20 20L30 30L40 20L30 10Z M20 20L10 30L0 20L10 10Z" fill="currentColor"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-pattern)" className="text-emerald-600"/>
            </svg>
          </div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-islamic-blue via-islamic-gold to-islamic-blue-dark rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <img 
                src="/logo.svg" 
                alt="IFTAA Logo" 
                className="w-12 h-12"
              />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-islamic-blue via-islamic-gold to-islamic-blue-dark bg-clip-text text-transparent mb-3">
              {language === 'ar' ? 'إفتاء' : 'IFTAA'}
            </h1>
            
            <p className="text-neutral-600 text-lg">
              {language === 'ar' 
                ? 'نظام إدارة الفتاوى الإسلامية'
                : 'Islamic Fatwa Management System'
              }
            </p>
          </div>

          {/* Login Form */}
          <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/80 animate-slide-up">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Username */}
              <Input
                label={t('auth.username')}
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter your username'}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              {/* Password */}
              <Input
                label={t('auth.password')}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={!formData.username.trim() || !formData.password.trim()}
              >
                {t('auth.loginButton')}
              </Button>
            </form>
          </Card>

          {/* Demo Credentials */}
          <Card className="mt-6 bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50 border border-emerald-200 animate-fade-in-delayed" padding="sm">
            <h3 className="font-semibold text-emerald-800 mb-4 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
{language === 'ar' ? 'دخول الإدارة' : 'Admin Login'}
            </h3>
            
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials(adminCredential.username, adminCredential.password)}
                  className={cn(
                    'w-full text-start p-3 border-2 rounded-xl hover:scale-105 transition-all duration-300 group',
                    formData.username === adminCredential.username 
                      ? 'border-islamic-gold bg-islamic-gold/10 shadow-lg' 
                      : 'border-neutral-200 bg-white hover:border-islamic-gold hover:shadow-md'
                  )}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="font-medium text-sm text-neutral-800 group-hover:text-islamic-gold">
                      {adminCredential.role}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 font-mono">
                    {adminCredential.username}
                  </div>
                </button>
              </div>
            </div>
            
            <p className="text-xs text-neutral-600 text-center mt-4 flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
{language === 'ar' 
                ? 'انقر لملء بيانات الإدارة تلقائياً'
                : 'Click to auto-fill admin credentials'
              }
            </p>
          </Card>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link 
              to="/"
              className="text-islamic-gold hover:text-islamic-gold-dark font-medium transition-colors"
            >
              {language === 'ar' ? '← العودة للرئيسية' : '← Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    </SimpleLayout>
  );
};