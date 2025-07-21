import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useTranslation } from '@contexts/LanguageContext';
import { LoadingSpinner } from '@components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <LoadingSpinner size="lg" text={t('common.loading')} />
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname + location.search }}
        replace 
      />
    );
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">
            {t('auth.unauthorized')}
          </h2>
          
          <p className="text-neutral-600 mb-6">
            {t('auth.insufficientPermissions')}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-islamic-gold hover:bg-islamic-gold-dark text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t('common.back')}
            </button>
            
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  // Render the protected content
  return <>{children}</>;
};