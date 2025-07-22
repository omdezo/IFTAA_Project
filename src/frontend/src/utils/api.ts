import { API_ENDPOINTS } from '../types/index';

// API Configuration - Use relative URL for proxy
const API_BASE_URL = '';

// Custom fetch wrapper with authentication and error handling
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get authentication headers
  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    skipAuthRedirect: boolean = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>)
    };

    try {
      const response = await fetch(url, config);

      // Handle authentication errors
      if (response.status === 401) {
        // Only redirect to login if not skipping auth redirect (for refresh/validate calls)
        if (!skipAuthRedirect) {
          this.setToken(null);
          window.location.href = '/login';
        }
        throw new Error('Authentication failed');
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return {} as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, string | number | undefined>, skipAuthRedirect: boolean = false): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Special handling for categoryId to avoid NaN
          if (key === 'categoryId' && isNaN(Number(value))) {
            return; // Skip if categoryId is NaN
          }
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    
    console.log('API Request URL:', `${this.baseURL}${url}`);
    return this.request<T>(url, { method: 'GET' }, skipAuthRedirect);
  }

  async post<T>(endpoint: string, data?: unknown, skipAuthRedirect: boolean = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }, skipAuthRedirect);
  }

  async put<T>(endpoint: string, data?: unknown, skipAuthRedirect: boolean = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }, skipAuthRedirect);
  }

  async delete<T>(endpoint: string, skipAuthRedirect: boolean = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, skipAuthRedirect);
  }
}

// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Specific API methods for different resources
export const authApi = {
  login: (credentials: { username: string; password: string }) => 
    apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
  
  validateToken: () => 
    apiClient.post(API_ENDPOINTS.AUTH.VALIDATE, undefined, true),
  
  refreshToken: () => 
    apiClient.post(API_ENDPOINTS.AUTH.REFRESH, undefined, true),
  
  getCurrentUser: () => 
    apiClient.get(API_ENDPOINTS.AUTH.ME),
  
  getRoles: () => 
    apiClient.get(API_ENDPOINTS.AUTH.ROLES)
};

export const fatwaApi = {
  search: (params: Record<string, string | number | undefined>) => 
    apiClient.get(API_ENDPOINTS.FATWA.SEARCH, params),
  
  getById: (id: number, language?: string) => 
    apiClient.get(`${API_ENDPOINTS.FATWA.BASE}/${id}`, language ? { language } : undefined),
  
  create: (data: unknown) => 
    apiClient.post(API_ENDPOINTS.FATWA.BASE, data),
  
  update: (id: number, data: unknown) => 
    apiClient.put(`${API_ENDPOINTS.FATWA.BASE}/${id}`, data),
  
  delete: (id: number) => 
    apiClient.delete(`${API_ENDPOINTS.FATWA.BASE}/${id}`),
  
  getSimilar: (id: number, params?: Record<string, string | number>) => 
    apiClient.get(API_ENDPOINTS.FATWA.SIMILAR(id), params),
  
  getAll: (params?: Record<string, string | number>) => 
    apiClient.get(API_ENDPOINTS.FATWA.BASE, params)
};

export const categoryApi = {
  getAll: (language?: string) => 
    apiClient.get(API_ENDPOINTS.CATEGORY.BASE, language ? { language } : undefined),
  
  getTopLevel: (language?: string) => 
    apiClient.get(API_ENDPOINTS.CATEGORY.TOP_LEVEL, language ? { language } : undefined),
  
  getChildren: (parentId: number, language?: string) => 
    apiClient.get(API_ENDPOINTS.CATEGORY.CHILDREN(parentId), language ? { language } : undefined),
  
  getFatwas: (categoryId: number, params?: Record<string, string | number>) => 
    apiClient.get(API_ENDPOINTS.CATEGORY.FATWAS(categoryId), params),
  
  getValidCategories: () => 
    apiClient.get(API_ENDPOINTS.CATEGORY.VALID),

  getHierarchy: (language?: string) => 
    apiClient.get(API_ENDPOINTS.CATEGORY.HIERARCHY, language ? { language } : undefined),

  initializeStructure: () => 
    apiClient.post(API_ENDPOINTS.CATEGORY.INITIALIZE),

  syncFatwas: () => 
    apiClient.post(API_ENDPOINTS.CATEGORY.SYNC_FATWAS)
};

export const userApi = {
  getSettings: (userId: string) => 
    apiClient.get(API_ENDPOINTS.USER.SETTINGS(userId)),
  
  updateSettings: (userId: string, settings: unknown) => 
    apiClient.put(API_ENDPOINTS.USER.SETTINGS(userId), settings)
};

export const systemApi = {
  getMongoDBStatus: () => 
    apiClient.get(API_ENDPOINTS.SYSTEM.MONGODB_STATUS),
  
  getMilvusStatus: () => 
    apiClient.get(API_ENDPOINTS.SYSTEM.MILVUS_STATUS),
  
  getStats: () => 
    apiClient.get(API_ENDPOINTS.SYSTEM.STATS)
};