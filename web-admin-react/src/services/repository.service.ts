import { HttpClient } from '@/repositories/http/HttpClient.js';
import type { IHttpClient } from '@/repositories/base/IHttpClient.js';

// Auth
import { AuthRepository } from '@/repositories/auth/AuthRepository.js';
import type { IAuthRepository } from '@/repositories/auth/IAuthRepository.js';

// Incidents
import { IncidentRepository } from '@/repositories/incidents/IncidentRepository.js';
import type { IIncidentRepository } from '@/repositories/incidents/IIncidentRepository.js';

// Solutions
import { SolutionRepository } from '@/repositories/solutions/SolutionRepository.js';
import type { ISolutionRepository } from '@/repositories/solutions/ISolutionRepository.js';

// Knowledge
import { KnowledgeRepository } from '@/repositories/knowledge/KnowledgeRepository.js';
import type { IKnowledgeRepository } from '@/repositories/knowledge/IKnowledgeRepository.js';

// Dashboard
import { DashboardRepository } from '@/repositories/dashboard/DashboardRepository.js';
import type { IDashboardRepository } from '@/repositories/dashboard/IDashboardRepository.js';

export class RepositoryService {
  private httpClient: IHttpClient;

  // Repositories
  public readonly auth: IAuthRepository;
  public readonly incidents: IIncidentRepository;
  public readonly solutions: ISolutionRepository;
  public readonly knowledge: IKnowledgeRepository;
  public readonly dashboard: IDashboardRepository;

  constructor() {
    // Initialize HTTP client
    this.httpClient = new HttpClient();

    // Initialize repositories
    this.auth = new AuthRepository(this.httpClient);
    this.incidents = new IncidentRepository(this.httpClient);
    this.solutions = new SolutionRepository(this.httpClient);
    this.knowledge = new KnowledgeRepository(this.httpClient);
    this.dashboard = new DashboardRepository(this.httpClient);
  }
}

// Export singleton instance
export const repositoryService = new RepositoryService();

