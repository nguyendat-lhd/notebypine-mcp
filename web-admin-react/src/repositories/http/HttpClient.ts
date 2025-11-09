import type { IHttpClient, RequestConfig } from './IHttpClient.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class HttpClient implements IHttpClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...customHeaders,
    };
  }

  private buildUrl(url: string, params?: Record<string, string | number>): string {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    if (!params) return fullUrl;

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, String(value));
    });
    
    return urlObj.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String(payload.error)
          : response.statusText || 'Request failed';
      
      const error = new Error(errorMessage);
      (error as Error & { status?: number; data?: unknown }).status = response.status;
      (error as Error & { status?: number; data?: unknown }).data = payload;
      throw error;
    }

    return payload as T;
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const fullUrl = this.buildUrl(url, config?.params);
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: this.getHeaders(config?.headers),
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const fullUrl = this.buildUrl(url, config?.params);
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const fullUrl = this.buildUrl(url, config?.params);
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const fullUrl = this.buildUrl(url, config?.params);
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: this.getHeaders(config?.headers),
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    const fullUrl = this.buildUrl(url, config?.params);
    const response = await fetch(fullUrl, {
      method: 'PATCH',
      headers: this.getHeaders(config?.headers),
      body: data ? JSON.stringify(data) : undefined,
      signal: config?.signal,
    });

    return this.handleResponse<T>(response);
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

