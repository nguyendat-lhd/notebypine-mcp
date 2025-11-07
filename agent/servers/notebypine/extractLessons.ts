import type { ToolInvoker, WrapperOptions } from './types.js';
import { NOTEBYPINE_SERVER_ID } from './types.js';

export type LessonType = 'prevention' | 'detection' | 'response' | 'recovery' | 'general';

export interface ExtractLessonsInput {
  incident_id: string;
  problem_summary: string;
  root_cause: string;
  prevention: string;
  lesson_type?: LessonType;
}

export async function extractLessons<TResponse = unknown>(
  invoke: ToolInvoker,
  args: ExtractLessonsInput,
  options: WrapperOptions = {}
): Promise<TResponse> {
  return invoke({
    serverId: options.serverId ?? NOTEBYPINE_SERVER_ID,
    tool: 'extract_lessons',
    args,
  });
}

