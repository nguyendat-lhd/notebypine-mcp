# Kế Hoạch Triển Khai Repository Pattern cho API Management

## 📋 Tổng Quan

Repository Pattern sẽ giúp:
- **Tách biệt logic**: Tách biệt logic gọi API khỏi business logic
- **Dễ test**: Mock repository dễ dàng trong unit tests
- **Dễ maintain**: Thay đổi API không ảnh hưởng đến components
- **Type-safe**: Đảm bảo type safety với TypeScript
- **Reusable**: Tái sử dụng logic API ở nhiều nơi

## 🏗️ Kiến Trúc Đề Xuất

```
web-admin-react/src/
├── repositories/
│   ├── base/
│   │   ├── BaseRepository.ts          # Base repository với CRUD operations
│   │   ├── IRepository.ts             # Interface cho repository
│   │   └── IHttpClient.ts             # Interface cho HTTP client
│   ├── http/
│   │   └── HttpClient.ts               # HTTP client implementation
│   ├── auth/
│   │   ├── AuthRepository.ts           # Authentication repository
│   │   └── IAuthRepository.ts         # Auth interface
│   ├── incidents/
│   │   ├── IncidentRepository.ts       # Incident repository
│   │   └── IIncidentRepository.ts      # Incident interface
│   ├── solutions/
│   │   ├── SolutionRepository.ts      # Solution repository
│   │   └── ISolutionRepository.ts      # Solution interface
│   ├── knowledge/
│   │   ├── KnowledgeRepository.ts      # Knowledge repository
│   │   └── IKnowledgeRepository.ts     # Knowledge interface
│   ├── dashboard/
│   │   ├── DashboardRepository.ts      # Dashboard repository
│   │   └── IDashboardRepository.ts    # Dashboard interface
│   └── index.ts                        # Export all repositories
└── services/
    └── repository.service.ts            # Repository service container (DI)
```

## 📐 Thiết Kế Chi Tiết

### 1. HTTP Client Abstraction

**Mục đích**: Tách biệt HTTP implementation khỏi repository logic

```typescript
// repositories/base/IHttpClient.ts
export interface IHttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>;
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T>;
  delete<T>(url: string, config?: RequestConfig): Promise<T>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
}
```

### 2. Base Repository

**Mục đích**: Cung cấp CRUD operations chung cho tất cả repositories

```typescript
// repositories/base/BaseRepository.ts
export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected httpClient: IHttpClient,
    protected basePath: string
  ) {}

  async findAll(params?: PaginationParams): Promise<PaginatedResponse<T>>;
  async findOne(id: string): Promise<T>;
  async create(data: CreateDto): Promise<T>;
  async update(id: string, data: UpdateDto): Promise<T>;
  async delete(id: string): Promise<void>;
}
```

### 3. Repository Interfaces

**Mục đích**: Định nghĩa contract rõ ràng cho từng domain

```typescript
// repositories/incidents/IIncidentRepository.ts
export interface IIncidentRepository {
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Incident>>;
  findOne(id: string): Promise<Incident>;
  create(data: CreateIncidentDto): Promise<Incident>;
  update(id: string, data: UpdateIncidentDto): Promise<Incident>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Incident[]>;
}
```

### 4. Repository Service (Dependency Injection)

**Mục đích**: Quản lý và cung cấp repositories cho components

```typescript
// services/repository.service.ts
export class RepositoryService {
  private httpClient: IHttpClient;
  
  // Repositories
  public readonly auth: IAuthRepository;
  public readonly incidents: IIncidentRepository;
  public readonly solutions: ISolutionRepository;
  public readonly knowledge: IKnowledgeRepository;
  public readonly dashboard: IDashboardRepository;

  constructor() {
    this.httpClient = new HttpClient();
    this.auth = new AuthRepository(this.httpClient);
    this.incidents = new IncidentRepository(this.httpClient);
    // ... initialize other repositories
  }
}

export const repositoryService = new RepositoryService();
```

## 📝 Implementation Plan

### Phase 1: Foundation (Day 1-2)

#### 1.1. Tạo HTTP Client Abstraction
- [ ] Tạo `IHttpClient` interface
- [ ] Implement `HttpClient` class với:
  - Token management
  - Error handling
  - Request/Response interceptors
  - Base URL configuration

#### 1.2. Tạo Base Repository
- [ ] Tạo `IRepository` interface
- [ ] Implement `BaseRepository` class với:
  - Generic CRUD operations
  - Pagination support
  - Error handling

#### 1.3. Tạo Type Definitions
- [ ] Tạo `PaginationParams` interface
- [ ] Tạo `PaginatedResponse<T>` interface
- [ ] Tạo DTOs cho Create/Update operations

### Phase 2: Domain Repositories (Day 2-3)

#### 2.1. Auth Repository
- [ ] Tạo `IAuthRepository` interface
- [ ] Implement `AuthRepository`:
  - `login(email, password)`
  - `logout()`
  - `getCurrentUser()`
  - `isAuthenticated()`

#### 2.2. Incident Repository
- [ ] Tạo `IIncidentRepository` interface
- [ ] Implement `IncidentRepository`:
  - `findAll(params)`
  - `findOne(id)`
  - `create(data)`
  - `update(id, data)`
  - `delete(id)`
  - `search(query)` (optional)

#### 2.3. Solution Repository
- [ ] Tạo `ISolutionRepository` interface
- [ ] Implement `SolutionRepository` với CRUD operations

#### 2.4. Knowledge Repository
- [ ] Tạo `IKnowledgeRepository` interface
- [ ] Implement `KnowledgeRepository` với CRUD operations

#### 2.5. Dashboard Repository
- [ ] Tạo `IDashboardRepository` interface
- [ ] Implement `DashboardRepository`:
  - `getStats()`
  - `getSystemHealth()`

### Phase 3: Migration (Day 3-4)

#### 3.1. Tạo Repository Service
- [ ] Tạo `RepositoryService` class
- [ ] Initialize tất cả repositories
- [ ] Export singleton instance

#### 3.2. Migrate Components
- [ ] **IncidentsPage**: Thay `apiService` bằng `repositoryService.incidents`
- [ ] **SolutionsPage**: Thay `apiService` bằng `repositoryService.solutions`
- [ ] **KnowledgePage**: Thay `apiService` bằng `repositoryService.knowledge`
- [ ] **Dashboard**: Thay `apiService` bằng `repositoryService.dashboard`
- [ ] **LoginForm**: Thay `apiService` bằng `repositoryService.auth`
- [ ] **Layout**: Thay `apiService` bằng `repositoryService.auth`

#### 3.3. Deprecate Old API Service
- [ ] Mark `api.ts` as deprecated
- [ ] Add migration guide comments
- [ ] Plan removal in next major version

### Phase 4: Testing & Documentation (Day 4-5)

#### 4.1. Unit Tests
- [ ] Test HTTP Client
- [ ] Test Base Repository
- [ ] Test each domain repository
- [ ] Test Repository Service

#### 4.2. Integration Tests
- [ ] Test repository với mock HTTP client
- [ ] Test error handling
- [ ] Test authentication flow

#### 4.3. Documentation
- [ ] Update README với Repository Pattern usage
- [ ] Tạo migration guide
- [ ] Tạo API documentation cho repositories

## 🔄 Migration Strategy

### Step-by-Step Migration

1. **Parallel Implementation**: 
   - Giữ `apiService` hoạt động
   - Implement repositories mới song song
   - Không break existing code

2. **Gradual Migration**:
   - Migrate từng component một
   - Test kỹ sau mỗi migration
   - Rollback dễ dàng nếu có vấn đề

3. **Backward Compatibility**:
   - `apiService` vẫn hoạt động trong thời gian transition
   - Có thể wrap `apiService` trong repository để compatibility

## 📊 Benefits

### Trước (Current)
```typescript
// Component trực tiếp gọi API service
const response = await apiService.getIncidents();
```

### Sau (Repository Pattern)
```typescript
// Component sử dụng repository
const response = await repositoryService.incidents.findAll();
```

### Advantages:
1. **Separation of Concerns**: Business logic tách khỏi API calls
2. **Testability**: Dễ mock repository trong tests
3. **Maintainability**: Thay đổi API chỉ cần sửa repository
4. **Type Safety**: TypeScript interfaces đảm bảo type safety
5. **Reusability**: Repository có thể reuse ở nhiều components
6. **Flexibility**: Dễ thay đổi HTTP client implementation

## 🎯 Success Criteria

- [ ] Tất cả components đã migrate sang Repository Pattern
- [ ] Unit tests coverage > 80%
- [ ] Không có breaking changes
- [ ] Performance không giảm
- [ ] Code quality improved (cleaner, more maintainable)
- [ ] Documentation đầy đủ

## 📅 Timeline

- **Week 1**: Phase 1-2 (Foundation + Domain Repositories)
- **Week 2**: Phase 3-4 (Migration + Testing)

## 🔍 Code Examples

### Example: Incident Repository Usage

```typescript
// Before
import apiService from '@/services/api';

const fetchIncidents = async () => {
  const response = await apiService.getIncidents(page, limit);
  setIncidents(response.data.items);
};

// After
import { repositoryService } from '@/services/repository.service';

const fetchIncidents = async () => {
  const response = await repositoryService.incidents.findAll({ page, limit });
  setIncidents(response.items);
};
```

### Example: Testing với Mock Repository

```typescript
// Test file
import { IIncidentRepository } from '@/repositories/incidents/IIncidentRepository';

const mockIncidentRepository: IIncidentRepository = {
  findAll: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Use mock in test
const component = render(<IncidentsPage />, {
  repositoryService: { incidents: mockIncidentRepository }
});
```

## 🚀 Next Steps

1. Review và approve kế hoạch
2. Bắt đầu Phase 1: Foundation
3. Setup testing infrastructure
4. Begin implementation

