import { z } from 'zod';

const ConfigSchema = z.object({
  pocketbase: z.object({
    url: z.string().url().default('http://localhost:8090'),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(8),
  }),
  mcp: z.object({
    port: z.number().int().positive().default(3000),
    host: z.string().default('localhost'),
  }),
  env: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    pocketbase: {
      url: process.env.POCKETBASE_URL || 'http://localhost:8090',
      adminEmail: process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
      adminPassword: process.env.POCKETBASE_ADMIN_PASSWORD || 'admin123456',
    },
    mcp: {
      port: parseInt(process.env.MCP_PORT || '3000', 10),
      host: process.env.MCP_HOST || 'localhost',
    },
    env: (process.env.NODE_ENV as any) || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
  });
}

export const config = loadConfig();




