import { BaseRepository } from '../base/BaseRepository.js';
import type { IHttpClient } from '../base/IHttpClient.js';
import type { Solution } from '@/types/index.js';
import type { 
  ISolutionRepository, 
  CreateSolutionDto, 
  UpdateSolutionDto 
} from './ISolutionRepository.js';

export class SolutionRepository 
  extends BaseRepository<Solution, CreateSolutionDto, UpdateSolutionDto>
  implements ISolutionRepository 
{
  constructor(httpClient: IHttpClient) {
    super(httpClient, '/api/v1/solutions');
  }
}

