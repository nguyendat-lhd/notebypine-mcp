import type { ToolInvoker, WrapperOptions } from './types.js';
import { NOTEBYPINE_SERVER_ID } from './types.js';
import type { IncidentCategory, IncidentSeverity } from './createIncident.js';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'archived';

export interface SearchIncidentsInput {
  query: string;
  category?: IncidentCategory;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  limit?: number;
}

export async function searchIncidents<TResponse = unknown>(
  invoke: ToolInvoker,
  args: SearchIncidentsInput,
  options: WrapperOptions = {}
): Promise<TResponse> {
  return invoke({
    serverId: options.serverId ?? NOTEBYPINE_SERVER_ID,
    tool: 'search_incidents',
    args,
  });
}

