import { BaseRepository } from '../base/BaseRepository.js';
import type { IHttpClient } from '../base/IHttpClient.js';
import type { Incident } from '@/types/index.js';
import type { 
  IIncidentRepository, 
  CreateIncidentDto, 
  UpdateIncidentDto 
} from './IIncidentRepository.js';

export class IncidentRepository 
  extends BaseRepository<Incident, CreateIncidentDto, UpdateIncidentDto>
  implements IIncidentRepository 
{
  constructor(httpClient: IHttpClient) {
    super(httpClient, '/api/v1/incidents');
  }
}

