import type { IHttpClient } from '../base/IHttpClient.js';
import type { IAuthRepository, LoginCredentials, LoginResponse } from './IAuthRepository.js';
import type { ApiResponse, User } from '@/types/index.js';
import { HttpClient } from '../http/HttpClient.js';

export class AuthRepository implements IAuthRepository {
  constructor(private httpClient: IHttpClient) {}

  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const response = await this.httpClient.post<ApiResponse<LoginResponse>>(
      '/api/auth/login',
      credentials
    );

    if (response.success && response.data?.token) {
      // Update HTTP client token
      if (this.httpClient instanceof HttpClient) {
        this.httpClient.setToken(response.data.token);
      }
      
      // Store in localStorage
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  logout(): void {
    if (this.httpClient instanceof HttpClient) {
      this.httpClient.setToken(null);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }
}

