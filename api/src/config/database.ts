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
    
    // Configure auto-cancellation to prevent request cancellation issues
    // Set a reasonable timeout to prevent hanging requests
    this.client.autoCancellation(false); // Disable auto-cancellation to prevent errors
  }

  async authenticate(): Promise<boolean> {
    try {
      // Use REST API directly instead of SDK method to avoid version compatibility issues
      const authResponse = await fetch(`${this.config.url}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: this.config.adminEmail,
          password: this.config.adminPassword,
        }),
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json().catch(() => ({}));
        const errorMessage = `Authentication failed: ${authResponse.status} - ${errorData.message || authResponse.statusText}`;
        console.error('⚠️  PocketBase authentication failed:', errorMessage);
        // Clear any stale auth data
        this.client.authStore.clear();
        return false;
      }

      const authData = await authResponse.json();
      // Store token in client for subsequent requests
      if (authData.token && authData.admin) {
        this.client.authStore.save(authData.token, authData.admin);
        console.log('✅ PocketBase authentication successful');
        return true;
      } else {
        console.error('⚠️  Invalid authentication response format');
        return false;
      }
    } catch (error: any) {
      console.error('⚠️  PocketBase authentication error:', error.message || error);
      // Clear any stale auth data
      this.client.authStore.clear();
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Check if we have a valid auth token first
      if (!this.client.authStore.isValid) {
        // Try to re-authenticate if token is invalid
        const authenticated = await this.authenticate();
        if (!authenticated) {
          return false;
        }
      }

      // Test connection using health check
      try {
        const health = await this.client.health.check();
        return health.code === 200;
      } catch (healthError) {
        // If health check fails, try a simple fetch to verify PocketBase is reachable
        try {
          const response = await fetch(`${this.config.url}/api/health`);
          return response.ok;
        } catch (fetchError) {
          console.error('Database connection test failed:', fetchError);
          return false;
        }
      }
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
    // Ensure we're authenticated before making the query
    // Re-authenticate if token is invalid or expired
    if (!this.client.authStore.isValid) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with PocketBase');
      }
    }
    
    try {
      return await this.client.collection('incidents').getList(page, limit, {
        filter,
        sort: '-created'
      });
    } catch (error: any) {
      // Handle autocancellation or authentication errors
      if (error?.message?.includes('autocancelled') || error?.status === 401 || error?.status === 403) {
        console.warn('Authentication may have expired, re-authenticating...');
        // Try to re-authenticate and retry once
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Failed to re-authenticate with PocketBase');
        }
        // Retry the request
        return await this.client.collection('incidents').getList(page, limit, {
          filter,
          sort: '-created'
        });
      }
      throw error;
    }
  }

  async updateIncident(id: string, data: any) {
    // Ensure we're authenticated before making the query
    if (!this.client.authStore.isValid) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with PocketBase');
      }
    }
    
    try {
      console.log('Updating incident in PocketBase:', { id, data });
      const result = await this.client.collection('incidents').update(id, data);
      console.log('PocketBase update result:', result);
      return result;
    } catch (error: any) {
      console.error('PocketBase update error:', error);
      // Handle autocancellation or authentication errors
      if (error?.message?.includes('autocancelled') || error?.status === 401 || error?.status === 403) {
        console.warn('Authentication may have expired, re-authenticating...');
        const authenticated = await this.authenticate();
        if (!authenticated) {
          throw new Error('Failed to re-authenticate with PocketBase');
        }
        // Retry the request
        return await this.client.collection('incidents').update(id, data);
      }
      throw error;
    }
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
    try {
      const stats: any = {
        incidents: 0,
        solutions: 0,
        knowledgeBase: 0
      };

      // Get incidents count - use getList to get totalItems
      try {
        const incidents = await this.client.collection('incidents').getList(1, 1, {});
        stats.incidents = incidents.totalItems || 0;
      } catch (error) {
        console.warn('Failed to get incidents count:', error);
      }

      // Get solutions count - use getList to get totalItems
      try {
        const solutions = await this.client.collection('solutions').getList(1, 1, {});
        stats.solutions = solutions.totalItems || 0;
      } catch (error) {
        console.warn('Failed to get solutions count:', error);
      }

      // Get knowledge base count (collection might not exist) - use getList to get totalItems
      try {
        const knowledge = await this.client.collection('knowledge_base').getList(1, 1, {});
        stats.knowledgeBase = knowledge.totalItems || 0;
      } catch (error: any) {
        // Collection might not exist, that's OK
        if (error.status !== 404) {
          console.warn('Failed to get knowledge base count:', error);
        }
        stats.knowledgeBase = 0;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get stats:', error);
      // Return default stats on error
      return {
        incidents: 0,
        solutions: 0,
        knowledgeBase: 0
      };
    }
  }
}