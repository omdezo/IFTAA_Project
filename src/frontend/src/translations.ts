// Simple translation system for IFTAA
export type Language = 'ar' | 'en';

export const translations = {
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
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    'common.yes': 'نعم',
    'common.no': 'لا',
    
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
    'dashboard.loadMore': 'تحميل المزيد',
    'dashboard.toggleView': 'تغيير العرض',
    'dashboard.tableView': 'عرض جدول',
    'dashboard.cardView': 'عرض بطاقات',
    
    // Table
    'table.id': 'الرقم',
    'table.title': 'العنوان',
    'table.category': 'التصنيف',
    'table.date': 'التاريخ',
    'table.actions': 'الإجراءات',
    'table.noData': 'لا توجد بيانات',
    'table.selectAll': 'تحديد الكل',
    'table.selected': 'محدد',
    'table.itemsPerPage': 'عدد العناصر لكل صفحة',
    
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
    'fatwa.titleAr': 'العنوان بالعربية',
    'fatwa.titleEn': 'العنوان بالإنجليزية',
    'fatwa.questionAr': 'السؤال بالعربية',
    'fatwa.questionEn': 'السؤال بالإنجليزية',
    'fatwa.answerAr': 'الجواب بالعربية',
    'fatwa.answerEn': 'الجواب بالإنجليزية',
    
    // Forms
    'form.required': 'هذا الحقل مطلوب',
    'form.minLength': 'الحد الأدنى للطول',
    'form.maxLength': 'الحد الأقصى للطول',
    'form.invalidFormat': 'تنسيق غير صحيح',
    'form.pleaseSelect': 'يرجى الاختيار',
    'form.autoTranslate': 'ترجمة تلقائية',
    'form.reTranslate': 'إعادة ترجمة',
    'form.validation.required': 'هذا الحقل مطلوب',
    'form.validation.minLength': 'يجب أن يكون الطول {min} أحرف على الأقل',
    'form.validation.maxLength': 'يجب أن لا يتجاوز الطول {max} حرف',
    'form.validation.email': 'يرجى إدخال بريد إلكتروني صحيح',
    
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
    'admin.modal.title': 'إدارة الفتوى',
    'admin.bulk.delete': 'حذف متعدد',
    'admin.bulk.selected': 'محدد: {count}',
    
    // Search
    'search.global': 'البحث الشامل',
    'search.inCategory': 'البحث في {category}',
    'search.filters': 'الفلاتر',
    'search.sortBy': 'ترتيب حسب',
    'search.relevance': 'الصلة',
    'search.date': 'التاريخ',
    'search.title': 'العنوان',
    'search.clearFilters': 'مسح الفلاتر',
    'search.noQuery': 'أدخل كلمة للبحث',
    
    // Categories
    'category.expand': 'توسيع',
    'category.collapse': 'طي',
    'category.showAll': 'عرض الكل',
    'category.loading': 'جاري تحميل التصنيفات...',
    'category.loadChildren': 'تحميل الفروع',
    'category.count': '{count} فتوى',
    
    // Errors
    'error.networkError': 'خطأ في الشبكة',
    'error.serverError': 'خطأ في الخادم',
    'error.notFound': 'غير موجود',
    'error.unauthorized': 'غير مخول',
    'error.forbidden': 'ممنوع',
    'error.unknown': 'خطأ غير معروف',
    'error.tryAgain': 'حاول مرة أخرى',
    'error.loadingFailed': 'فشل في التحميل',
    
    // Theme
    'theme.light': 'فاتح',
    'theme.dark': 'داكن',
    'theme.system': 'النظام',
    'theme.rtl': 'من اليمين لليسار',
    'theme.ltr': 'من اليسار لليمين'
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
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    
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
    'dashboard.loadMore': 'Load More',
    'dashboard.toggleView': 'Toggle View',
    'dashboard.tableView': 'Table View',
    'dashboard.cardView': 'Card View',
    
    // Table
    'table.id': 'ID',
    'table.title': 'Title',
    'table.category': 'Category',
    'table.date': 'Date',
    'table.actions': 'Actions',
    'table.noData': 'No data available',
    'table.selectAll': 'Select All',
    'table.selected': 'Selected',
    'table.itemsPerPage': 'Items per page',
    
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
    'fatwa.titleAr': 'Arabic Title',
    'fatwa.titleEn': 'English Title',
    'fatwa.questionAr': 'Arabic Question',
    'fatwa.questionEn': 'English Question',
    'fatwa.answerAr': 'Arabic Answer',
    'fatwa.answerEn': 'English Answer',
    
    // Forms
    'form.required': 'This field is required',
    'form.minLength': 'Minimum length',
    'form.maxLength': 'Maximum length',
    'form.invalidFormat': 'Invalid format',
    'form.pleaseSelect': 'Please select',
    'form.autoTranslate': 'Auto Translate',
    'form.reTranslate': 'Re-translate',
    'form.validation.required': 'This field is required',
    'form.validation.minLength': 'Must be at least {min} characters',
    'form.validation.maxLength': 'Must not exceed {max} characters',
    'form.validation.email': 'Please enter a valid email',
    
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
    'admin.modal.title': 'Manage Fatwa',
    'admin.bulk.delete': 'Bulk Delete',
    'admin.bulk.selected': 'Selected: {count}',
    
    // Search
    'search.global': 'Global Search',
    'search.inCategory': 'Search in {category}',
    'search.filters': 'Filters',
    'search.sortBy': 'Sort by',
    'search.relevance': 'Relevance',
    'search.date': 'Date',
    'search.title': 'Title',
    'search.clearFilters': 'Clear Filters',
    'search.noQuery': 'Enter search term',
    
    // Categories
    'category.expand': 'Expand',
    'category.collapse': 'Collapse',
    'category.showAll': 'Show All',
    'category.loading': 'Loading categories...',
    'category.loadChildren': 'Load Children',
    'category.count': '{count} fatwas',
    
    // Errors
    'error.networkError': 'Network Error',
    'error.serverError': 'Server Error',
    'error.notFound': 'Not Found',
    'error.unauthorized': 'Unauthorized',
    'error.forbidden': 'Forbidden',
    'error.unknown': 'Unknown Error',
    'error.tryAgain': 'Try Again',
    'error.loadingFailed': 'Loading Failed',
    
    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'theme.rtl': 'Right to Left',
    'theme.ltr': 'Left to Right'
  }
} as const;

// Translation function
export const t = (key: string, language: Language = 'ar', params?: Record<string, string | number> | null): string => {
  const translation = translations[language][key as keyof typeof translations[typeof language]];
  
  if (!translation) {
    // Fallback to other language
    const fallbackLang = language === 'ar' ? 'en' : 'ar';
    const fallback = translations[fallbackLang][key as keyof typeof translations[typeof fallbackLang]];
    if (fallback) return fallback;
    
    // Return key if no translation found
    return key;
  }
  
  // Replace parameters
  if (params) {
    return Object.entries(params).reduce(
      (str, [param, value]) => str.replace(`{${param}}`, String(value)),
      translation
    );
  }
  
  return translation;
};