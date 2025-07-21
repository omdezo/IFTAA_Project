import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@utils/index';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = false,
  className
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex flex-1 relative">
        
        {/* Sidebar */}
        {showSidebar && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={closeSidebar}
              />
            )}

            {/* Mobile Sidebar */}
            <div className={cn(
              'fixed top-16 start-0 bottom-0 z-50 lg:hidden transition-transform duration-300',
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
              <Sidebar 
                isOpen={true}
                onClose={closeSidebar}
                className="h-full shadow-xl"
              />
            </div>

            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={cn(
                'fixed top-20 start-4 z-30 lg:hidden bg-islamic-gold text-white p-2 rounded-lg shadow-lg transition-all duration-300 hover:bg-islamic-gold-dark',
                isSidebarOpen && 'opacity-0 pointer-events-none'
              )}
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        )}

        {/* Main Content */}
        <main className={cn(
          'flex-1 flex flex-col min-w-0',
          showSidebar && 'lg:ps-0', // Remove padding since sidebar is absolute positioned
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

// Specialized layout components
interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  className
}) => {
  return (
    <Layout showSidebar={true} className={className}>
      {children}
    </Layout>
  );
};

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  className
}) => {
  return (
    <Layout className={className}>
      <div className="bg-gradient-to-r from-islamic-blue to-islamic-blue-dark text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-xl font-bold">لوحة الإدارة</h1>
          </div>
        </div>
      </div>
      {children}
    </Layout>
  );
};

interface SimpleLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  className
}) => {
  return (
    <Layout className={className}>
      {children}
    </Layout>
  );
};