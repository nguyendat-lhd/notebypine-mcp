import type { ToolInvoker, WrapperOptions } from './types.js';
import { NOTEBYPINE_SERVER_ID } from './types.js';

export interface AddSolutionInput {
  incident_id: string;
  solution_title: string;
  solution_description: string;
  steps: string;
  resources_needed?: string;
  time_estimate?: string;
  warnings?: string;
  alternatives?: string;
}

export async function addSolution<TResponse = unknown>(
  invoke: ToolInvoker,
  args: AddSolutionInput,
  options: WrapperOptions = {}
): Promise<TResponse> {
  return invoke({
    serverId: options.serverId ?? NOTEBYPINE_SERVER_ID,
    tool: 'add_solution',
    args,
  });
}

