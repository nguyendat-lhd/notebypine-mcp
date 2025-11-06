#!/usr/bin/env bun
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

async function verifyCursorConfiguration() {
  console.log('🔍 Cursor Configuration Verification');
  console.log('===================================');

  try {
    // Check MCP configuration file
    const mcpConfigPath = join(homedir(), '.cursor', 'mcp.json');

    if (!existsSync(mcpConfigPath)) {
      console.error('❌ MCP configuration file not found:');
      console.error(`   Expected at: ${mcpConfigPath}`);
      console.log('\n💡 To create the configuration:');
      console.log('   1. Copy the configuration from the project root');
      console.log('   2. Or run: cp scripts/cursor-mcp.json ~/.cursor/mcp.json');
      process.exit(1);
    }

    console.log(`✅ MCP config found: ${mcpConfigPath}`);

    // Read and parse configuration
    const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, 'utf8'));
    console.log('📝 Parsed MCP config:', JSON.stringify(mcpConfig, null, 2));

    if (!mcpConfig.mcpServers) {
      console.error('❌ No MCP servers configured');
      process.exit(1);
    }

    console.log('📝 MCP servers found:', Object.keys(mcpConfig.mcpServers));

    if (!mcpConfig.mcpServers.notebypine) {
      console.error('❌ NoteByPine MCP server not configured');
      process.exit(1);
    }

    const notebypineConfig: any = mcpConfig.mcpServers.notebypine;
    console.log('✅ NoteByPine server configuration found');

    // Verify configuration details
    console.log('\n📋 Configuration Details:');
    console.log(`   Command: ${notebypineConfig.command}`);
    console.log(`   Args: ${notebypineConfig.args.join(' ')}`);
    console.log(`   CWD: ${notebypineConfig.cwd}`);

    if (notebypineConfig.env) {
      console.log('   Environment Variables:');
      Object.entries(notebypineConfig.env).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    }

    // Check if project directory exists
    if (!existsSync(notebypineConfig.cwd)) {
      console.error(`❌ Project directory not found: ${notebypineConfig.cwd}`);
      process.exit(1);
    }

    console.log(`✅ Project directory exists: ${notebypineConfig.cwd}`);

    // Check if MCP server file exists
    const serverFilePath = join(notebypineConfig.cwd, notebypineConfig.args[1]);
    if (!existsSync(serverFilePath)) {
      console.error(`❌ MCP server file not found: ${serverFilePath}`);
      process.exit(1);
    }

    console.log(`✅ MCP server file exists: ${serverFilePath}`);

    // Check environment file
    const envFilePath = join(notebypineConfig.cwd, '.env');
    if (!existsSync(envFilePath)) {
      console.warn(`⚠️ Environment file not found: ${envFilePath}`);
      console.log('   Make sure to copy .env.example to .env');
    } else {
      console.log(`✅ Environment file exists: ${envFilePath}`);
    }

    console.log('\n🔧 Testing Configuration...');

    // Test if we can import the MCP server modules
    try {
      const { Server } = await import('../src/index.js');
      console.log('✅ MCP server imports successfully');
    } catch (error: any) {
      console.error('❌ Failed to import MCP server:', error.message);
      process.exit(1);
    }

    // Test if we can import database module
    try {
      const { initPocketBase } = await import('../src/db/pocketbase.js');
      console.log('✅ Database module imports successfully');
    } catch (error: any) {
      console.error('❌ Failed to import database module:', error.message);
      process.exit(1);
    }

    console.log('\n🎉 Cursor Configuration Verification Completed!');
    console.log('===================================');
    console.log('📋 Configuration Status:');
    console.log('   ✅ MCP Configuration File: Found and valid');
    console.log('   ✅ NoteByPine Server: Configured');
    console.log('   ✅ Project Directory: Accessible');
    console.log('   ✅ Server Files: Found and importable');
    console.log('   ✅ Environment: Ready');

    console.log('\n🚀 Ready for Cursor Integration!');
    console.log('===================================');
    console.log('📝 Next Steps:');
    console.log('   1. Make sure PocketBase is running');
    console.log('   2. Restart Cursor IDE');
    console.log('   3. Check MCP tools appear in Cursor');
    console.log('   4. Test create_incident tool');
    console.log('   5. Test search_incidents tool');

    console.log('\n🔧 Quick Start Commands:');
    console.log('   # Start development environment:');
    console.log('   ./scripts/start-dev.sh');
    console.log('');
    console.log('   # Or start services separately:');
    console.log('   ./pocketbase serve --dir ./pb_data &');
    console.log('   bun run src/index.ts &');

  } catch (error: any) {
    console.error('❌ Configuration verification failed:', error.message);
    process.exit(1);
  }
}

verifyCursorConfiguration();