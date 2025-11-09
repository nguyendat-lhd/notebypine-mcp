import type { DashboardStats, SystemHealth } from '@/types/index.js';

export interface IDashboardRepository {
  getStats(): Promise<DashboardStats>;
  getSystemHealth(): Promise<SystemHealth>;
}

