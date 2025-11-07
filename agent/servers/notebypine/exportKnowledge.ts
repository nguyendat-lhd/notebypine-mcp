import type { ToolInvoker, WrapperOptions } from './types.js';
import { NOTEBYPINE_SERVER_ID } from './types.js';
import type { IncidentCategory, IncidentSeverity } from './createIncident.js';
import type { IncidentStatus } from './searchIncidents.js';

export type ExportFormat = 'json' | 'csv' | 'markdown';

export interface ExportKnowledgeFilter {
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
}

export interface ExportKnowledgeInput {
  format: ExportFormat;
  filter?: ExportKnowledgeFilter;
}

export async function exportKnowledge<TResponse = unknown>(
  invoke: ToolInvoker,
  args: ExportKnowledgeInput,
  options: WrapperOptions = {}
): Promise<TResponse> {
  return invoke({
    serverId: options.serverId ?? NOTEBYPINE_SERVER_ID,
    tool: 'export_knowledge',
    args,
  });
}

