// api/services/auth.ts

import apiClient from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../types/common.types';
import type { LoginRequest, LoginResponse, AuthUser } from '../types/auth';

class AuthService {
  /**
   * Login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<any, ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    // Lưu token vào localStorage
    if (response.success && response.data.access_token) {
      const token = response.data.access_token;
      localStorage.setItem('access_token', token);
      
      // Nếu remember_me = true, lưu lâu dài
      // Nếu không, token sẽ mất khi đóng browser (session storage)
      if (credentials.remember_me) {
        localStorage.setItem('remember_me', 'true');
      } else {
        sessionStorage.setItem('access_token', token);
        localStorage.removeItem('access_token');
      }
    }
    
    return response;
  }

  /**
   * Logout
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('remember_me');
    sessionStorage.removeItem('access_token');
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Get token
   */
  getToken(): string | null {
    // Ưu tiên lấy từ localStorage (remember me)
    const localToken = localStorage.getItem('access_token');
    if (localToken) return localToken;
    
    // Nếu không có, lấy từ sessionStorage
    return sessionStorage.getItem('access_token');
  }
}

export default new AuthService();