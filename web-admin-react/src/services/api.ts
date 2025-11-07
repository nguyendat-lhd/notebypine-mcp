import type {
  User,
  Incident,
  Solution,
  KnowledgeItem,
  DashboardStats,
  SystemHealth,
  ApiResponse,
} from '@/types';

const API_BASE_URL = 'http://localhost:3000';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
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

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<ApiResponse<{ token: string; user: User }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>('/api/v1/incidents/stats/summary');
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealth>> {
    return this.request<ApiResponse<SystemHealth>>('/api/v1/health/status');
  }

  // Incidents
  async getIncidents(page = 1, limit = 20): Promise<ApiResponse<{ items: Incident[]; total: number }>> {
    return this.request<ApiResponse<{ items: Incident[]; total: number }>>(`/api/v1/incidents?page=${page}&limit=${limit}`);
  }

  async createIncident(data: Partial<Incident>): Promise<ApiResponse<Incident>> {
    return this.request<ApiResponse<Incident>>('/api/v1/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: string, data: Partial<Incident>): Promise<ApiResponse<Incident>> {
    return this.request<ApiResponse<Incident>>(`/api/v1/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIncident(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/v1/incidents/${id}`, {
      method: 'DELETE',
    });
  }

  // Solutions
  async getSolutions(page = 1, limit = 20): Promise<ApiResponse<{ items: Solution[]; total: number }>> {
    return this.request<ApiResponse<{ items: Solution[]; total: number }>>(`/api/v1/solutions?page=${page}&limit=${limit}`);
  }

  async createSolution(data: Partial<Solution>): Promise<ApiResponse<Solution>> {
    return this.request<ApiResponse<Solution>>('/api/v1/solutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSolution(id: string, data: Partial<Solution>): Promise<ApiResponse<Solution>> {
    return this.request<ApiResponse<Solution>>(`/api/v1/solutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSolution(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/v1/solutions/${id}`, {
      method: 'DELETE',
    });
  }

  // Knowledge Base
  async getKnowledgeItems(page = 1, limit = 50): Promise<ApiResponse<{ items: KnowledgeItem[]; total: number }>> {
    return this.request<ApiResponse<{ items: KnowledgeItem[]; total: number }>>(`/api/v1/knowledge?page=${page}&limit=${limit}`);
  }

  async createKnowledgeItem(data: Partial<KnowledgeItem>): Promise<ApiResponse<KnowledgeItem>> {
    return this.request<ApiResponse<KnowledgeItem>>('/api/v1/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKnowledgeItem(id: string, data: Partial<KnowledgeItem>): Promise<ApiResponse<KnowledgeItem>> {
    return this.request<ApiResponse<KnowledgeItem>>(`/api/v1/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteKnowledgeItem(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/v1/knowledge/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
export default apiService;