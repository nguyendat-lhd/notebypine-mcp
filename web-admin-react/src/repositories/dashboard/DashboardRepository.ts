import type { DashboardStats, SystemHealth } from '@/types/index.js';
import type { ApiResponse } from '@/types/index.js';
import type { IHttpClient } from '../base/IHttpClient.js';
import type { IDashboardRepository } from './IDashboardRepository.js';

export class DashboardRepository implements IDashboardRepository {
  constructor(private httpClient: IHttpClient) {}

  async getStats(): Promise<DashboardStats> {
    const response = await this.httpClient.get<ApiResponse<DashboardStats>>(
      '/api/v1/incidents/stats/summary'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch dashboard stats');
    }

    return response.data;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await this.httpClient.get<ApiResponse<SystemHealth>>(
      '/api/v1/health/status'
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch system health');
    }

    return response.data;
  }
}

