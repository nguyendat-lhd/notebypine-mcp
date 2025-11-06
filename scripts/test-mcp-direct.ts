#!/usr/bin/env bun
/**
 * Test MCP tools directly without needing Cursor IDE
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

async function testMCPTools() {
  console.log('🧪 MCP Tools Direct Test');
  console.log('=========================');

  // Start MCP server process
  const mcpProcess = spawn('bun', ['run', 'src/index.ts'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  const rl = createInterface({
    input: mcpProcess.stdout,
    output: mcpProcess.stdin
  });

  let testResults = {
    initialized: false,
    toolsListed: false,
    createIncidentTested: false,
    searchIncidentsTested: false
  };

  // Handle server responses
  mcpProcess.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('📩 Server Response:', response);

    try {
      const parsed = JSON.parse(response);

      if (parsed.result && parsed.result.capabilities) {
        testResults.initialized = true;
        console.log('✅ MCP Server initialized successfully');

        // Test listing tools
        setTimeout(() => {
          testListTools(mcpProcess.stdin);
        }, 1000);
      }

      if (parsed.result && parsed.result.tools) {
        testResults.toolsListed = true;
        console.log('✅ Tools listed successfully:', parsed.result.tools.map((t: any) => t.name));

        // Test create_incident tool
        setTimeout(() => {
          testCreateIncident(mcpProcess.stdin);
        }, 1000);
      }

      if (parsed.result && parsed.result.content) {
        if (parsed.result.content[0] && parsed.result.content[0].text.includes('Incident created successfully')) {
          testResults.createIncidentTested = true;
          console.log('✅ create_incident tool working');

          // Test search_incidents tool
          setTimeout(() => {
            testSearchIncidents(mcpProcess.stdin);
          }, 1000);
        }

        if (parsed.result.content[0] && parsed.result.content[0].text.includes('Found')) {
          testResults.searchIncidentsTested = true;
          console.log('✅ search_incidents tool working');

          // All tests complete
          setTimeout(() => {
            summarizeTests(testResults);
            mcpProcess.kill();
          }, 1000);
        }
      }
    } catch (e) {
      // Not JSON, ignore
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.log('📝 Server Log:', data.toString().trim());
  });

  // Handle process exit
  mcpProcess.on('close', (code) => {
    console.log(`\n🏁 MCP Process exited with code ${code}`);
    summarizeTests(testResults);
  });

  // Initialize the MCP connection
  setTimeout(() => {
    const initRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        clientInfo: {
          name: "test-client",
          version: "1.0.0"
        }
      }
    };

    console.log('📤 Sending initialization...');
    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 2000);

  // Timeout after 30 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout, stopping...');
    summarizeTests(testResults);
    mcpProcess.kill();
  }, 30000);
}

function testListTools(stdin: any) {
  console.log('📤 Testing tools/list...');
  const listToolsRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  stdin.write(JSON.stringify(listToolsRequest) + '\n');
}

function testCreateIncident(stdin: any) {
  console.log('📤 Testing create_incident...');
  const createIncidentRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "create_incident",
      arguments: {
        title: "Test Incident from Direct MCP Test",
        category: "Backend",
        description: "Testing MCP tool functionality directly",
        severity: "medium",
        symptoms: "No symptoms, just testing",
        context: "Direct MCP tool test"
      }
    }
  };
  stdin.write(JSON.stringify(createIncidentRequest) + '\n');
}

function testSearchIncidents(stdin: any) {
  console.log('📤 Testing search_incidents...');
  const searchIncidentsRequest = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "search_incidents",
      arguments: {
        category: "Backend",
        limit: 5
      }
    }
  };
  stdin.write(JSON.stringify(searchIncidentsRequest) + '\n');
}

function summarizeTests(results: any) {
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`   ✅ Initialization: ${results.initialized ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Tools Listed: ${results.toolsListed ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Create Incident: ${results.createIncidentTested ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Search Incidents: ${results.searchIncidentsTested ? 'PASS' : 'FAIL'}`);

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log('\n🎉 All MCP Tool Tests Passed!');
    console.log('🚀 Ready for Cursor IDE Integration!');
  } else {
    console.log('\n❌ Some tests failed. Check the logs above.');
  }
}

testMCPTools();