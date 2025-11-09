# Repository Pattern Implementation Examples

## 📁 File Structure Examples

### 1. HTTP Client Interface

```typescript
// repositories/base/IHttpClient.ts
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
}
```

### 2. HTTP Client Implementation

```typescript
// repositories/http/HttpClient.ts
import type { IHttpClient, RequestConfig } from '../base/IHttpClient.js';

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
```

### 3. Base Repository

```typescript
// repositories/base/BaseRepository.ts
import type { IHttpClient } from './IHttpClient.js';
import type { ApiResponse } from '@/types/index.js';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  constructor(
    protected httpClient: IHttpClient,
    protected basePath: string
  ) {}

  protected getPath(path: string = ''): string {
    return path ? `${this.basePath}/${path}` : this.basePath;
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<T>> {
    const queryParams: Record<string, string | number> = {};
    
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.filter) queryParams.filter = params.filter;

    const response = await this.httpClient.get<ApiResponse<{ items: T[]; total: number }>>(
      this.getPath(),
      { params: queryParams }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch items');
    }

    const { items, total } = response.data;
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<T> {
    const response = await this.httpClient.get<ApiResponse<T>>(
      this.getPath(id)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Item not found');
    }

    return response.data;
  }

  async create(data: CreateDto): Promise<T> {
    const response = await this.httpClient.post<ApiResponse<T>>(
      this.getPath(),
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create item');
    }

    return response.data;
  }

  async update(id: string, data: UpdateDto): Promise<T> {
    const response = await this.httpClient.put<ApiResponse<T>>(
      this.getPath(id),
      data
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update item');
    }

    return response.data;
  }

  async delete(id: string): Promise<void> {
    const response = await this.httpClient.delete<ApiResponse<void>>(
      this.getPath(id)
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete item');
    }
  }
}
```

### 4. Incident Repository Interface

```typescript
// repositories/incidents/IIncidentRepository.ts
import type { Incident } from '@/types/index.js';
import type { PaginationParams, PaginatedResponse } from '../base/BaseRepository.js';

export interface CreateIncidentDto {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'open' | 'investigating' | 'resolved' | 'closed';
  tags?: string[];
  assigned_to?: string;
}

export interface UpdateIncidentDto extends Partial<CreateIncidentDto> {}

export interface IIncidentRepository {
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Incident>>;
  findOne(id: string): Promise<Incident>;
  create(data: CreateIncidentDto): Promise<Incident>;
  update(id: string, data: UpdateIncidentDto): Promise<Incident>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Incident[]>;
}
```

### 5. Incident Repository Implementation

```typescript
// repositories/incidents/IncidentRepository.ts
import { BaseRepository } from '../base/BaseRepository.js';
import type { IHttpClient } from '../base/IHttpClient.js';
import type { Incident } from '@/types/index.js';
import type { 
  IIncidentRepository, 
  CreateIncidentDto, 
  UpdateIncidentDto 
} from './IIncidentRepository.js';
import type { ApiResponse } from '@/types/index.js';

export class IncidentRepository 
  extends BaseRepository<Incident, CreateIncidentDto, UpdateIncidentDto>
  implements IIncidentRepository 
{
  constructor(httpClient: IHttpClient) {
    super(httpClient, '/api/v1/incidents');
  }

  async search(query: string): Promise<Incident[]> {
    const response = await this.httpClient.get<ApiResponse<{ items: Incident[] }>>(
      `${this.basePath}/search`,
      { params: { q: query } }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Search failed');
    }

    return response.data.items || [];
  }
}
```

### 6. Auth Repository

```typescript
// repositories/auth/IAuthRepository.ts
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
```

```typescript
// repositories/auth/AuthRepository.ts
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
```

### 7. Repository Service (Dependency Injection Container)

```typescript
// services/repository.service.ts
import { HttpClient } from '@/repositories/http/HttpClient.js';
import type { IHttpClient } from '@/repositories/base/IHttpClient.js';

// Auth
import { AuthRepository } from '@/repositories/auth/AuthRepository.js';
import type { IAuthRepository } from '@/repositories/auth/IAuthRepository.js';

// Incidents
import { IncidentRepository } from '@/repositories/incidents/IncidentRepository.js';
import type { IIncidentRepository } from '@/repositories/incidents/IIncidentRepository.js';

// Solutions
import { SolutionRepository } from '@/repositories/solutions/SolutionRepository.js';
import type { ISolutionRepository } from '@/repositories/solutions/ISolutionRepository.js';

// Knowledge
import { KnowledgeRepository } from '@/repositories/knowledge/KnowledgeRepository.js';
import type { IKnowledgeRepository } from '@/repositories/knowledge/IKnowledgeRepository.js';

// Dashboard
import { DashboardRepository } from '@/repositories/dashboard/DashboardRepository.js';
import type { IDashboardRepository } from '@/repositories/dashboard/IDashboardRepository.js';

export class RepositoryService {
  private httpClient: IHttpClient;

  // Repositories
  public readonly auth: IAuthRepository;
  public readonly incidents: IIncidentRepository;
  public readonly solutions: ISolutionRepository;
  public readonly knowledge: IKnowledgeRepository;
  public readonly dashboard: IDashboardRepository;

  constructor() {
    // Initialize HTTP client
    this.httpClient = new HttpClient();

    // Initialize repositories
    this.auth = new AuthRepository(this.httpClient);
    this.incidents = new IncidentRepository(this.httpClient);
    this.solutions = new SolutionRepository(this.httpClient);
    this.knowledge = new KnowledgeRepository(this.httpClient);
    this.dashboard = new DashboardRepository(this.httpClient);
  }
}

// Export singleton instance
export const repositoryService = new RepositoryService();
```

### 8. Component Usage Example

```typescript
// components/incidents/IncidentsPage.tsx
import { repositoryService } from '@/services/repository.service';

const IncidentsPage: FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await repositoryService.incidents.findAll({ 
        page: 1, 
        limit: 20 
      });
      
      setIncidents(response.items);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateIncidentDto) => {
    try {
      await repositoryService.incidents.create(data);
      await fetchIncidents(); // Refresh list
    } catch (error) {
      console.error('Failed to create incident:', error);
    }
  };

  // ... rest of component
};
```

## 🧪 Testing Examples

### Mock Repository for Testing

```typescript
// __tests__/mocks/repositories.ts
import type { IIncidentRepository } from '@/repositories/incidents/IIncidentRepository';
import type { Incident } from '@/types';

export const createMockIncidentRepository = (): IIncidentRepository => ({
  findAll: jest.fn().mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  search: jest.fn().mockResolvedValue([]),
});
```

### Component Test with Mock Repository

```typescript
// __tests__/components/IncidentsPage.test.tsx
import { render, screen } from '@testing-library/react';
import { IncidentsPage } from '@/components/incidents/IncidentsPage';
import { createMockIncidentRepository } from '../mocks/repositories';

jest.mock('@/services/repository.service', () => ({
  repositoryService: {
    incidents: createMockIncidentRepository(),
  },
}));

describe('IncidentsPage', () => {
  it('should fetch and display incidents', async () => {
    const mockRepository = createMockIncidentRepository();
    mockRepository.findAll = jest.fn().mockResolvedValue({
      items: [{ id: '1', title: 'Test Incident' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    render(<IncidentsPage />);
    
    expect(await screen.findByText('Test Incident')).toBeInTheDocument();
  });
});
```

## 📚 Migration Checklist

- [ ] Create HTTP client interface and implementation
- [ ] Create base repository
- [ ] Create domain repository interfaces
- [ ] Implement domain repositories
- [ ] Create repository service
- [ ] Update components to use repositories
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Remove deprecated API service

