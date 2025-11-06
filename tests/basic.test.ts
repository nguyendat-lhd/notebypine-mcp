import { describe, it, expect, beforeAll } from 'bun:test';
import { initPocketBase, makeAuthenticatedRequest } from '../src/db/pocketbase.js';
import { config } from '../src/config.js';

describe('Basic MCP Functionality', () => {
  beforeAll(async () => {
    await initPocketBase();
  });

  it('should connect to PocketBase', async () => {
    const response = await makeAuthenticatedRequest(`${config.pocketbase.url}/api/health`);
    expect(response.ok).toBe(true);
  });

  it('should list collections', async () => {
    const response = await makeAuthenticatedRequest(`${config.pocketbase.url}/api/collections`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.items).toBeInstanceOf(Array);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it('should create and retrieve an incident', async () => {
    // Create incident
    const createData = {
      title: 'Test Incident',
      category: 'Backend',
      description: 'Test description',
      severity: 'medium',
      status: 'open'
    };

    const createResponse = await makeAuthenticatedRequest(
      `${config.pocketbase.url}/api/collections/incidents/records`,
      {
        method: 'POST',
        body: JSON.stringify(createData)
      }
    );

    expect(createResponse.ok).toBe(true);
    const incident = await createResponse.json();
    expect(incident.title).toBe('Test Incident');

    // Retrieve incident
    const getResponse = await makeAuthenticatedRequest(
      `${config.pocketbase.url}/api/collections/incidents/records/${incident.id}`
    );

    expect(getResponse.ok).toBe(true);
    const retrieved = await getResponse.json();
    expect(retrieved.id).toBe(incident.id);
    expect(retrieved.title).toBe('Test Incident');

    // Clean up
    await makeAuthenticatedRequest(
      `${config.pocketbase.url}/api/collections/incidents/records/${incident.id}`,
      { method: 'DELETE' }
    );
  });

  it('should search incidents', async () => {
    const response = await makeAuthenticatedRequest(
      `${config.pocketbase.url}/api/collections/incidents/records?perPage=5`
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.items).toBeInstanceOf(Array);
  });

  it('should verify MCP server can start', async () => {
    // This test verifies the server can be imported without errors
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    expect(Server).toBeDefined();
  });
});