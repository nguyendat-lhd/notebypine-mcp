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

