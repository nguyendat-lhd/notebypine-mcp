import type { User } from '@/types/index.js';
import type { ApiResponse } from '@/types/index.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface IAuthRepository {
  login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>>;
  logout(): void;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}

