/**
 * Example: End-to-end incident to knowledge base workflow
 * Demonstrates orchestration of multiple tools and skills
 */

import { callMCPTool } from '../helpers/callMCPTool.js';
import { searchTools } from '../helpers/searchTools.js';
import { triageFromLogfile } from '../skills/triageFromLogfile.js';
import { saveSheetAsCSV } from '../skills/saveSheetAsCSV.js';
import { safeLog } from '../helpers/redact.js';

export interface IncidentToKBConfig {
  logSource?: string;
  category?: string;
  severity?: string;
  autoTag?: boolean;
  exportFormat?: 'json' | 'csv' | 'markdown';
  outputPath?: string;
}

export interface WorkflowResult {
  success: boolean;
  incidentsCreated: string[];
  knowledgeExported: string;
  summary: string;
  errors: string[];
}

/**
 * Complete workflow: Parse logs -> Create incidents -> Extract knowledge -> Export
 */
export async function incidentToKnowledgeBaseWorkflow(
  logContent: string,
  config: IncidentToKBConfig = {}
): Promise<WorkflowResult> {
  const result: WorkflowResult = {
    success: false,
    incidentsCreated: [],
    knowledgeExported: '',
    summary: '',
    errors: []
  };

  try {
    console.log('🚀 Starting Incident to Knowledge Base workflow...\n');

    // Step 1: Triage logs and create incidents
    console.log('📋 Step 1: Triage log entries');
    const triageResult = await triageFromLogfile(logContent, {
      severityThresholds: {
        'error': config.severity === 'critical' ? 'critical' : 'high',
        'critical': 'critical',
        'warn': 'medium'
      },
      maxIncidentsPerBatch: 3
    });

    if (triageResult.incidentsCreated === 0) {
      result.summary = 'No incidents created from logs - workflow completed';
      result.success = true;
      return result;
    }

    result.incidentsCreated = triageResult.createdIncidentIds;
    console.log(`✅ Created ${triageResult.incidentsCreated} incidents\n`);

    // Step 2: For each incident, search for similar ones and extract lessons
    console.log('🔍 Step 2: Analyze incidents and extract knowledge');

    for (const incidentId of result.incidentsCreated) {
      try {
        // Find similar incidents
        const similarResult = await callMCPTool('get_similar_incidents', {
          incident_id: incidentId,
          limit: 3
        });

        if (similarResult.success && similarResult.data?.items?.length > 0) {
          console.log(`📚 Found ${similarResult.data.items.length} similar incidents for ${incidentId}`);

          // Extract lessons from the incident
          const lessonsResult = await callMCPTool('extract_lessons', {
            incident_id: incidentId,
            problem_summary: 'Analysis from log triage workflow',
            root_cause: 'To be determined based on similar incidents',
            prevention: 'Preventive measures based on incident analysis',
            lesson_type: 'prevention'
          });

          if (lessonsResult.success) {
            console.log(`📖 Lessons extracted for incident ${incidentId}`);
          } else {
            result.errors.push(`Failed to extract lessons for ${incidentId}: ${lessonsResult.error}`);
          }
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing incident ${incidentId}: ${errorMsg}`);
      }
    }

    // Step 3: Export knowledge base
    console.log('\n📤 Step 3: Export knowledge base');
    const exportResult = await callMCPTool('export_knowledge', {
      format: config.exportFormat || 'json',
      filter: {
        category: config.category,
        severity: config.severity
      }
    });

    if (exportResult.success) {
      const exportData = exportResult.data;
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `knowledge_export_${timestamp}.${config.exportFormat || 'json'}`;
      const filePath = config.outputPath || `./out/${fileName}`;

      if (config.exportFormat === 'csv' && Array.isArray(exportData)) {
        // Use our CSV skill for better formatting
        const csvResult = saveSheetAsCSV(exportData, 'knowledge_base', filePath);
        if (csvResult.success) {
          result.knowledgeExported = csvResult.filePath || '';
          console.log(`💾 Knowledge exported to CSV: ${result.knowledgeExported}`);
        } else {
          result.errors.push(`CSV export failed: ${csvResult.error}`);
        }
      } else {
        // For JSON or other formats, we could save directly here
        // For now, we'll just note that export was successful
        result.knowledgeExported = `Exported ${Array.isArray(exportData) ? exportData.length : 1} items`;
        console.log(`📊 Knowledge exported: ${result.knowledgeExported}`);
      }
    } else {
      result.errors.push(`Knowledge export failed: ${exportResult.error}`);
    }

    // Generate final summary
    result.success = result.errors.length === 0;
    result.summary = `
🎯 Incident to Knowledge Base Workflow Summary:
✅ Incidents created: ${result.incidentsCreated.length}
📖 Knowledge items processed: ${result.knowledgeExported}
❌ Errors encountered: ${result.errors.length}

Incident IDs: ${result.incidentsCreated.join(', ') || 'None'}
Knowledge Export: ${result.knowledgeExported}
Errors: ${result.errors.join('; ') || 'None'}
    `.trim();

    console.log('\n' + result.summary);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Workflow failed: ${errorMsg}`);
    result.summary = `❌ Workflow failed: ${errorMsg}`;
    console.error(result.summary);
  }

  return result;
}

/**
 * Quick demo with sample log data
 */
export async function runDemo(): Promise<void> {
  console.log('🧪 Running Incident to Knowledge Base Demo\n');

  // Sample log data for demonstration
  const sampleLogs = `
2024-01-15T10:30:15Z ERROR Database connection failed: Connection timeout after 30 seconds
2024-01-15T10:30:16Z WARN Retry attempt 1 for database connection
2024-01-15T10:30:46Z ERROR Database connection failed: Connection timeout after 30 seconds
2024-01-15T10:30:47Z ERROR Service unavailable: Cannot connect to database
2024-01-15T10:31:00Z INFO Admin notified of database connectivity issues
2024-01-15T10:35:00Z CRITICAL System overload: Request queue exceeded 10000 pending requests
2024-01-15T10:35:01Z ERROR Load balancer rejecting new connections
2024-01-15T10:36:00Z WARN Manual intervention required for system recovery
  `.trim();

  const config: IncidentToKBConfig = {
    category: 'Backend',
    severity: 'high',
    exportFormat: 'json',
    autoTag: true
  };

  const result = await incidentToKnowledgeBaseWorkflow(sampleLogs, config);

  if (result.success) {
    console.log('\n🎉 Demo completed successfully!');
  } else {
    console.log('\n⚠️ Demo completed with errors (this is expected in demo mode)');
  }
}

/**
 * Find and demonstrate appropriate tools for a given task
 */
export function demonstrateToolDiscovery(taskDescription: string): void {
  console.log(`🔧 Tool Discovery for: "${taskDescription}"\n`);

  // Use searchTools to find relevant tools
  const searchResults = searchTools(taskDescription, {
    includeDescriptions: true,
    includeSpecPaths: true,
    maxResults: 5
  });

  if (searchResults.length > 0) {
    console.log('Found relevant tools:');
    searchResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.tool.name} (${(result.relevanceScore * 100).toFixed(1)}% relevance)`);
      console.log(`   ${result.tool.briefDescription}`);
      if (result.matchedKeywords.length > 0) {
        console.log(`   Matched: ${result.matchedKeywords.join(', ')}`);
      }
      console.log(`   Spec: ${result.tool.specPath}\n`);
    });
  } else {
    console.log('No specific tools found for this task.');
  }

  // Get workflow suggestions
  const { primaryTools, secondaryTools, reasoning } = searchTools.findToolsForTask(taskDescription);

  console.log('Workflow Suggestion:');
  console.log(`Reasoning: ${reasoning}\n`);

  if (primaryTools.length > 0) {
    console.log('Primary Tools:');
    primaryTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.briefDescription}`);
    });
  }

  if (secondaryTools.length > 0) {
    console.log('Secondary Tools:');
    secondaryTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.briefDescription}`);
    });
  }
}

// Export for use in other modules
export default {
  incidentToKnowledgeBaseWorkflow,
  runDemo,
  demonstrateToolDiscovery
};

// Run demo if called directly
if (import.meta.main) {
  const command = process.argv[2];

  if (command === 'demo') {
    await runDemo();
  } else if (command === 'discover') {
    const taskDescription = process.argv[3] || 'incident management';
    demonstrateToolDiscovery(taskDescription);
  } else {
    console.log('Usage:');
    console.log('  bun agent/examples/incident_to_kb.ts demo          # Run demo workflow');
    console.log('  bun agent/examples/incident_to_kb.ts discover <task> # Show tool discovery for task');
    process.exit(1);
  }
}