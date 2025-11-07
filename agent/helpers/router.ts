/**
 * Router helper for selecting between wrapper imports and direct MCP calls
 * Honors routing config, server capability hints, and wrapper existence
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { callMCPTool } from './callMCPTool.js';
import { searchTools } from './searchTools.js';
import { safeLog } from './redact.js';

export interface RoutingConfig {
  version: string;
  description: string;
  defaultMode: 'auto' | 'code' | 'direct';
  servers: Record<string, ServerConfig>;
  globalSettings: GlobalSettings;
  developerMode: DeveloperMode;
  workflowDefaults: Record<string, any>;
}

export interface ServerConfig {
  mode: 'auto' | 'code' | 'direct';
  capabilities: {
    supportsWrapper: boolean;
    supportsDirect: boolean;
    supportsChunking: boolean;
    supportsRedaction: boolean;
    preferredMode: 'code' | 'direct';
  };
  toolRouting: Record<string, ToolRoutingConfig>;
  defaultOptions: any;
  logging: any;
}

export interface ToolRoutingConfig {
  mode: 'auto' | 'code' | 'direct';
  wrapper?: string;
  chunking?: boolean;
  redaction?: boolean;
}

export interface GlobalSettings {
  autoDiscovery: boolean;
  preferWrapperRoutes: boolean;
  fallbackToDirect: boolean;
  enableMetrics: boolean;
  cacheToolList: boolean;
  cacheTTL: number;
}

export interface DeveloperMode {
  enabled: boolean;
  verboseLogging: boolean;
  showRoutingDecisions: boolean;
  enableDebugTools: boolean;
}

export interface RouteDecision {
  mode: 'code' | 'direct';
  method: 'wrapper' | 'mcp' | 'unknown';
  wrapperPath?: string;
  reasoning: string;
  config: any;
}

export interface RoutingMetrics {
  totalCalls: number;
  wrapperCalls: number;
  directCalls: number;
  fallbackCalls: number;
  errors: number;
  averageLatency: number;
}

// Cache for routing config and metrics
let routingConfig: RoutingConfig | null = null;
let routingMetrics: RoutingMetrics = {
  totalCalls: 0,
  wrapperCalls: 0,
  directCalls: 0,
  fallbackCalls: 0,
  errors: 0,
  averageLatency: 0
};

/**
 * Load routing configuration from file
 */
function loadRoutingConfig(): RoutingConfig {
  if (routingConfig) {
    return routingConfig;
  }

  const configPath = join(process.cwd(), 'mcp.routing.json');

  if (!existsSync(configPath)) {
    console.warn('⚠️ Routing config not found, using defaults');
    return getDefaultConfig();
  }

  try {
    const configData = readFileSync(configPath, 'utf8');
    routingConfig = JSON.parse(configData);
    console.log('✅ Routing configuration loaded');
    return routingConfig;
  } catch (error) {
    console.error('❌ Failed to load routing config:', error);
    return getDefaultConfig();
  }
}

/**
 * Get default routing configuration
 */
function getDefaultConfig(): RoutingConfig {
  return {
    version: '1.0.0',
    description: 'Default MCP routing configuration',
    defaultMode: 'auto',
    servers: {
      notebypine: {
        mode: 'code',
        capabilities: {
          supportsWrapper: true,
          supportsDirect: true,
          supportsChunking: true,
          supportsRedaction: true,
          preferredMode: 'code'
        },
        toolRouting: {},
        defaultOptions: {
          enableChunking: true,
          chunkSize: 10,
          sampleSize: 5,
          verbose: false,
          redactSensitive: true
        },
        logging: {
          level: 'info',
          includeTimestamps: true
        }
      }
    },
    globalSettings: {
      autoDiscovery: true,
      preferWrapperRoutes: true,
      fallbackToDirect: true,
      enableMetrics: true,
      cacheToolList: true,
      cacheTTL: 300000
    },
    developerMode: {
      enabled: false,
      verboseLogging: false,
      showRoutingDecisions: false,
      enableDebugTools: false
    },
    workflowDefaults: {
      maxIncidentBatchSize: 5,
      maxSearchResults: 50
    }
  };
}

/**
 * Check if wrapper file exists
 */
function wrapperExists(wrapperPath: string): boolean {
  const fullPath = join(process.cwd(), wrapperPath);
  return existsSync(fullPath);
}

/**
 * Make routing decision based on config and capabilities
 */
function makeRoutingDecision(
  serverId: string,
  toolName: string,
  config: RoutingConfig
): RouteDecision {
  const serverConfig = config.servers[serverId];

  if (!serverConfig) {
    return {
      mode: 'direct',
      method: 'mcp',
      reasoning: `Server ${serverId} not found in config, falling back to direct MCP`,
      config: {}
    };
  }

  // Check tool-specific routing first
  const toolRouting = serverConfig.toolRouting[toolName];
  if (toolRouting) {
    const wrapperPath = toolRouting.wrapper;
    const hasWrapper = wrapperPath && wrapperExists(wrapperPath);

    if (toolRouting.mode === 'code' && hasWrapper) {
      return {
        mode: 'code',
        method: 'wrapper',
        wrapperPath,
        reasoning: `Tool-specific routing to wrapper for ${toolName}`,
        config: toolRouting
      };
    }

    if (toolRouting.mode === 'direct') {
      return {
        mode: 'direct',
        method: 'mcp',
        reasoning: `Tool-specific direct routing for ${toolName}`,
        config: toolRouting
      };
    }
  }

  // Fall back to server-level routing
  const serverMode = serverConfig.mode;
  const capabilities = serverConfig.capabilities;

  if (serverMode === 'code' && capabilities.supportsWrapper) {
    // Try to find a wrapper
    const expectedWrapperPath = `agent/servers/${serverId}/${toolName}.ts`;
    if (wrapperExists(expectedWrapperPath)) {
      return {
        mode: 'code',
        method: 'wrapper',
        wrapperPath: expectedWrapperPath,
        reasoning: `Server-level code mode with available wrapper for ${toolName}`,
        config: serverConfig.defaultOptions
      };
    } else if (config.globalSettings.fallbackToDirect && capabilities.supportsDirect) {
      return {
        mode: 'direct',
        method: 'mcp',
        reasoning: `Wrapper not found for ${toolName}, falling back to direct MCP`,
        config: serverConfig.defaultOptions
      };
    }
  }

  if (serverMode === 'direct' || capabilities.preferredMode === 'direct') {
    return {
      mode: 'direct',
      method: 'mcp',
      reasoning: `Server configured for direct mode for ${toolName}`,
      config: serverConfig.defaultOptions
    };
  }

  // Auto mode - decide based on capabilities and availability
  if (capabilities.supportsWrapper && config.globalSettings.preferWrapperRoutes) {
    const expectedWrapperPath = `agent/servers/${serverId}/${toolName}.ts`;
    if (wrapperExists(expectedWrapperPath)) {
      return {
        mode: 'code',
        method: 'wrapper',
        wrapperPath: expectedWrapperPath,
        reasoning: `Auto mode: preferring wrapper for ${toolName}`,
        config: serverConfig.defaultOptions
      };
    }
  }

  // Default to direct if all else fails
  return {
    mode: 'direct',
    method: 'mcp',
    reasoning: `Default fallback to direct MCP for ${toolName}`,
    config: serverConfig.defaultOptions
  };
}

/**
 * Route tool call based on configuration
 */
export async function routeCall(
  serverId: string,
  toolName: string,
  args: any,
  options: any = {}
): Promise<any> {
  const startTime = Date.now();
  routingMetrics.totalCalls++;

  const config = loadRoutingConfig();
  const decision = makeRoutingDecision(serverId, toolName, config);

  if (config.developerMode.showRoutingDecisions) {
    console.log(`🛣️ Routing Decision for ${serverId}:${toolName}`);
    console.log(`   Mode: ${decision.mode}`);
    console.log(`   Method: ${decision.method}`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    if (decision.wrapperPath) {
      console.log(`   Wrapper: ${decision.wrapperPath}`);
    }
  }

  try {
    let result;

    switch (decision.method) {
      case 'wrapper':
        routingMetrics.wrapperCalls++;
        result = await callMCPTool(toolName, args, {
          ...decision.config,
          ...options
        });
        break;

      case 'mcp':
        routingMetrics.directCalls++;
        // For now, still use callMCPTool as it's our MCP interface
        // In a full implementation, this would use direct MCP calls
        result = await callMCPTool(toolName, args, {
          ...decision.config,
          ...options
        });
        break;

      default:
        throw new Error(`Unknown routing method: ${decision.method}`);
    }

    const latency = Date.now() - startTime;
    updateMetrics(latency);

    if (config.developerMode.verboseLogging) {
      console.log(`✅ Route completed in ${latency}ms: ${decision.method} for ${toolName}`);
    }

    return result;

  } catch (error) {
    routingMetrics.errors++;
    const latency = Date.now() - startTime;
    updateMetrics(latency);

    console.error(`❌ Route failed for ${serverId}:${toolName}:`, error);

    // Try fallback if enabled
    if (config.globalSettings.fallbackToDirect && decision.method === 'wrapper') {
      console.log(`🔄 Attempting fallback to direct MCP call for ${toolName}`);
      routingMetrics.fallbackCalls++;
      try {
        return await callMCPTool(toolName, args, options);
      } catch (fallbackError) {
        console.error(`❌ Fallback also failed for ${toolName}:`, fallbackError);
        throw error; // Throw original error
      }
    }

    throw error;
  }
}

/**
 * Update routing metrics
 */
function updateMetrics(latency: number): void {
  const currentAvg = routingMetrics.averageLatency;
  const totalCalls = routingMetrics.totalCalls;

  routingMetrics.averageLatency = (currentAvg * (totalCalls - 1) + latency) / totalCalls;
}

/**
 * Get routing metrics
 */
export function getRoutingMetrics(): RoutingMetrics {
  return { ...routingMetrics };
}

/**
 * Reset routing metrics
 */
export function resetRoutingMetrics(): void {
  routingMetrics = {
    totalCalls: 0,
    wrapperCalls: 0,
    directCalls: 0,
    fallbackCalls: 0,
    errors: 0,
    averageLatency: 0
  };
}

/**
 * Discover available tools using search helper
 */
export function discoverTools(query?: string): any[] {
  if (query) {
    return searchTools(query, {
      includeDescriptions: true,
      includeSpecPaths: true,
      maxResults: 20
    });
  }

  // Return all available tools
  return searchTools.getAllTools();
}

/**
 * Get workflow suggestions for common tasks
 */
export function getWorkflowSuggestions(taskDescription: string): any {
  return searchTools.findToolsForTask(taskDescription);
}

/**
 * Configure routing behavior
 */
export function configureRouting(settings: Partial<DeveloperMode>): void {
  const config = loadRoutingConfig();
  config.developerMode = { ...config.developerMode, ...settings };
  console.log('⚙️ Routing configuration updated:', settings);
}

/**
 * Get current routing configuration
 */
export function getRoutingConfig(): RoutingConfig {
  return loadRoutingConfig();
}

/**
 * Validate routing configuration
 */
export function validateRoutingConfig(): { valid: boolean; errors: string[] } {
  const config = loadRoutingConfig();
  const errors: string[] = [];

  // Check required fields
  if (!config.version) errors.push('Missing version');
  if (!config.servers) errors.push('Missing servers configuration');
  if (!config.globalSettings) errors.push('Missing global settings');

  // Check server configurations
  for (const [serverId, serverConfig] of Object.entries(config.servers)) {
    if (!serverConfig.mode) errors.push(`Server ${serverId}: missing mode`);
    if (!serverConfig.capabilities) errors.push(`Server ${serverId}: missing capabilities`);

    // Check tool routing paths
    for (const [toolName, toolRouting] of Object.entries(serverConfig.toolRouting)) {
      if (toolRouting.wrapper && !wrapperExists(toolRouting.wrapper)) {
        errors.push(`Server ${serverId}, tool ${toolName}: wrapper file not found: ${toolRouting.wrapper}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Export routing metrics for monitoring
 */
export function exportMetrics(): string {
  const config = loadRoutingConfig();
  const validation = validateRoutingConfig();

  return `
🛣️ Routing Metrics Report:
Total Calls: ${routingMetrics.totalCalls}
Wrapper Calls: ${routingMetrics.wrapperCalls} (${((routingMetrics.wrapperCalls / routingMetrics.totalCalls) * 100).toFixed(1)}%)
Direct Calls: ${routingMetrics.directCalls} (${((routingMetrics.directCalls / routingMetrics.totalCalls) * 100).toFixed(1)}%)
Fallback Calls: ${routingMetrics.fallbackCalls}
Errors: ${routingMetrics.errors}
Average Latency: ${routingMetrics.averageLatency.toFixed(2)}ms

Configuration Status: ${validation.valid ? '✅ Valid' : '❌ Invalid'}
${validation.errors.length > 0 ? 'Errors:\n' + validation.errors.join('\n') : ''}

Developer Mode: ${config.developerMode.enabled ? 'Enabled' : 'Disabled'}
Metrics Enabled: ${config.globalSettings.enableMetrics ? 'Yes' : 'No'}
  `.trim();
}