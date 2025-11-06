#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTools } from './mcp/tools.js';
import { registerResources } from './mcp/resources.js';
import { registerPrompts } from './mcp/prompts.js';
import { initPocketBase, ensurePocketBaseReady } from './db/pocketbase.js';
import { logger, LogLevel } from './utils/logger.js';
import { memoryManager, memoryLeakDetector } from './utils/memory.js';
import { performanceMonitor } from './utils/performance.js';
import { responseCache } from './utils/cache.js';
import { CacheManager } from './db/queries.js';
import { config } from './config.js';

const server = new Server(
  {
    name: 'notebypine-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

async function startServer() {
  try {
    console.error('=� Starting NoteByPine MCP Server...');

    // Initialize PocketBase
    await ensurePocketBaseReady();
    await initPocketBase();
    console.error(' PocketBase initialized successfully');

    // Register all MCP capabilities
    registerTools(server);
    registerResources(server);
    registerPrompts(server);
    console.error(' MCP capabilities registered');

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('<� NoteByPine MCP Server running on stdio');
  } catch (error) {
    console.error('L Failed to start server:', error);
    process.exit(1);
  }
}

startServer();