export const NOTEBYPINE_SERVER_ID = 'notebypine-mcp';

export type ToolInvoker = <TResponse>(request: {
  serverId: string;
  tool: string;
  args: Record<string, unknown>;
}) => Promise<TResponse>;

export interface WrapperOptions {
  serverId?: string;
}

