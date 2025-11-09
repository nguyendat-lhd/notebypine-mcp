export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  signal?: AbortSignal;
}

export interface IHttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  setToken(token: string | null): void;
  getToken(): string | null;
}

