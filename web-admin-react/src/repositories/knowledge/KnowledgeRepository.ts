import { BaseRepository } from '../base/BaseRepository.js';
import type { IHttpClient } from '../base/IHttpClient.js';
import type { KnowledgeItem } from '@/types/index.js';
import type { 
  IKnowledgeRepository, 
  CreateKnowledgeDto, 
  UpdateKnowledgeDto 
} from './IKnowledgeRepository.js';

export class KnowledgeRepository 
  extends BaseRepository<KnowledgeItem, CreateKnowledgeDto, UpdateKnowledgeDto>
  implements IKnowledgeRepository 
{
  constructor(httpClient: IHttpClient) {
    super(httpClient, '/api/v1/knowledge');
  }
}

