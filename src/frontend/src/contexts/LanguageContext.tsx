import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Language, Direction } from '@types/index';
import { storage } from '@utils/index';

// Translation dictionaries
const translations = {
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.dashboard': 'لوحة التحكم',
    'nav.admin': 'الإدارة',
    'nav.login': 'تسجيل الدخول',
    'nav.logout': 'تسجيل الخروج',
    'nav.profile': 'الملف الشخصي',
    
    // Common
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.create': 'إنشاء',
    'common.update': 'تحديث',
    'common.view': 'عرض',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.previous': 'السابق',
    'common.page': 'صفحة',
    'common.of': 'من',
    'common.results': 'نتيجة',
    'common.noResults': 'لا توجد نتائج',
    'common.selectLanguage': 'اختر اللغة',
    
    // Authentication
    'auth.login': 'تسجيل الدخول',
    'auth.username': 'اسم المستخدم',
    'auth.password': 'كلمة المرور',
    'auth.loginButton': 'دخول',
    'auth.loginError': 'خطأ في تسجيل الدخول',
    'auth.invalidCredentials': 'اسم المستخدم أو كلمة المرور غير صحيحة',
    'auth.welcome': 'مرحباً',
    'auth.unauthorized': 'غير مخول للوصول',
    'auth.insufficientPermissions': 'ليس لديك الصلاحية للوصول إلى هذه الصفحة',
    
    // Dashboard
    'dashboard.title': 'لوحة التحكم',
    'dashboard.categories': 'التصنيفات',
    'dashboard.allCategories': 'جميع التصنيفات',
    'dashboard.fatwas': 'الفتاوى',
    'dashboard.totalFatwas': 'إجمالي الفتاوى',
    'dashboard.recentFatwas': 'الفتاوى الحديثة',
    'dashboard.searchPlaceholder': 'ابحث في الفتاوى...',
    'dashboard.noFatwas': 'لا توجد فتاوى',
    
    // Fatwa
    'fatwa.title': 'عنوان الفتوى',
    'fatwa.question': 'السؤال',
    'fatwa.answer': 'الجواب',
    'fatwa.category': 'التصنيف',
    'fatwa.tags': 'العلامات',
    'fatwa.createdAt': 'تاريخ الإنشاء',
    'fatwa.updatedAt': 'تاريخ التحديث',
    'fatwa.id': 'رقم الفتوى',
    'fatwa.language': 'اللغة',
    'fatwa.arabic': 'العربية',
    'fatwa.english': 'الإنجليزية',
    'fatwa.similarFatwas': 'فتاوى مشابهة',
    'fatwa.relevanceScore': 'درجة الصلة',
    
    // Categories
    'category.worship': 'فتاوى العبادات',
    'category.prayer': 'فتاوى الصلاة',
    'category.zakat': 'فتاوى الزكاة',
    'category.fasting': 'فتاوى الصوم',
    'category.hajj': 'فتاوى الحج',
    'category.marriage': 'فتاوى النكاح',
    'category.transactions': 'فتاوى المعاملات',
    'category.noCategory': 'بدون تصنيف',
    
    // Admin
    'admin.title': 'لوحة الإدارة',
    'admin.createFatwa': 'إنشاء فتوى جديدة',
    'admin.editFatwa': 'تعديل الفتوى',
    'admin.deleteFatwa': 'حذف الفتوى',
    'admin.fatwaManagement': 'إدارة الفتاوى',
    'admin.systemStatus': 'حالة النظام',
    'admin.userManagement': 'إدارة المستخدمين',
    'admin.confirmDelete': 'هل أنت متأكد من حذف هذه الفتوى؟',
    'admin.deleteSuccess': 'تم حذف الفتوى بنجاح',
    'admin.createSuccess': 'تم إنشاء الفتوى بنجاح',
    'admin.updateSuccess': 'تم تحديث الفتوى بنجاح',
    
    // Forms
    'form.required': 'هذا الحقل مطلوب',
    'form.minLength': 'الحد الأدنى للطول',
    'form.maxLength': 'الحد الأقصى للطول',
    'form.invalidFormat': 'تنسيق غير صحيح',
    'form.pleaseSelect': 'يرجى الاختيار',
    'form.autoTranslate': 'ترجمة تلقائية',
    'form.reTranslate': 'إعادة ترجمة',
    
    // Pagination
    'pagination.first': 'الأولى',
    'pagination.last': 'الأخيرة',
    'pagination.showing': 'عرض',
    'pagination.to': 'إلى',
    'pagination.total': 'من إجمالي',
    'pagination.itemsPerPage': 'عنصر لكل صفحة',
    
    // System
    'system.connected': 'متصل',
    'system.disconnected': 'غير متصل',
    'system.database': 'قاعدة البيانات',
    'system.vectorDatabase': 'قاعدة البيانات الشعاعية',
    'system.status': 'الحالة',
    'system.healthy': 'جيد',
    'system.unhealthy': 'غير جيد',
    
    // Errors
    'error.networkError': 'خطأ في الشبكة',
    'error.serverError': 'خطأ في الخادم',
    'error.notFound': 'غير موجود',
    'error.unauthorized': 'غير مخول',
    'error.forbidden': 'ممنوع',
    'error.unknown': 'خطأ غير معروف',
    'error.tryAgain': 'حاول مرة أخرى',
    
    // Time
    'time.justNow': 'الآن',
    'time.minutesAgo': 'منذ دقائق',
    'time.hoursAgo': 'منذ ساعات',
    'time.daysAgo': 'منذ أيام',
    'time.weeksAgo': 'منذ أسابيع',
    'time.monthsAgo': 'منذ أشهر',
    
    // Missing Keys for New Pages
    'categoryStructureInitialized': 'تم تهيئة هيكل التصنيفات بنجاح',
    'categoryInitializationFailed': 'فشل في تهيئة هيكل التصنيفات',
    'confirmDeleteFatwa': 'هل أنت متأكد من حذف هذه الفتوى؟',
    'fatwaDeleted': 'تم حذف الفتوى بنجاح',
    'failedToDeleteFatwa': 'فشل في حذف الفتوى',
    'overview': 'نظرة عامة',
    'manageFatwas': 'إدارة الفتاوى',
    'createFatwa': 'إنشاء فتوى',
    'manageCategories': 'إدارة التصنيفات',
    'totalFatwas': 'إجمالي الفتاوى',
    'categories': 'التصنيفات',
    'systemStatus': 'حالة النظام',
    'online': 'متصل',
    'checking': 'جاري التحقق',
    'quickActions': 'إجراءات سريعة',
    'createNewFatwa': 'إنشاء فتوى جديدة',
    'initializeCategories': 'تهيئة التصنيفات',
    'fatwaManagement': 'إدارة الفتاوى',
    'refresh': 'تحديث',
    'loadingFatwas': 'جاري تحميل الفتاوى',
    'view': 'عرض',
    'delete': 'حذف',
    'noFatwasFound': 'لا توجد فتاوى',
    'fatwaCreationFormComingSoon': 'نموذج إنشاء الفتوى قريباً',
    'useApiDirectlyForNow': 'استخدم API مباشرة في الوقت الحالي',
    'categoryManagement': 'إدارة التصنيفات',
    'initializeCategoryStructure': 'تهيئة هيكل التصنيفات',
    'categoryManagementInfo': 'معلومات إدارة التصنيفات',
    'accessDenied': 'تم رفض الوصول',
    'adminAccessRequired': 'يتطلب صلاحية الإدارة',
    'backToHome': 'العودة للرئيسية',
    'home': 'الرئيسية',
    'adminDashboard': 'لوحة الإدارة',
    'adminDashboardSubtitle': 'إدارة النظام والفتاوى',
    'subcategories': 'التصنيفات الفرعية',
    'loadingSubcategories': 'جاري تحميل التصنيفات الفرعية',
    'searching': 'جاري البحث',
    'noResultsFound': 'لا توجد نتائج',
    'searchResults': 'نتائج البحث',
    'noFatwasInCategory': 'لا توجد فتاوى في هذا التصنيف',
    'fatwasInCategory': 'الفتاوى في التصنيف',
    'previous': 'السابق',
    'page': 'صفحة',
    'of': 'من',
    'next': 'التالي',
    'searchInCategoryPlaceholder': 'ابحث في هذا التصنيف...',
    'search': 'بحث',
    'iftaaTitle': 'نظام الإفتاء الإلكتروني',
    'iftaaSubtitle': 'منصة شاملة للفتاوى الإسلامية',
    'welcome': 'مرحباً',
    'searchPlaceholder': 'ابحث في الفتاوى...',
    'browseByCategory': 'تصفح حسب التصنيف',
    'categoryDescription': 'استعرض الفتاوى مرتبة حسب الموضوع',
    'loadingCategories': 'جاري تحميل التصنيفات',
    'footerText': 'نظام الإفتاء الإلكتروني - جميع الحقوق محفوظة',
    'adminLogin': 'دخول الإدارة',
    'fatwaNotFound': 'الفتوى غير موجودة',
    'error': 'خطأ',
    'category': 'التصنيف',
    'date': 'التاريخ',
    'tags': 'العلامات',
    'question': 'السؤال',
    'answer': 'الجواب',
    'loadingSimilarFatwas': 'جاري تحميل الفتاوى المشابهة',
    'similarFatwas': 'فتاوى مشابهة',
    'fatwaDetails': 'تفاصيل الفتوى',
    'goBack': 'رجوع',
    'searchInCategory': 'البحث في {category}',
    'loadingFatwa': 'جاري تحميل الفتوى',
    
    // Homepage
    'iftaaTitle': 'نظام الإفتاء الإسلامي',
    'iftaaSubtitle': 'منصة شاملة للفتاوى الإسلامية والأحكام الشرعية',
    'searchPlaceholder': 'ابحث في الفتاوى...',
    'search': 'بحث',
    'loadingCategories': 'جاري تحميل التصنيفات',
    'footerText': 'نظام الإفتاء الإسلامي - جميع الحقوق محفوظة',
    'adminLogin': 'دخول الإدارة',
    'welcome': 'مرحباً',
    'adminDashboard': 'لوحة الإدارة',
    'backToHome': 'العودة للرئيسية',
    'welcomeToAdminPanel': 'مرحباً بك في لوحة الإدارة',
    'adminPanelDescription': 'مركز التحكم الشامل لإدارة الفتاوى والتصنيفات ومراقبة النظام'
  },
  
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.profile': 'Profile',
    
    // Common
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.view': 'View',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.page': 'Page',
    'common.of': 'of',
    'common.results': 'results',
    'common.noResults': 'No results found',
    'common.selectLanguage': 'Select Language',
    
    // Authentication
    'auth.login': 'Login',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.loginButton': 'Sign In',
    'auth.loginError': 'Login Error',
    'auth.invalidCredentials': 'Invalid username or password',
    'auth.welcome': 'Welcome',
    'auth.unauthorized': 'Unauthorized',
    'auth.insufficientPermissions': 'You do not have permission to access this page',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.categories': 'Categories',
    'dashboard.allCategories': 'All Categories',
    'dashboard.fatwas': 'Fatwas',
    'dashboard.totalFatwas': 'Total Fatwas',
    'dashboard.recentFatwas': 'Recent Fatwas',
    'dashboard.searchPlaceholder': 'Search fatwas...',
    'dashboard.noFatwas': 'No fatwas found',
    
    // Fatwa
    'fatwa.title': 'Fatwa Title',
    'fatwa.question': 'Question',
    'fatwa.answer': 'Answer',
    'fatwa.category': 'Category',
    'fatwa.tags': 'Tags',
    'fatwa.createdAt': 'Created At',
    'fatwa.updatedAt': 'Updated At',
    'fatwa.id': 'Fatwa ID',
    'fatwa.language': 'Language',
    'fatwa.arabic': 'Arabic',
    'fatwa.english': 'English',
    'fatwa.similarFatwas': 'Similar Fatwas',
    'fatwa.relevanceScore': 'Relevance Score',
    
    // Categories
    'category.worship': 'Worship Fatwas',
    'category.prayer': 'Prayer Fatwas',
    'category.zakat': 'Zakat Fatwas',
    'category.fasting': 'Fasting Fatwas',
    'category.hajj': 'Hajj Fatwas',
    'category.marriage': 'Marriage Fatwas',
    'category.transactions': 'Transaction Fatwas',
    'category.noCategory': 'Uncategorized',
    
    // Admin
    'admin.title': 'Admin Panel',
    'admin.createFatwa': 'Create New Fatwa',
    'admin.editFatwa': 'Edit Fatwa',
    'admin.deleteFatwa': 'Delete Fatwa',
    'admin.fatwaManagement': 'Fatwa Management',
    'admin.systemStatus': 'System Status',
    'admin.userManagement': 'User Management',
    'admin.confirmDelete': 'Are you sure you want to delete this fatwa?',
    'admin.deleteSuccess': 'Fatwa deleted successfully',
    'admin.createSuccess': 'Fatwa created successfully',
    'admin.updateSuccess': 'Fatwa updated successfully',
    
    // Forms
    'form.required': 'This field is required',
    'form.minLength': 'Minimum length',
    'form.maxLength': 'Maximum length',
    'form.invalidFormat': 'Invalid format',
    'form.pleaseSelect': 'Please select',
    'form.autoTranslate': 'Auto Translate',
    'form.reTranslate': 'Re-translate',
    
    // Pagination
    'pagination.first': 'First',
    'pagination.last': 'Last',
    'pagination.showing': 'Showing',
    'pagination.to': 'to',
    'pagination.total': 'of total',
    'pagination.itemsPerPage': 'items per page',
    
    // System
    'system.connected': 'Connected',
    'system.disconnected': 'Disconnected',
    'system.database': 'Database',
    'system.vectorDatabase': 'Vector Database',
    'system.status': 'Status',
    'system.healthy': 'Healthy',
    'system.unhealthy': 'Unhealthy',
    
    // Errors
    'error.networkError': 'Network Error',
    'error.serverError': 'Server Error',
    'error.notFound': 'Not Found',
    'error.unauthorized': 'Unauthorized',
    'error.forbidden': 'Forbidden',
    'error.unknown': 'Unknown Error',
    'error.tryAgain': 'Try Again',
    
    // Time
    'time.justNow': 'Just now',
    'time.minutesAgo': 'minutes ago',
    'time.hoursAgo': 'hours ago',
    'time.daysAgo': 'days ago',
    'time.weeksAgo': 'weeks ago',
    'time.monthsAgo': 'months ago',
    
    // Missing Keys for New Pages
    'categoryStructureInitialized': 'Category structure initialized successfully',
    'categoryInitializationFailed': 'Failed to initialize category structure',
    'confirmDeleteFatwa': 'Are you sure you want to delete this fatwa?',
    'fatwaDeleted': 'Fatwa deleted successfully',
    'failedToDeleteFatwa': 'Failed to delete fatwa',
    'overview': 'Overview',
    'manageFatwas': 'Manage Fatwas',
    'createFatwa': 'Create Fatwa',
    'manageCategories': 'Manage Categories',
    'totalFatwas': 'Total Fatwas',
    'categories': 'Categories',
    'systemStatus': 'System Status',
    'online': 'Online',
    'checking': 'Checking',
    'quickActions': 'Quick Actions',
    'createNewFatwa': 'Create New Fatwa',
    'initializeCategories': 'Initialize Categories',
    'fatwaManagement': 'Fatwa Management',
    'refresh': 'Refresh',
    'loadingFatwas': 'Loading fatwas',
    'view': 'View',
    'delete': 'Delete',
    'noFatwasFound': 'No fatwas found',
    'fatwaCreationFormComingSoon': 'Fatwa creation form coming soon',
    'useApiDirectlyForNow': 'Use API directly for now',
    'categoryManagement': 'Category Management',
    'initializeCategoryStructure': 'Initialize Category Structure',
    'categoryManagementInfo': 'Category management information',
    'accessDenied': 'Access Denied',
    'adminAccessRequired': 'Admin access required',
    'backToHome': 'Back to Home',
    'home': 'Home',
    'adminDashboard': 'Admin Dashboard',
    'adminDashboardSubtitle': 'System and Fatwa Management',
    'subcategories': 'Subcategories',
    'loadingSubcategories': 'Loading subcategories',
    'searching': 'Searching',
    'noResultsFound': 'No results found',
    'searchResults': 'Search Results',
    'noFatwasInCategory': 'No fatwas in this category',
    'fatwasInCategory': 'Fatwas in Category',
    'previous': 'Previous',
    'page': 'Page',
    'of': 'of',
    'next': 'Next',
    'searchInCategoryPlaceholder': 'Search in this category...',
    'search': 'Search',
    'iftaaTitle': 'Electronic Fatwa System',
    'iftaaSubtitle': 'Comprehensive Islamic Fatwa Platform',
    'welcome': 'Welcome',
    'searchPlaceholder': 'Search fatwas...',
    'browseByCategory': 'Browse by Category',
    'categoryDescription': 'Browse fatwas organized by topic',
    'loadingCategories': 'Loading categories',
    'footerText': 'Electronic Fatwa System - All Rights Reserved',
    'adminLogin': 'Admin Login',
    'fatwaNotFound': 'Fatwa not found',
    'error': 'Error',
    'category': 'Category',
    'date': 'Date',
    'tags': 'Tags',
    'question': 'Question',
    'answer': 'Answer',
    'loadingSimilarFatwas': 'Loading similar fatwas',
    'similarFatwas': 'Similar Fatwas',
    'fatwaDetails': 'Fatwa Details',
    'goBack': 'Go Back',
    'searchInCategory': 'Search in {category}',
    'loadingFatwa': 'Loading fatwa',
    
    // Homepage
    'iftaaTitle': 'Islamic Fatwa System',
    'iftaaSubtitle': 'Comprehensive platform for Islamic fatwas and religious rulings',
    'searchPlaceholder': 'Search fatwas...',
    'search': 'Search',
    'loadingCategories': 'Loading categories',
    'footerText': 'Islamic Fatwa System - All rights reserved',
    'adminLogin': 'Admin Login',
    'welcome': 'Welcome',
    'adminDashboard': 'Admin Dashboard',
    'backToHome': 'Back to Home',
    'welcomeToAdminPanel': 'Welcome to Admin Panel',
    'adminPanelDescription': 'Comprehensive control center for managing fatwas, categories, and system monitoring'
  }
};

// Language State Type
interface LanguageState {
  language: Language;
  direction: Direction;
}

// Language Actions
type LanguageAction =
  | { type: 'SET_LANGUAGE'; payload: Language };

// Language Context Type
interface LanguageContextType extends LanguageState {
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  formatMessage: (key: string, values?: Record<string, string | number>) => string;
  isRTL: boolean;
}

// Initial State
const getInitialLanguage = (): Language => {
  const saved = storage.get<Language>('language');
  if (saved && ['ar', 'en'].includes(saved)) {
    return saved;
  }
  
  // Try to detect from environment or browser  
  const envLang = 'ar' as Language;
  if (envLang && ['ar', 'en'].includes(envLang)) {
    return envLang;
  }
  
  // Default to Arabic
  return 'ar';
};

const initialState: LanguageState = {
  language: getInitialLanguage(),
  direction: getInitialLanguage() === 'ar' ? 'rtl' : 'ltr'
};

// Language Reducer
const languageReducer = (state: LanguageState, action: LanguageAction): LanguageState => {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return {
        language: action.payload,
        direction: action.payload === 'ar' ? 'rtl' : 'ltr'
      };
    
    default:
      return state;
  }
};

// Create Language Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Language Provider Component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(languageReducer, initialState);

  // Update document direction and lang attribute
  useEffect(() => {
    document.documentElement.setAttribute('dir', state.direction);
    document.documentElement.setAttribute('lang', state.language);
    
    // Update body class for font family
    document.body.className = document.body.className
      .replace(/font-(arabic|english)/g, '')
      .trim();
    document.body.classList.add(state.language === 'ar' ? 'font-arabic' : 'font-english');
  }, [state.language, state.direction]);

  // Set language function
  const setLanguage = (language: Language): void => {
    storage.set('language', language);
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };

  // Toggle language function
  const toggleLanguage = (): void => {
    const newLanguage = state.language === 'ar' ? 'en' : 'ar';
    setLanguage(newLanguage);
  };

  // Translation function
  const t = (key: string, fallback?: string): string => {
    const translation = translations[state.language][key as keyof typeof translations[typeof state.language]];
    
    if (translation) {
      return translation;
    }
    
    // Fallback to other language
    const otherLanguage = state.language === 'ar' ? 'en' : 'ar';
    const otherTranslation = translations[otherLanguage][key as keyof typeof translations[typeof otherLanguage]];
    
    if (otherTranslation) {
      return otherTranslation;
    }
    
    // Return fallback or key
    return fallback || key;
  };

  // Format message with variables
  const formatMessage = (key: string, values?: Record<string, string | number>): string => {
    let message = t(key);
    
    if (values) {
      Object.entries(values).forEach(([placeholder, value]) => {
        message = message.replace(new RegExp(`{${placeholder}}`, 'g'), String(value));
      });
    }
    
    return message;
  };

  // Context value
  const contextValue: LanguageContextType = {
    ...state,
    setLanguage,
    toggleLanguage,
    t,
    formatMessage,
    isRTL: state.direction === 'rtl'
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Hook for translation only
export const useTranslation = () => {
  const { t, formatMessage, language, direction, isRTL, setLanguage, toggleLanguage } = useLanguage();
  return { t, formatMessage, language, direction, isRTL, setLanguage, toggleLanguage };
};