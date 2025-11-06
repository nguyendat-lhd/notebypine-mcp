import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { handleCreateIncident, handleSearchIncidents, handleAddSolution } from '../../src/mcp/handlers.js';
import { initPocketBase } from '../../src/db/pocketbase.js';

describe('MCP Tools', () => {
  beforeAll(async () => {
    // Initialize PocketBase for testing
    await initPocketBase();
  });

  describe('handleCreateIncident', () => {
    it('should create an incident with valid data', async () => {
      const result = await handleCreateIncident({
        title: 'Test Incident',
        category: 'Backend',
        description: 'This is a test incident for unit testing',
        severity: 'medium'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Incident created successfully');
      expect(result.content[0].text).toContain('Test Incident');
      expect(result.isError).toBeUndefined();
    });

    it('should reject invalid category', async () => {
      const result = await handleCreateIncident({
        title: 'Test Incident',
        category: 'InvalidCategory',
        description: 'This should fail',
        severity: 'medium'
      });

      expect(result.content[0].text).toContain('❌ Error creating incident');
      expect(result.isError).toBe(true);
    });

    it('should reject missing required fields', async () => {
      const result = await handleCreateIncident({
        title: 'Test Incident',
        // Missing category, description, severity
      });

      expect(result.content[0].text).toContain('❌ Error creating incident');
      expect(result.isError).toBe(true);
    });
  });

  describe('handleSearchIncidents', () => {
    it('should search incidents with valid query', async () => {
      const result = await handleSearchIncidents({
        query: 'Test',
        limit: 5
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBeUndefined();
    });

    it('should reject empty query', async () => {
      const result = await handleSearchIncidents({
        query: '',
        limit: 5
      });

      expect(result.content[0].text).toContain('❌ Error searching incidents');
      expect(result.isError).toBe(true);
    });

    it('should reject invalid limit', async () => {
      const result = await handleSearchIncidents({
        query: 'Test',
        limit: 200  // Exceeds maximum of 100
      });

      expect(result.content[0].text).toContain('❌ Error searching incidents');
      expect(result.isError).toBe(true);
    });

    it('should search with filters', async () => {
      const result = await handleSearchIncidents({
        query: 'Test',
        category: 'Backend',
        severity: 'medium',
        status: 'open',
        limit: 10
      });

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('handleAddSolution', () => {
    let testIncidentId: string;

    beforeAll(async () => {
      // Create a test incident for solution testing
      const incidentResult = await handleCreateIncident({
        title: 'Test Incident for Solution',
        category: 'Frontend',
        description: 'Test incident for adding solution',
        severity: 'low'
      });

      // Extract incident ID from the result
      const match = incidentResult.content[0].text.match(/ID: ([a-zA-Z0-9]+)/);
      if (match) {
        testIncidentId = match[1];
      }
    });

    it('should add solution with valid data', async () => {
      const result = await handleAddSolution({
        incident_id: testIncidentId,
        solution_title: 'Test Solution',
        solution_description: 'This is a test solution',
        steps: 'Step 1: Do this\nStep 2: Do that'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('✅ Solution added successfully');
      expect(result.content[0].text).toContain('Test Solution');
      expect(result.isError).toBeUndefined();
    });

    it('should reject missing required fields', async () => {
      const result = await handleAddSolution({
        incident_id: testIncidentId,
        solution_title: 'Test Solution',
        // Missing solution_description and steps
      });

      expect(result.content[0].text).toContain('❌ Error adding solution');
      expect(result.isError).toBe(true);
    });

    it('should reject invalid incident ID', async () => {
      const result = await handleAddSolution({
        incident_id: 'invalid-id',
        solution_title: 'Test Solution',
        solution_description: 'This should fail',
        steps: 'Test steps'
      });

      expect(result.content[0].text).toContain('❌ Error adding solution');
      expect(result.isError).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow', async () => {
      // 1. Create incident
      const incidentResult = await handleCreateIncident({
        title: 'Integration Test Incident',
        category: 'DevOps',
        description: 'Testing complete workflow',
        severity: 'high'
      });

      expect(incidentResult.content[0].text).toContain('✅ Incident created successfully');

      // Extract incident ID
      const incidentMatch = incidentResult.content[0].text.match(/ID: ([a-zA-Z0-9]+)/);
      expect(incidentMatch).toBeTruthy();
      const incidentId = incidentMatch![1];

      // 2. Search for the incident
      const searchResult = await handleSearchIncidents({
        query: 'Integration Test Incident',
        limit: 5
      });

      expect(searchResult.content[0].text).toContain('Integration Test Incident');

      // 3. Add solution
      const solutionResult = await handleAddSolution({
        incident_id: incidentId,
        solution_title: 'Integration Test Solution',
        solution_description: 'Complete workflow solution',
        steps: '1. Analyze\n2. Implement\n3. Test'
      });

      expect(solutionResult.content[0].text).toContain('✅ Solution added successfully');
    });
  });
});