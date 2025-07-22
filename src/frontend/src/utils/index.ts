// Utility functions for the IFTAA application

import type { Language, Direction } from '../types/index';

// Format date based on language
export const formatDate = (date: Date | string, language: Language = 'ar'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  if (language === 'ar') {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      calendar: 'gregory'
    }).format(dateObj);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(dateObj);
};

// Format relative time (e.g., "منذ ساعتين", "2 hours ago")
export const formatRelativeTime = (dateString: string, language: Language = 'ar'): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (language === 'ar') {
    if (diffInHours < 1) return 'منذ أقل من ساعة';
    if (diffInHours === 1) return 'منذ ساعة واحدة';
    if (diffInHours === 2) return 'منذ ساعتين';
    if (diffInHours < 11) return `منذ ${diffInHours} ساعات`;
    if (diffInHours < 24) return 'منذ أقل من يوم';
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'منذ يوم واحد';
    if (diffInDays === 2) return 'منذ يومين';
    if (diffInDays < 11) return `منذ ${diffInDays} أيام`;
    
    return formatDate(dateString, language);
  }
  
  if (diffInHours < 1) return 'Less than an hour ago';
  if (diffInHours === 1) return '1 hour ago';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return formatDate(dateString, language);
};

// Truncate text with proper handling for Arabic
export const truncateText = (text: string, maxLength: number, suffix: string = '…'): string => {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + suffix;
  }
  
  return truncated + suffix;
};

// Get text direction based on content or language
export const getTextDirection = (text?: string, language?: Language): Direction => {
  if (language) {
    return language === 'ar' ? 'rtl' : 'ltr';
  }
  
  if (!text) return 'rtl'; // Default to RTL
  
  // Check for Arabic characters
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? 'rtl' : 'ltr';
};

// Clean and highlight search terms in text
export const highlightSearchTerms = (
  text: string, 
  searchTerms: string[], 
  language: Language = 'ar'
): string => {
  if (!searchTerms.length) return text;
  
  let highlightedText = text;
  searchTerms.forEach(term => {
    if (term.trim()) {
      const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
      highlightedText = highlightedText.replace(
        regex, 
        '<mark class="bg-islamic-gold-light text-islamic-blue font-medium">$1</mark>'
      );
    }
  });
  
  return highlightedText;
};

// Escape special regex characters
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Debounce function for search inputs
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Validate Arabic text
export const isArabicText = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
};

// Format numbers for Arabic locale
export const formatNumber = (num: number, language: Language = 'ar'): string => {
  if (language === 'ar') {
    return new Intl.NumberFormat('ar-SA').format(num);
  }
  return new Intl.NumberFormat('en-US').format(num);
};

// Convert English digits to Arabic-Indic digits
export const toArabicDigits = (str: string): string => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return str.replace(/[0-9]/g, (digit) => arabicDigits[parseInt(digit)]);
};

// Alias for toArabicDigits for compatibility
export const formatArabicNumber = (input: string | number): string => {
  return toArabicDigits(String(input));
};

// Convert Arabic-Indic digits to English digits
export const toEnglishDigits = (str: string): string => {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return str.replace(/[٠-٩]/g, (digit) => arabicDigits.indexOf(digit).toString());
};

// Get appropriate font family based on language/content
export const getFontFamily = (language: Language): string => {
  return language === 'ar' ? 'font-arabic' : 'font-english';
};

// Storage utilities with error handling
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      
      if (!item) return defaultValue || null;
      
      // Special handling for JWT tokens which are plain strings
      if (key === 'token') {
        return item as T;
      }
      
      // For other values, parse as JSON
      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to get from localStorage key '${key}':`, error);
      return defaultValue || null;
    }
  },
  
  set: (key: string, value: unknown): void => {
    try {
      // Special handling for JWT tokens which are plain strings
      if (key === 'token' && typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Failed to save to localStorage key '${key}':`, error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage key '${key}':`, error);
    }
  }
};

// Generate unique IDs
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Class name utility (simple version of clsx)
export const cn = (...classes: (string | undefined | null | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Check if user is admin
export const isAdmin = (userRole?: string): boolean => {
  return userRole === 'admin';
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Scroll to top utility
export const scrollToTop = (smooth = true): void => {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  });
};

// Copy to clipboard utility
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
};