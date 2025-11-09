import type { Solution } from '@/types/index.js';
import type { PaginationParams, PaginatedResponse } from '../base/BaseRepository.js';

export interface CreateSolutionDto {
  title: string;
  description: string;
  steps: string[];
  category: string;
  tags?: string[];
  verified?: boolean;
  incidentId?: string;
}

export interface UpdateSolutionDto extends Partial<CreateSolutionDto> {}

export interface ISolutionRepository {
  findAll(params?: PaginationParams): Promise<PaginatedResponse<Solution>>;
  findOne(id: string): Promise<Solution>;
  create(data: CreateSolutionDto): Promise<Solution>;
  update(id: string, data: UpdateSolutionDto): Promise<Solution>;
  delete(id: string): Promise<void>;
}

