import type { KnowledgeItem } from '@/types/index.js';
import type { PaginationParams, PaginatedResponse } from '../base/BaseRepository.js';

export interface CreateKnowledgeDto {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateKnowledgeDto extends Partial<CreateKnowledgeDto> {}

export interface IKnowledgeRepository {
  findAll(params?: PaginationParams): Promise<PaginatedResponse<KnowledgeItem>>;
  findOne(id: string): Promise<KnowledgeItem>;
  create(data: CreateKnowledgeDto): Promise<KnowledgeItem>;
  update(id: string, data: UpdateKnowledgeDto): Promise<KnowledgeItem>;
  delete(id: string): Promise<void>;
}

