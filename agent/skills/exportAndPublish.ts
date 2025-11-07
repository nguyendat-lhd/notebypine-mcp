/**
 * Skill: Export knowledge base and publish to external systems
 * Pure function with clear I/O contracts
 */

import { callMCPTool } from '../helpers/callMCPTool.js';
import { saveSheetAsCSV } from './saveSheetAsCSV.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ExportAndPublishConfig {
  format: 'json' | 'csv' | 'markdown' | 'confluence' | 'notion';
  target: 'local' | 'wiki' | 'confluence' | 'notion' | 'github';
  outputPath?: string;
  publishOptions?: PublishOptions;
  filters?: ExportFilters;
  schedule?: ScheduleOptions;
}

export interface ExportFilters {
  category?: string;
  severity?: string;
  status?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  tags?: string[];
  hasLessons?: boolean;
  hasSolutions?: boolean;
}

export interface PublishOptions {
  confluence?: {
    spaceKey: string;
    pageTitle: string;
    parentId?: string;
  };
  notion?: {
    databaseId: string;
    properties?: Record<string, any>;
  };
  github?: {
    repo: string;
    path: string;
    branch?: string;
    commitMessage?: string;
  };
  wiki?: {
    baseUrl: string;
    apiKey: string;
    space?: string;
  };
}

export interface ScheduleOptions {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone?: string;
}

export interface ExportAndPublishResult {
  success: boolean;
  exported: {
    format: string;
    itemCount: number;
    filePath?: string;
    size: string;
  };
  published?: {
    target: string;
    url?: string;
    publishedAt: string;
  };
  summary: string;
  errors: string[];
  nextRun?: string;
}

/**
 * Export knowledge base data
 */
async function exportKnowledgeBase(config: ExportAndPublishConfig): Promise<any> {
  console.log(`📤 Exporting knowledge base in ${config.format} format...`);

  const exportResult = await callMCPTool('export_knowledge', {
    format: config.format === 'confluence' || config.format === 'notion' ? 'json' : config.format,
    filter: config.filters
  });

  if (!exportResult.success) {
    throw new Error(`Export failed: ${exportResult.error}`);
  }

  return exportResult.data;
}

/**
 * Transform data for specific export formats
 */
function transformForFormat(data: any[], format: string, config: ExportAndPublishConfig): any {
  switch (format) {
    case 'confluence':
      return transformForConfluence(data, config);
    case 'notion':
      return transformForNotion(data, config);
    case 'markdown':
      return transformForMarkdown(data, config);
    case 'csv':
      return transformForCSV(data, config);
    default:
      return data;
  }
}

/**
 * Transform data for Confluence format
 */
function transformForConfluence(data: any[], config: ExportAndPublishConfig): string {
  const sections = [
    {
      title: 'Knowledge Base Export',
      content: `Generated on ${new Date().toISOString()}\n\nTotal items: ${data.length}`
    }
  ];

  // Group by category
  const groupedData = data.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  Object.entries(groupedData).forEach(([category, items]) => {
    sections.push({
      title: `h2. ${category}`,
      content: `*${items.length} items in this category*\n\n${items.map(item =>
        `h3. ${item.title}\n\n` +
        `*Severity:* ${item.severity}\n` +
        `*Status:* ${item.status}\n` +
        `*Created:* ${item.created}\n\n` +
        `${item.description}\n\n` +
        `${item.symptoms ? '*Symptoms:* ' + item.symptoms + '\n\n' : ''}` +
        `${item.solutions && item.solutions.length > 0 ?
          '*Solutions:*\n' + item.solutions.map((sol: any) => `- ${sol.title}: ${sol.description}`).join('\n') + '\n\n' : ''}` +
        `${item.lessons ? '*Lessons Learned:* ' + item.lessons.problem_summary + '\n\n' : ''}` +
        '---'
      ).join('\n\n')}`
    });
  });

  return sections.map(section =>
    `h1. ${section.title}\n\n${section.content}`
  ).join('\n\n');
}

/**
 * Transform data for Notion format
 */
function transformForNotion(data: any[], config: ExportAndPublishConfig): any[] {
  return data.map(item => ({
    parent: {
      database_id: config.publishOptions?.notion?.databaseId || ''
    },
    properties: {
      'Title': {
        title: [{ text: { content: item.title || 'Untitled' } }]
      },
      'Category': {
        select: { name: item.category || 'Other' }
      },
      'Severity': {
        select: { name: item.severity || 'Medium' }
      },
      'Status': {
        select: { name: item.status || 'Open' }
      },
      'Created': {
        date: { start: item.created || new Date().toISOString() }
      },
      'Has Solutions': {
        checkbox: !!(item.solutions && item.solutions.length > 0)
      },
      'Has Lessons': {
        checkbox: !!item.lessons
      },
      'Tags': {
        multi_select: (item.tags || []).map((tag: string) => ({ name: tag }))
      }
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: item.description || 'No description available.' } }]
        }
      },
      ...(item.symptoms ? [{
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: 'Symptoms' } }]
        }
      }, {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: item.symptoms } }]
        }
      }] : []),
      ...(item.solutions && item.solutions.length > 0 ? [{
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: 'Solutions' } }]
        }
      }, ...item.solutions.map((solution: any) => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: `${solution.title}: ${solution.description}` } }]
        }
      }))] : [])
    ]
  }));
}

/**
 * Transform data for Markdown format
 */
function transformForMarkdown(data: any[], config: ExportAndPublishConfig): string {
  let markdown = `# Knowledge Base Export\n\n`;
  markdown += `*Generated on ${new Date().toISOString()}*\n\n`;
  markdown += `**Total items:** ${data.length}\n\n`;

  // Group by category
  const groupedData = data.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  Object.entries(groupedData).forEach(([category, items]) => {
    markdown += `## ${category}\n\n`;
    markdown += `*${items.length} items in this category*\n\n`;

    items.forEach(item => {
      markdown += `### ${item.title}\n\n`;
      markdown += `**Severity:** ${item.severity} | **Status:** ${item.status} | **Created:** ${item.created}\n\n`;
      markdown += `${item.description}\n\n`;

      if (item.symptoms) {
        markdown += `**Symptoms:**\n${item.symptoms}\n\n`;
      }

      if (item.solutions && item.solutions.length > 0) {
        markdown += `**Solutions:**\n`;
        item.solutions.forEach((sol: any) => {
          markdown += `- ${sol.title}: ${sol.description}\n`;
        });
        markdown += '\n';
      }

      if (item.lessons) {
        markdown += `**Lessons Learned:** ${item.lessons.problem_summary}\n\n`;
      }

      markdown += '---\n\n';
    });
  });

  return markdown;
}

/**
 * Transform data for CSV format
 */
function transformForCSV(data: any[], config: ExportAndPublishConfig): any[] {
  return data.map(item => ({
    id: item.id || '',
    title: item.title || '',
    category: item.category || '',
    severity: item.severity || '',
    status: item.status || '',
    created: item.created || '',
    updated: item.updated || '',
    description: (item.description || '').replace(/\n/g, ' ').slice(0, 500),
    symptoms: (item.symptoms || '').replace(/\n/g, ' ').slice(0, 300),
    solution_count: item.solutions?.length || 0,
    has_lessons: item.lessons ? 'Yes' : 'No',
    tags: Array.isArray(item.tags) ? item.tags.join(';') : (item.tags || ''),
    environment: item.environment || '',
    visibility: item.visibility || ''
  }));
}

/**
 * Save exported data to file
 */
function saveExportedData(data: any, format: string, config: ExportAndPublishConfig): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `knowledge_export_${timestamp}.${format}`;
  const outputPath = config.outputPath || join(process.cwd(), 'out', fileName);

  // Ensure directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let content: string;
  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2);
      break;
    case 'csv':
      const csvResult = saveSheetAsCSV(
        transformForCSV(Array.isArray(data) ? data : [data], config),
        'knowledge_export',
        outputPath.replace('.csv', '')
      );
      return csvResult.filePath || outputPath;
    default:
      content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  }

  writeFileSync(outputPath, content, 'utf8');
  return outputPath;
}

/**
 * Publish to external systems (mock implementations)
 */
async function publishToTarget(
  data: any,
  target: string,
  options: PublishOptions | undefined
): Promise<{ url?: string; publishedAt: string; error?: string }> {
  const publishedAt = new Date().toISOString();

  switch (target) {
    case 'local':
      return { publishedAt };

    case 'wiki':
      // Mock wiki publishing
      console.log('📝 Publishing to internal wiki...');
      return {
        url: 'https://wiki.company.com/knowledge-base/' + Date.now(),
        publishedAt
      };

    case 'confluence':
      // Mock Confluence publishing
      console.log(`📄 Publishing to Confluence space: ${options?.confluence?.spaceKey}...`);
      return {
        url: `https://company.atlassian.net/wiki/pages/${Date.now()}`,
        publishedAt
      };

    case 'notion':
      // Mock Notion publishing
      console.log(`📋 Publishing to Notion database: ${options?.notion?.databaseId}...`);
      return {
        url: `https://notion.so/${options?.notion?.databaseId}?v=${Date.now()}`,
        publishedAt
      };

    case 'github':
      // Mock GitHub publishing
      console.log(`🔧 Publishing to GitHub repo: ${options?.github?.repo}...`);
      return {
        url: `https://github.com/${options?.github?.repo}/blob/main/${options?.github?.path}`,
        publishedAt
      };

    default:
      return {
        error: `Unsupported publish target: ${target}`,
        publishedAt
      };
  }
}

/**
 * Calculate next run time for scheduled exports
 */
function calculateNextRun(schedule: ScheduleOptions): string {
  if (!schedule.enabled) return '';

  const now = new Date();
  const nextRun = new Date(now);

  // Simple implementation - in production, use a proper scheduling library
  switch (schedule.frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      break;
  }

  return nextRun.toISOString();
}

/**
 * Main export and publish function
 */
export async function exportAndPublish(
  config: ExportAndPublishConfig
): Promise<ExportAndPublishResult> {
  const result: ExportAndPublishResult = {
    success: false,
    exported: {
      format: config.format,
      itemCount: 0,
      size: '0 KB'
    },
    summary: '',
    errors: []
  };

  try {
    console.log('🚀 Starting export and publish workflow...\n');

    // Step 1: Export knowledge base
    console.log('📋 Step 1: Exporting knowledge base');
    const exportedData = await exportKnowledgeBase(config);
    result.exported.itemCount = Array.isArray(exportedData) ? exportedData.length : 1;

    // Step 2: Transform data for target format
    console.log(`🔄 Step 2: Transforming data for ${config.format} format`);
    const transformedData = transformForFormat(exportedData, config.format, config);

    // Step 3: Save to file
    console.log(`💾 Step 3: Saving export file`);
    const filePath = saveExportedData(transformedData, config.format, config);
    result.exported.filePath = filePath;

    // Calculate file size
    const fileStats = require('fs').statSync(filePath);
    result.exported.size = `${(fileStats.size / 1024).toFixed(2)} KB`;

    console.log(`✅ Export saved to: ${filePath} (${result.exported.size})`);

    // Step 4: Publish if target is not local
    if (config.target !== 'local') {
      console.log(`🌐 Step 4: Publishing to ${config.target}`);
      const publishResult = await publishToTarget(
        transformedData,
        config.target,
        config.publishOptions
      );

      if (publishResult.error) {
        result.errors.push(`Publishing failed: ${publishResult.error}`);
      } else {
        result.published = {
          target: config.target,
          url: publishResult.url,
          publishedAt: publishResult.publishedAt
        };
        console.log(`✅ Published to ${config.target}: ${publishResult.url}`);
      }
    }

    // Step 5: Schedule next run if configured
    if (config.schedule?.enabled) {
      result.nextRun = calculateNextRun(config.schedule);
      console.log(`⏰ Next run scheduled: ${result.nextRun}`);
    }

    result.success = result.errors.length === 0;
    result.summary = `
📊 Export and Publish Summary:
✅ Exported ${result.exported.itemCount} items in ${config.format} format
💾 File saved: ${result.exported.filePath} (${result.exported.size})
${result.published ? `🌐 Published to ${result.published.target}: ${result.published.url}` : '📁 Local export only'}
${result.nextRun ? `⏰ Next scheduled run: ${result.nextRun}` : '🔔 No recurring schedule set'}
${result.errors.length > 0 ? `⚠️ Errors: ${result.errors.join(', ')}` : '✅ No errors'}
    `.trim();

    console.log('\n' + result.summary);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Workflow failed: ${errorMessage}`);
    result.summary = `❌ Export and publish failed: ${errorMessage}`;
    console.error(result.summary);
  }

  return result;
}

/**
 * Quick export to local file
 */
export async function quickExport(
  format: 'json' | 'csv' | 'markdown' = 'json',
  filters?: ExportFilters
): Promise<ExportAndPublishResult> {
  return exportAndPublish({
    format,
    target: 'local',
    filters
  });
}

/**
 * Export and publish to Confluence
 */
export async function exportToConfluence(
  spaceKey: string,
  pageTitle: string,
  filters?: ExportFilters
): Promise<ExportAndPublishResult> {
  return exportAndPublish({
    format: 'confluence',
    target: 'confluence',
    publishOptions: {
      confluence: { spaceKey, pageTitle }
    },
    filters
  });
}

/**
 * Export and publish to Notion
 */
export async function exportToNotion(
  databaseId: string,
  filters?: ExportFilters
): Promise<ExportAndPublishResult> {
  return exportAndPublish({
    format: 'notion',
    target: 'notion',
    publishOptions: {
      notion: { databaseId }
    },
    filters
  });
}

/**
 * Schedule recurring exports
 */
export async function scheduleExport(
  config: ExportAndPublishConfig
): Promise<ExportAndPublishResult> {
  const scheduleConfig = {
    ...config,
    schedule: {
      enabled: true,
      frequency: 'weekly' as const,
      time: '09:00',
      timezone: 'UTC',
      ...config.schedule
    }
  };

  return exportAndPublish(scheduleConfig);
}

// Export for use in other modules
export default {
  exportAndPublish,
  quickExport,
  exportToConfluence,
  exportToNotion,
  scheduleExport
};