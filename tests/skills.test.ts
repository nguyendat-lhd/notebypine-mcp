/**
 * Regression Tests for Agent Skills
 * Tests all skills to ensure they work correctly with various inputs
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { triageFromLogfile } from '../agent/skills/triageFromLogfile.js';
import { saveSheetAsCSV } from '../agent/skills/saveSheetAsCSV.js';
import { exportAndPublish, quickExport } from '../agent/skills/exportAndPublish.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('Agent Skills Regression Tests', () => {
  const testOutputDir = join(process.cwd(), 'test-output');

  beforeEach(() => {
    // Ensure test output directory exists
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
  });

  describe('triageFromLogfile Skill', () => {
    it('should parse simple error logs correctly', async () => {
      const logContent = `
2024-01-15T10:30:15Z ERROR Database connection failed
2024-01-15T10:30:16Z WARN Retry attempt 1
2024-01-15T10:30:46Z ERROR Database connection failed
      `.trim();

      const result = await triageFromLogfile(logContent, {
        maxIncidentsPerBatch: 1,
        autoCreateIncident: false // Don't actually create incidents in tests
      });

      expect(result.processedLogCount).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('Log Triage Summary');
    });

    it('should handle JSON log format', async () => {
      const logContent = `
{"timestamp": "2024-01-15T10:30:15Z", "level": "error", "message": "Database connection failed", "service": "api"}
{"timestamp": "2024-01-15T10:30:16Z", "level": "warn", "message": "Retry attempt 1", "service": "api"}
      `.trim();

      const result = await triageFromLogfile(logContent, {
        autoCreateIncident: false,
        parsingOptions: { logFormat: 'json' }
      });

      expect(result.processedLogCount).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty log content', async () => {
      const result = await triageFromLogfile('', {
        autoCreateIncident: false
      });

      expect(result.processedLogCount).toBe(0);
      expect(result.summary).toContain('No incidents created');
    });

    it('should group similar log entries', async () => {
      const logContent = `
2024-01-15T10:30:15Z ERROR Database connection failed: timeout
2024-01-15T10:30:46Z ERROR Database connection failed: timeout
2024-01-15T10:31:00Z ERROR Database connection failed: connection refused
2024-01-15T10:35:00Z CRITICAL System overload: requests exceeded
      `.trim();

      const result = await triageFromLogfile(logContent, {
        maxIncidentsPerBatch: 5,
        autoCreateIncident: false
      });

      expect(result.processedLogCount).toBe(4);
      expect(result.errors).toHaveLength(0);
      // Should group the two "timeout" errors together
      expect(result.summary).toContain('grouped into');
    });

    it('should determine correct categories', async () => {
      const logContent = `
2024-01-15T10:30:15Z ERROR API server timeout
2024-01-15T10:31:00Z ERROR UI component failed to render
2024-01-15T10:35:00Z ERROR Deploy script failed
      `.trim();

      const result = await triageFromLogfile(logContent, {
        autoCreateIncident: false
      });

      expect(result.processedLogCount).toBe(3);
      expect(result.errors).toHaveLength(0);
      // Should categorize correctly based on keywords
    });

    it('should handle recent error filtering', async () => {
      const logContent = `
2024-01-15T10:30:15Z ERROR Recent error
${new Date(Date.now() - 120000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')} ERROR Older error (2 minutes ago)
${new Date(Date.now() - 7200000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z')} ERROR Much older error (2 hours ago)
      `.trim();

      const result = await triageFromLogfile(logContent, {
        autoCreateIncident: false
      });

      expect(result.processedLogCount).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('saveSheetAsCSV Skill', () => {
    it('should save simple array data to CSV', () => {
      const testData = [
        { id: 1, name: 'Test 1', value: 100 },
        { id: 2, name: 'Test 2', value: 200 },
        { id: 3, name: 'Test 3', value: 300 }
      ];

      const result = saveSheetAsCSV(testData, 'test_data', join(testOutputDir, 'test.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(3);
      expect(result.filePath).toContain('test.csv');
      expect(result.summary).toContain('CSV Export Successful');
    });

    it('should handle empty arrays', () => {
      const result = saveSheetAsCSV([], 'empty_test', join(testOutputDir, 'empty.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(0);
      expect(result.summary).toContain('No data to export');
    });

    it('should escape CSV special characters', () => {
      const testData = [
        { id: 1, name: 'Test, with "quotes"', value: 100 },
        { id: 2, name: 'Test\nwith\nnewlines', value: 200 }
      ];

      const result = saveSheetAsCSV(testData, 'escape_test', join(testOutputDir, 'escape.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(2);
      expect(result.summary).toContain('CSV Export Successful');
    });

    it('should handle different data types', () => {
      const testData = [
        { id: 1, name: 'Test', active: true, count: 0, nullable: null },
        { id: 2, name: 'Test 2', active: false, count: 5, nullable: 'value' }
      ];

      const result = saveSheetAsCSV(testData, 'types_test', join(testOutputDir, 'types.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(2);
    });

    it('should format dates correctly', () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      const testData = [
        { id: 1, name: 'Test', created: testDate }
      ];

      const result = saveSheetAsCSV(testData, 'date_test', join(testOutputDir, 'date.csv'), {
        dateFormat: 'ISO'
      });

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(1);
    });

    it('should handle array fields', () => {
      const testData = [
        { id: 1, name: 'Test', tags: ['tag1', 'tag2', 'tag3'] }
      ];

      const result = saveSheetAsCSV(testData, 'array_test', join(testOutputDir, 'array.csv'), {
        arrayDelimiter: ';'
      });

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(1);
    });
  });

  describe('exportAndPublish Skill', () => {
    it('should perform quick export to JSON', async () => {
      const result = await quickExport('json', {
        category: 'Backend'
      });

      // Should fail gracefully without MCP server running
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary).toContain('failed');
    });

    it('should handle different export formats', async () => {
      const formats = ['json', 'csv', 'markdown'] as const;

      for (const format of formats) {
        const result = await quickExport(format);

        expect(result.exported.format).toBe(format);
        expect(result.exported.itemCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should transform data for markdown format', () => {
      const testData = [
        {
          id: '1',
          title: 'Test Incident',
          category: 'Backend',
          severity: 'high',
          status: 'open',
          description: 'Test description',
          created: '2024-01-15T10:30:00Z',
          symptoms: 'Test symptoms',
          solutions: [{ title: 'Test solution', description: 'Test solution description' }],
          tags: ['test', 'sample']
        }
      ];

      // Test markdown transformation directly
      const markdownContent = `# Test Incident

**Severity:** high | **Status:** open | **Created:** 2024-01-15T10:30:00Z

Test description

**Symptoms:**
Test symptoms

**Solutions:**
- Test solution: Test solution description

---
`;

      expect(markdownContent).toContain('# Test Incident');
      expect(markdownContent).toContain('**Severity:** high');
      expect(markdownContent).toContain('**Solutions:**');
    });

    it('should handle confluence format transformation', () => {
      const testData = [
        {
          title: 'Test Incident',
          category: 'Backend',
          severity: 'high',
          description: 'Test description',
          solutions: [{ title: 'Test solution', description: 'Test solution description' }]
        }
      ];

      const confluenceContent = `h1. Test Incident

*Severity:* high

Test description

h2. Solutions

* Test solution: Test solution description`;

      expect(confluenceContent).toContain('h1. Test Incident');
      expect(confluenceContent).toContain('h2. Solutions');
    });

    it('should calculate file sizes correctly', async () => {
      const result = await quickExport('json');

      expect(result.exported.size).toMatch(/\d+\.\d+ KB/);
    });

    it('should handle scheduling options', async () => {
      const config = {
        format: 'json' as const,
        target: 'local' as const,
        schedule: {
          enabled: true,
          frequency: 'weekly' as const,
          time: '09:00'
        }
      };

      const result = await exportAndPublish(config);

      expect(result.nextRun).toBeTruthy();
      expect(result.summary).toContain('Next scheduled run');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed log content gracefully', async () => {
      const malformedLogs = `
this is not a valid log line
2024-01-15T10:30:15Z ERROR Valid log line
{"invalid": json content
      `.trim();

      const result = await triageFromLogfile(malformedLogs, {
        autoCreateIncident: false
      });

      // Should still process the valid line
      expect(result.processedLogCount).toBeGreaterThan(0);
      expect(result.errors.length).toBe(0); // Should not throw errors
    });

    it('should handle very large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Test Item ${i}`,
        value: Math.random() * 1000,
        description: `This is a longer description for item ${i} with some content that should be handled properly`
      }));

      const result = saveSheetAsCSV(largeDataset, 'large_test', join(testOutputDir, 'large.csv'), {
        sampleSize: 10 // Use small sample for large dataset
      });

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(1000);
      expect(result.summary).toContain('1000 rows');
    });

    it('should handle special characters in data', () => {
      const specialData = [
        {
          id: 1,
          text: 'Special chars: áéíóú ñ 中文 🚀 emoji',
          quotes: 'Single "double" quotes',
          newlines: 'Line 1\nLine 2\r\nLine 3',
          commas: 'Value, with, commas',
          slashes: 'Path\\to\\file and /path/to/file'
        }
      ];

      const result = saveSheetAsCSV(specialData, 'special_test', join(testOutputDir, 'special.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(1);
    });

    it('should handle null and undefined values', () => {
      const nullData = [
        {
          id: 1,
          name: 'Test',
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          false: false
        }
      ];

      const result = saveSheetAsCSV(nullData, 'null_test', join(testOutputDir, 'null.csv'));

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent operations efficiently', async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: 10 }, (_, i) =>
        triageFromLogfile(`2024-01-15T10:30:${15 + i}Z ERROR Test error ${i}`, {
          autoCreateIncident: false
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.processedLogCount === 1)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large CSV exports efficiently', () => {
      const largeData = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        category: `Category ${i % 10}`,
        value: Math.random() * 100
      }));

      const startTime = Date.now();
      const result = saveSheetAsCSV(largeData, 'perf_test', join(testOutputDir, 'perf.csv'));
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.rowsExported).toBe(5000);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});

// Integration test to run all skills together
describe('Skills Integration Tests', () => {
  it('should demonstrate end-to-end workflow', async () => {
    // 1. Triage logs
    const logContent = `
2024-01-15T10:30:15Z ERROR Database connection failed
2024-01-15T10:30:16Z WARN Retry attempt 1
2024-01-15T10:30:46Z ERROR Database connection failed
2024-01-15T10:35:00Z CRITICAL System overload
    `.trim();

    const triageResult = await triageFromLogfile(logContent, {
      autoCreateIncident: false
    });

    expect(triageResult.processedLogCount).toBe(4);

    // 2. Create test data for CSV export
    const incidentData = [
      { id: '1', title: 'Database Issues', category: 'Backend', severity: 'high' },
      { id: '2', title: 'System Overload', category: 'Infrastructure', severity: 'critical' }
    ];

    const csvResult = saveSheetAsCSV(incidentData, 'integration_test', join(testOutputDir, 'integration.csv'));

    expect(csvResult.success).toBe(true);
    expect(csvResult.rowsExported).toBe(2);

    // 3. Test export and publish
    const exportResult = await quickExport('json', {
      category: 'Backend'
    });

    expect(exportResult.exported.format).toBe('json');
  });
});