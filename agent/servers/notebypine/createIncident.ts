import type { ToolInvoker, WrapperOptions } from './types.js';
import { NOTEBYPINE_SERVER_ID } from './types.js';

export type IncidentCategory = 'Backend' | 'Frontend' | 'DevOps' | 'Health' | 'Finance' | 'Mobile';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentVisibility = 'private' | 'team' | 'public';
export type IncidentFrequency = 'one-time' | 'occasional' | 'frequent' | 'recurring';

export interface CreateIncidentInput {
  title: string;
  category: IncidentCategory;
  description: string;
  severity: IncidentSeverity;
  symptoms?: string;
  context?: string;
  environment?: string;
  visibility?: IncidentVisibility;
  frequency?: IncidentFrequency;
}

export async function createIncident<TResponse = unknown>(
  invoke: ToolInvoker,
  args: CreateIncidentInput,
  options: WrapperOptions = {}
): Promise<TResponse> {
  return invoke({
    serverId: options.serverId ?? NOTEBYPINE_SERVER_ID,
    tool: 'create_incident',
    args,
  });
}

