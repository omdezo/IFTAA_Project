// Authentication Types
export interface User {
  username: string;
  role: 'admin' | 'user';
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  expiresAt: string;
}

// Fatwa Types
export interface Fatwa {
  FatwaId: number;
  Title?: string;
  TitleAr?: string;
  TitleEn?: string;
  Question?: string;
  QuestionAr?: string;
  QuestionEn?: string;
  Answer?: string;
  AnswerAr?: string;
  AnswerEn?: string;
  Category: string;
  Tags?: string[];
  Language?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateFatwaDto {
  FatwaId: number;
  TitleAr: string;
  QuestionAr: string;
  AnswerAr: string;
  Category: string;
  Tags?: string[];
  AutoTranslate?: boolean;
}

export interface UpdateFatwaDto {
  TitleAr?: string;
  TitleEn?: string;
  QuestionAr?: string;
  QuestionEn?: string;
  AnswerAr?: string;
  AnswerEn?: string;
  Category?: string;
  Tags?: string[];
  ReTranslate?: boolean;
}

// Search Types
export interface SearchResult {
  Fatwa: Fatwa;
  RelevanceScore: number;
}

export interface PaginatedSearchResponse {
  Page: number;
  PageSize: number;
  TotalResults: number;
  TotalPages: number;
  Results: SearchResult[];
}

export interface SearchParams {
  query?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  language?: 'ar' | 'en';
  userId?: string;
}

// Category Types
export interface Category {
  id: number;
  title: string;
  parentId?: number;
  description?: string;
  fatwaIds?: number[];
  children?: Category[];
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface CategoryHierarchy {
  Id: number;
  Title: string;
  TitleEn?: string;
  ParentId?: number;
  Description?: string;
  DescriptionEn?: string;
  Children?: CategoryHierarchy[];
  IsActive?: boolean;
  FatwaCount?: number;
}

// User Settings Types
export interface UserSettings {
  PreferredLanguage: 'ar' | 'en';
  ResultsPerPage: number;
  SearchPreferences: SearchPreferences;
}

export interface SearchPreferences {
  IncludeArabic: boolean;
  IncludeEnglish: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
}

// Language Types
export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

// System Status Types
export interface SystemStatus {
  mongodb: {
    connected: boolean;
    database: string;
    totalFatwas: number;
  };
  milvus: {
    connected: boolean;
    collections: string[];
  };
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Route Types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

// Form Types
export interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  className?: string;
  rows?: number;
}

// Loading and Error States
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    VALIDATE: '/api/auth/validate',
    REFRESH: '/api/auth/refresh',
    ROLES: '/api/auth/roles'
  },
  FATWA: {
    BASE: '/api/fatwa',
    SEARCH: '/api/fatwa/search',
    SIMILAR: (id: number) => `/api/fatwa/${id}/similar`
  },
  CATEGORY: {
    BASE: '/api/category',
    VALID: '/api/category/valid',
    TOP_LEVEL: '/api/category/top-level',
    HIERARCHY: '/api/category/hierarchy',
    INITIALIZE: '/api/category/initialize',
    SYNC_FATWAS: '/api/category/sync-fatwas',
    CHILDREN: (id: number) => `/api/category/${id}/children`,
    FATWAS: (id: number) => `/api/category/${id}/fatwas`
  },
  USER: {
    SETTINGS: (userId: string) => `/api/user/${userId}/settings`
  },
  SYSTEM: {
    MONGODB_STATUS: '/api/system/mongodb-status',
    MILVUS_STATUS: '/api/system/milvus-status',
    STATS: '/api/system/stats'
  }
} as const;