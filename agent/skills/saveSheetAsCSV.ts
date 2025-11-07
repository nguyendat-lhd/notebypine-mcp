/**
 * Skill: Save structured data as CSV file
 * Pure function with clear I/O contracts
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface CSVRow {
  [key: string]: any;
}

export interface CSVExportOptions {
  delimiter?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  encoding?: BufferEncoding;
  nullValue?: string;
  arrayDelimiter?: string;
  prettyNumbers?: boolean;
}

export interface CSVExportResult {
  success: boolean;
  filePath?: string;
  rowsExported?: number;
  error?: string;
  summary: string;
}

const DEFAULT_OPTIONS: CSVExportOptions = {
  delimiter: ',',
  includeHeaders: true,
  dateFormat: 'ISO',
  encoding: 'utf8',
  nullValue: '',
  arrayDelimiter: '|',
  prettyNumbers: false
};

/**
 * Escape CSV value according to RFC 4180
 */
function escapeCSVValue(value: any, options: CSVExportOptions): string {
  if (value === null || value === undefined) {
    return options.nullValue || '';
  }

  let stringValue = String(value);

  // Handle arrays
  if (Array.isArray(value)) {
    stringValue = value.map(item => String(item)).join(options.arrayDelimiter || '|');
  }

  // Handle objects (convert to JSON string)
  if (typeof value === 'object' && !Array.isArray(value)) {
    stringValue = JSON.stringify(value);
  }

  // Handle dates
  if (value instanceof Date) {
    switch (options.dateFormat) {
      case 'ISO':
        stringValue = value.toISOString();
        break;
      case 'local':
        stringValue = value.toLocaleString();
        break;
      case 'timestamp':
        stringValue = value.getTime().toString();
        break;
      default:
        stringValue = value.toISOString();
    }
  }

  // Escape special characters
  const delimiter = options.delimiter || ',';
  const containsDelimiter = stringValue.includes(delimiter);
  const containsQuote = stringValue.includes('"');
  const containsNewline = stringValue.includes('\n') || stringValue.includes('\r');

  if (containsDelimiter || containsQuote || containsNewline) {
    // Double up any quotes
    stringValue = stringValue.replace(/"/g, '""');
    // Wrap in quotes
    stringValue = `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Get all unique column names from data
 */
function getColumnNames(data: CSVRow[]): string[] {
  const columnSet = new Set<string>();

  for (const row of data) {
    Object.keys(row).forEach(key => columnSet.add(key));
  }

  return Array.from(columnSet).sort();
}

/**
 * Format numbers for pretty display
 */
function formatNumber(value: any): any {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    } else {
      // Format with appropriate precision
      return parseFloat(value.toFixed(6));
    }
  }
  return value;
}

/**
 * Convert data to CSV string
 */
function convertToCSV(data: CSVRow[], options: CSVExportOptions): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const columnNames = getColumnNames(data);
  const rows: string[] = [];

  // Add headers if requested
  if (options.includeHeaders) {
    const headerRow = columnNames.map(col => escapeCSVValue(col, options)).join(options.delimiter);
    rows.push(headerRow);
  }

  // Add data rows
  for (const row of data) {
    const values = columnNames.map(columnName => {
      const value = row[columnName];
      const processedValue = options.prettyNumbers ? formatNumber(value) : value;
      return escapeCSVValue(processedValue, options);
    });
    rows.push(values.join(options.delimiter));
  }

  return rows.join('\n');
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate filename based on data and timestamp
 */
function generateFilename(
  dataName: string,
  timestamp?: Date,
  prefix?: string
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

  const cleanDataName = dataName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const prefixStr = prefix ? `${prefix}_` : '';

  return `${prefixStr}${cleanDataName}_${dateStr}_${timeStr}.csv`;
}

/**
 * Save data as CSV file
 */
export function saveSheetAsCSV(
  data: CSVRow[],
  dataName: string,
  outputPath?: string,
  options: Partial<CSVExportOptions> = {}
): CSVExportResult {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  const result: CSVExportResult = {
    success: false,
    rowsExported: 0,
    summary: ''
  };

  try {
    // Validate input
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array of objects');
    }

    if (data.length === 0) {
      result.summary = 'No data to export';
      result.success = true;
      return result;
    }

    // Generate file path
    const fileName = generateFilename(dataName, undefined, 'export');
    const filePath = outputPath || join(process.cwd(), 'out', fileName);

    // Ensure directory exists
    ensureDirectoryExists(filePath);

    // Convert to CSV
    console.log(`📊 Converting ${data.length} rows to CSV format...`);
    const csvContent = convertToCSV(data, finalOptions);

    // Write to file
    console.log(`💾 Saving CSV to: ${filePath}`);
    writeFileSync(filePath, csvContent, { encoding: finalOptions.encoding });

    // Calculate file size
    const fileSizeBytes = Buffer.byteLength(csvContent, finalOptions.encoding);
    const fileSizeKB = (fileSizeBytes / 1024).toFixed(2);

    result.success = true;
    result.filePath = filePath;
    result.rowsExported = data.length;
    result.summary = `
✅ CSV Export Successful:
- File: ${filePath}
- Rows exported: ${data.length}
- File size: ${fileSizeKB} KB
- Encoding: ${finalOptions.encoding}
- Delimiter: "${finalOptions.delimiter}"
- Headers included: ${finalOptions.includeHeaders}
    `.trim();

    console.log(result.summary);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.error = errorMessage;
    result.summary = `❌ CSV Export Failed: ${errorMessage}`;
    console.error(result.summary);
  }

  return result;
}

/**
 * Export incident data to CSV
 */
export async function exportIncidentsToCSV(
  incidents: any[],
  outputPath?: string,
  options?: Partial<CSVExportOptions>
): Promise<CSVExportResult> {
  // Transform incident data for CSV export
  const csvData = incidents.map(incident => ({
    id: incident.id || '',
    title: incident.title || '',
    category: incident.category || '',
    severity: incident.severity || '',
    status: incident.status || '',
    description: incident.description || '',
    symptoms: incident.symptoms || '',
    environment: incident.environment || '',
    visibility: incident.visibility || '',
    frequency: incident.frequency || '',
    created: incident.created || '',
    updated: incident.updated || '',
    created_by: incident.created_by || '',
    tags: Array.isArray(incident.tags) ? incident.tags.join(';') : (incident.tags || ''),
    solution_count: incident.solution_count || 0,
    has_lessons: incident.has_lessons ? 'Yes' : 'No'
  }));

  return saveSheetAsCSV(csvData, 'incidents', outputPath, options);
}

/**
 * Export search results to CSV
 */
export async function exportSearchResultsToCSV(
  searchResults: any[],
  query: string,
  outputPath?: string,
  options?: Partial<CSVExportOptions>
): Promise<CSVExportResult> {
  // Transform search results for CSV export
  const csvData = searchResults.map((result, index) => ({
    result_number: index + 1,
    incident_id: result.id || '',
    title: result.title || '',
    category: result.category || '',
    severity: result.severity || '',
    status: result.status || '',
    relevance_score: result.relevance_score || 0,
    match_summary: result.match_summary || '',
    created: result.created || '',
    updated: result.updated || '',
    description_preview: (result.description || '').slice(0, 200) + ((result.description || '').length > 200 ? '...' : ''),
    tags: Array.isArray(result.tags) ? result.tags.join(';') : (result.tags || '')
  }));

  return saveSheetAsCSV(csvData, `search_results_${query.replace(/[^a-zA-Z0-9]/g, '_')}`, outputPath, options);
}

/**
 * Export knowledge base to CSV
 */
export async function exportKnowledgeToCSV(
  knowledgeData: any[],
  format: string = 'full',
  outputPath?: string,
  options?: Partial<CSVExportOptions>
): Promise<CSVExportResult> {
  let csvData: CSVRow[] = [];

  switch (format) {
    case 'summary':
      csvData = knowledgeData.map(item => ({
        id: item.id || '',
        title: item.title || '',
        category: item.category || '',
        severity: item.severity || '',
        status: item.status || '',
        solution_count: item.solutions?.length || 0,
        has_lessons: item.lessons ? 'Yes' : 'No',
        created: item.created || '',
        tags: Array.isArray(item.tags) ? item.tags.join(';') : (item.tags || '')
      }));
      break;

    case 'full':
    default:
      csvData = knowledgeData.map(item => ({
        incident_id: item.id || '',
        incident_title: item.title || '',
        category: item.category || '',
        severity: item.severity || '',
        status: item.status || '',
        description: item.description || '',
        symptoms: item.symptoms || '',
        context: item.context || '',
        environment: item.environment || '',
        created: item.created || '',
        updated: item.updated || '',
        solutions: item.solutions?.map((s: any) => s.title).join(';') || '',
        lessons: item.lessons?.map((l: any) => l.problem_summary).join(';') || '',
        tags: Array.isArray(item.tags) ? item.tags.join(';') : (item.tags || '')
      }));
      break;
  }

  return saveSheetAsCSV(csvData, `knowledge_base_${format}`, outputPath, options);
}

/**
 * Batch export multiple data sets
 */
export async function batchExportToCSV(
  datasets: Array<{
    name: string;
    data: CSVRow[];
    options?: Partial<CSVExportOptions>;
  }>,
  outputDir?: string
): Promise<CSVExportResult[]> {
  console.log(`📦 Starting batch export of ${datasets.length} datasets`);

  const results: CSVExportResult[] = [];

  for (let i = 0; i < datasets.length; i++) {
    const { name, data, options } = datasets[i];
    console.log(`📊 Processing dataset ${i + 1}/${datasets.length}: ${name}`);

    const outputPath = outputDir ? join(outputDir, `${name}.csv`) : undefined;
    const result = saveSheetAsCSV(data, name, outputPath, options);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Batch export completed: ${successCount}/${datasets.length} successful`);

  return results;
}