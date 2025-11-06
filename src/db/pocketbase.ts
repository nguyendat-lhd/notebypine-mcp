import PocketBase from 'pocketbase';
import { config } from '../config.js';

let pb: PocketBase | null = null;
let adminToken: string | null = null;

export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(config.pocketbase.url);
    pb.autoCancellation(false);
    console.debug('PocketBase client initialized');
  }
  return pb;
}

export async function initPocketBase(): Promise<void> {
  const pb = getPocketBase();

  try {
    // Health check first
    await pb.health.check();
    console.info('PocketBase health check passed');

    // Authenticate as admin using REST API
    const authResponse = await fetch(`${config.pocketbase.url}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identity: config.pocketbase.adminEmail,
        password: config.pocketbase.adminPassword,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Admin authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    adminToken = authData.token;
    console.info('PocketBase authenticated successfully');
  } catch (error: any) {
    const message = error.message || 'Unknown error';
    console.error(`PocketBase initialization failed: ${message}`);
    throw new Error(`Failed to initialize PocketBase: ${message}`);
  }
}

export async function ensurePocketBaseReady(): Promise<void> {
  try {
    const pb = getPocketBase();
    await pb.health.check();
  } catch (error) {
    throw new Error('PocketBase is not running. Please start it with: bun run pb:serve');
  }
}

export function getAdminToken(): string {
  if (!adminToken) {
    throw new Error('PocketBase not initialized. Call initPocketBase() first.');
  }
  return adminToken;
}

// Helper function for authenticated API calls
export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const authOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  };

  return fetch(url, authOptions);
}