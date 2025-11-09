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
}

