#!/usr/bin/env bun
/**
 * Script to create admin user in PocketBase if it doesn't exist
 * This should be run after PocketBase is started for the first time
 */

import PocketBase from 'pocketbase';
import { config } from '../src/config.js';

async function createAdmin() {
  const pb = new PocketBase(config.pocketbase.url);
  const adminEmail = config.pocketbase.adminEmail;
  const adminPassword = config.pocketbase.adminPassword;

  try {
    console.log('🔍 Checking PocketBase connection...');
    await pb.health.check();
    console.log('✅ PocketBase is running');

    // Try to authenticate first to check if admin exists
    try {
      console.log(`🔐 Attempting to authenticate as ${adminEmail}...`);
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      console.log('✅ Admin account already exists and credentials are correct');
      return;
    } catch (authError: any) {
      // If authentication fails, try to create admin
      if (authError.status === 400 || authError.status === 404) {
        console.log('⚠️  Admin account not found or credentials incorrect');
        console.log(`📝 Creating admin account: ${adminEmail}...`);
        
        try {
          // For first-time setup, we need to use the admin API
          // Note: This only works if PocketBase has no admins yet
          const createResponse = await fetch(`${config.pocketbase.url}/api/admins`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: adminEmail,
              password: adminPassword,
              passwordConfirm: adminPassword,
            }),
          });

          if (createResponse.ok) {
            console.log('✅ Admin account created successfully');
            
            // Verify by authenticating
            await pb.admins.authWithPassword(adminEmail, adminPassword);
            console.log('✅ Verified: Admin can now login');
          } else {
            const errorData = await createResponse.json().catch(() => ({}));
            if (createResponse.status === 401 || createResponse.status === 403) {
              console.error('❌ Cannot create admin: PocketBase requires initial admin setup');
              console.error('');
              console.error('📋 Please create admin manually:');
              console.error('   1. Open PocketBase Admin UI: http://localhost:8090/_/');
              console.error('   2. Complete the initial setup form');
              console.error(`   3. Use email: ${adminEmail}`);
              console.error(`   4. Use password: ${adminPassword}`);
              console.error('');
              console.error('   Or if admin already exists with different credentials,');
              console.error('   update POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in your .env file');
              process.exit(1);
            } else {
              throw new Error(`Failed to create admin: ${createResponse.status} - ${errorData.message || createResponse.statusText}`);
            }
          }
        } catch (createError: any) {
          console.error('❌ Failed to create admin:', createError.message || createError);
          console.error('');
          console.error('📋 Please create admin manually:');
          console.error('   1. Open PocketBase Admin UI: http://localhost:8090/_/');
          console.error('   2. Complete the initial setup form');
          console.error(`   3. Use email: ${adminEmail}`);
          console.error(`   4. Use password: ${adminPassword}`);
          process.exit(1);
        }
      } else {
        // Other authentication errors
        console.error('❌ Authentication failed:', authError.message || authError);
        console.error('');
        console.error('📋 Possible solutions:');
        console.error('   1. Check if admin exists in PocketBase Admin UI: http://localhost:8090/_/');
        console.error(`   2. Verify credentials match: ${adminEmail}`);
        console.error('   3. Update POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD if needed');
        process.exit(1);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    console.error('');
    console.error('📋 Make sure PocketBase is running:');
    console.error('   bun run pb:serve');
    process.exit(1);
  }
}

createAdmin();

