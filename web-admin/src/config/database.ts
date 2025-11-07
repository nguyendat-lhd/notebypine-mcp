import PocketBase from 'pocketbase';

export interface DatabaseConfig {
  url: string;
  adminEmail: string;
  adminPassword: string;
}

export class DatabaseService {
  private client: PocketBase;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.client = new PocketBase(config.url);
  }

  async authenticate(): Promise<void> {
    try {
      await this.client.admins.authWithPassword(
        this.config.adminEmail,
        this.config.adminPassword
      );
      console.log('✅ PocketBase authentication successful');
    } catch (error) {
      console.error('❌ PocketBase authentication failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.client.health.check();
      return health.code === 200;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  getClient(): PocketBase {
    return this.client;
  }

  async createIncident(data: any) {
    return await this.client.collection('incidents').create(data);
  }

  async getIncidents(filter = '', page = 1, limit = 20) {
    return await this.client.collection('incidents').getList(page, limit, {
      filter,
      sort: '-created'
    });
  }

  async updateIncident(id: string, data: any) {
    return await this.client.collection('incidents').update(id, data);
  }

  async deleteIncident(id: string) {
    return await this.client.collection('incidents').delete(id);
  }

  async createSolution(data: any) {
    return await this.client.collection('solutions').create(data);
  }

  async getSolutions(filter = '', page = 1, limit = 20) {
    return await this.client.collection('solutions').getList(page, limit, {
      filter,
      sort: '-created'
    });
  }

  async updateSolution(id: string, data: any) {
    return await this.client.collection('solutions').update(id, data);
  }

  async deleteSolution(id: string) {
    return await this.client.collection('solutions').delete(id);
  }

  async getKnowledgeItems(filter = '', page = 1, limit = 50) {
    return await this.client.collection('knowledge_base').getList(page, limit, {
      filter,
      sort: '-created'
    });
  }

  async createKnowledgeItem(data: any) {
    return await this.client.collection('knowledge_base').create(data);
  }

  async updateKnowledgeItem(id: string, data: any) {
    return await this.client.collection('knowledge_base').update(id, data);
  }

  async deleteKnowledgeItem(id: string) {
    return await this.client.collection('knowledge_base').delete(id);
  }

  async searchIncidents(query: string) {
    return await this.client.collection('incidents').getFullList(200, {
      filter: `title ~ '${query}' || description ~ '${query}' || tags ~ '${query}'`,
      sort: '-created'
    });
  }

  async searchSolutions(query: string) {
    return await this.client.collection('solutions').getFullList(200, {
      filter: `title ~ '${query}' || description ~ '${query}' || tags ~ '${query}'`,
      sort: '-created'
    });
  }

  async searchKnowledge(query: string) {
    return await this.client.collection('knowledge_base').getFullList(500, {
      filter: `title ~ '${query}' || content ~ '${query}' || tags ~ '${query}'`,
      sort: '-created'
    });
  }

  async getStats() {
    const [incidents, solutions, knowledge] = await Promise.all([
      this.client.collection('incidents').getFullList(1, { total: true }),
      this.client.collection('solutions').getFullList(1, { total: true }),
      this.client.collection('knowledge_base').getFullList(1, { total: true })
    ]);

    return {
      incidents: incidents.totalItems,
      solutions: solutions.totalItems,
      knowledgeBase: knowledge.totalItems
    };
  }
}