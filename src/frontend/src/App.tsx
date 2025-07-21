import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import { LanguageProvider } from '@contexts/LanguageContext';
import { ProtectedRoute } from '@components/ProtectedRoute';

// Pages
import { HomePage } from '@pages/HomePage';
import { CategoryPage } from '@pages/CategoryPage';
import { FatwaDetailPage } from '@pages/FatwaDetailPage';
import { LoginPage } from '@pages/LoginPage';
import { AdminPage } from '@pages/AdminPage';
import { NotFoundPage } from '@pages/NotFoundPage';

// Global CSS
import './index.css';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/category/:categoryId" element={<CategoryPage />} />
              <Route path="/fatwa/:fatwaId" element={<FatwaDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Admin Only Routes */}
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirects */}
              <Route path="/home" element={<Navigate to="/" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;