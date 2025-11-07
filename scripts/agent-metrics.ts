#!/usr/bin/env bun

/**
 * Agent Metrics Script
 * Shows routing metrics and performance information for Code Mode
 */

import { getRoutingMetrics, exportMetrics } from '../agent/helpers/router.js';
import { searchTools, getAllTools, findToolsForTask } from '../agent/helpers/searchTools.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface MetricsReport {
  routingMetrics: any;
  configurationStatus: any;
  toolInventory: any;
  performanceAnalysis: any;
}

class AgentMetrics {
  private startTime: number = Date.now();

  async collectRoutingMetrics(): Promise<any> {
    console.log('🛣️ Collecting routing metrics...');

    try {
      const metrics = getRoutingMetrics();
      return {
        ...metrics,
        successRate: metrics.totalCalls > 0 ? ((metrics.totalCalls - metrics.errors) / metrics.totalCalls * 100).toFixed(1) + '%' : 'N/A',
        wrapperUsageRate: metrics.totalCalls > 0 ? (metrics.wrapperCalls / metrics.totalCalls * 100).toFixed(1) + '%' : 'N/A',
        fallbackRate: metrics.totalCalls > 0 ? (metrics.fallbackCalls / metrics.totalCalls * 100).toFixed(1) + '%' : 'N/A'
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        note: 'Metrics not available - try running some agent operations first'
      };
    }
  }

  async analyzeConfiguration(): Promise<any> {
    console.log('⚙️ Analyzing configuration...');

    const configPath = join(process.cwd(), 'mcp.routing.json');
    const cursorRulesPath = join(process.cwd(), '.cursorrules');

    const analysis = {
      routingConfig: { exists: false, valid: false, mode: null },
      cursorRules: { exists: false, directives: 0, wordCount: 0 },
      packageScripts: { exists: false, agentScripts: 0 },
      overallScore: 0
    };

    // Check routing config
    if (existsSync(configPath)) {
      analysis.routingConfig.exists = true;
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        analysis.routingConfig.valid = true;
        analysis.routingConfig.mode = config.defaultMode;
        analysis.routingConfig.serverCount = Object.keys(config.servers).length;
      } catch (error) {
        analysis.routingConfig.valid = false;
      }
    }

    // Check cursor rules
    if (existsSync(cursorRulesPath)) {
      analysis.cursorRules.exists = true;
      const content = readFileSync(cursorRulesPath, 'utf8');
      analysis.cursorRules.directives = (content.match(/^(#+\s)/gm) || []).length;
      analysis.cursorRules.wordCount = content.split(/\s+/).length;
    }

    // Check package.json scripts
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (existsSync(packageJsonPath)) {
      analysis.packageScripts.exists = true;
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        const agentScripts = Object.keys(packageJson.scripts || {}).filter(script => script.startsWith('agent:'));
        analysis.packageScripts.agentScripts = agentScripts.length;
      } catch (error) {
        // Invalid package.json
      }
    }

    // Calculate overall score
    let score = 0;
    if (analysis.routingConfig.exists) score += 25;
    if (analysis.routingConfig.valid) score += 25;
    if (analysis.cursorRules.exists) score += 25;
    if (analysis.packageScripts.agentScripts >= 3) score += 25;

    analysis.overallScore = score;

    return analysis;
  }

  async inventoryTools(): Promise<any> {
    console.log('🔧 Inventorying available tools...');

    try {
      const allTools = getAllTools();
      const toolCategories = {};
      const toolSummary = [];

      for (const tool of allTools) {
        // Categorize tools by functionality
        let category = 'general';
        if (tool.name.includes('incident')) category = 'incident_management';
        else if (tool.name.includes('solution')) category = 'solution_management';
        else if (tool.name.includes('search') || tool.name.includes('similar')) category = 'search';
        else if (tool.name.includes('export')) category = 'export';
        else if (tool.name.includes('extract') || tool.name.includes('lessons')) category = 'analysis';

        if (!toolCategories[category]) {
          toolCategories[category] = [];
        }
        toolCategories[category].push(tool.name);

        toolSummary.push({
          name: tool.name,
          category,
          descriptionLength: tool.briefDescription.length,
          hasSpecPath: !!tool.specPath
        });
      }

      return {
        totalTools: allTools.length,
        categories: toolCategories,
        tools: toolSummary,
        specCoverage: toolSummary.filter(t => t.hasSpecPath).length
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTools: 0
      };
    }
  }

  async analyzePerformance(): Promise<any> {
    console.log('📊 Analyzing performance characteristics...');

    const startTime = Date.now();
    const performanceTests = [];

    // Test tool discovery performance
    try {
      const discoveryStart = Date.now();
      const tools = searchTools('incident');
      const discoveryTime = Date.now() - discoveryStart;
      performanceTests.push({
        operation: 'Tool Discovery (incident)',
        duration: discoveryTime,
        resultCount: tools.length,
        success: true
      });
    } catch (error) {
      performanceTests.push({
        operation: 'Tool Discovery (incident)',
        duration: 0,
        resultCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test workflow suggestions performance
    try {
      const workflowStart = Date.now();
      const suggestions = findToolsForTask('create incident from logs');
      const workflowTime = Date.now() - workflowStart;
      performanceTests.push({
        operation: 'Workflow Suggestions',
        duration: workflowTime,
        resultCount: suggestions.primaryTools.length + suggestions.secondaryTools.length,
        success: true
      });
    } catch (error) {
      performanceTests.push({
        operation: 'Workflow Suggestions',
        duration: 0,
        resultCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test routing config loading performance
    try {
      const configStart = Date.now();
      const metrics = getRoutingMetrics();
      const configTime = Date.now() - configStart;
      performanceTests.push({
        operation: 'Metrics Retrieval',
        duration: configTime,
        resultCount: 1,
        success: true
      });
    } catch (error) {
      performanceTests.push({
        operation: 'Metrics Retrieval',
        duration: 0,
        resultCount: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const totalTime = Date.now() - startTime;

    return {
      totalAnalysisTime: totalTime,
      tests: performanceTests,
      averageOperationTime: performanceTests.length > 0
        ? (performanceTests.reduce((sum, test) => sum + test.duration, 0) / performanceTests.length).toFixed(2)
        : 0,
      successRate: performanceTests.length > 0
        ? (performanceTests.filter(test => test.success).length / performanceTests.length * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  async generateRecommendations(config: any, tools: any): Promise<string[]> {
    console.log('💡 Generating recommendations...');

    const recommendations = [];

    // Configuration recommendations
    if (!config.routingConfig.exists) {
      recommendations.push('Create mcp.routing.json to enable intelligent routing');
    } else if (!config.routingConfig.valid) {
      recommendations.push('Fix validation errors in mcp.routing.json');
    }

    if (!config.cursorRules.exists) {
      recommendations.push('Create .cursorrules to guide agents in Code Mode');
    } else if (config.cursorRules.wordCount < 500) {
      recommendations.push('Expand .cursorrules with more detailed guidance');
    }

    if (config.packageScripts.agentScripts < 4) {
      recommendations.push('Add missing agent scripts to package.json (agent:demo, agent:test, agent:validate, agent:metrics)');
    }

    // Tool recommendations
    if (tools.totalTools < 5) {
      recommendations.push('Add more tool wrappers to increase functionality coverage');
    }

    if (tools.specCoverage < tools.totalTools) {
      recommendations.push('Create missing tool specification documents in docs/specs/tools/');
    }

    // Performance recommendations
    const overallScore = config.overallScore;
    if (overallScore < 100) {
      recommendations.push('Complete Phase 1-3 setup to achieve full Code Mode functionality');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Excellent setup! Consider adding custom skills for your specific workflows');
    }

    return recommendations;
  }

  async printFullReport(): Promise<void> {
    console.log('📈 Agent Code Mode Metrics Report');
    console.log('==================================\n');

    const routingMetrics = await this.collectRoutingMetrics();
    const configuration = await this.analyzeConfiguration();
    const tools = await this.inventoryTools();
    const performance = await this.analyzePerformance();
    const recommendations = await this.generateRecommendations(configuration, tools);

    // Routing Metrics Section
    console.log('🛣️ Routing Metrics');
    console.log('------------------');
    if (routingMetrics.error) {
      console.log(`❌ ${routingMetrics.error}`);
      console.log(`💡 ${routingMetrics.note}`);
    } else {
      console.log(`Total Calls: ${routingMetrics.totalCalls}`);
      console.log(`Wrapper Calls: ${routingMetrics.wrapperCalls} (${routingMetrics.wrapperUsageRate})`);
      console.log(`Direct Calls: ${routingMetrics.directCalls}`);
      console.log(`Fallback Calls: ${routingMetrics.fallbackCalls} (${routingMetrics.fallbackRate})`);
      console.log(`Success Rate: ${routingMetrics.successRate}`);
      console.log(`Average Latency: ${routingMetrics.averageLatency.toFixed(2)}ms`);
      console.log(`Errors: ${routingMetrics.errors}`);
    }

    // Configuration Section
    console.log('\n⚙️ Configuration Analysis');
    console.log('------------------------');
    console.log(`Overall Score: ${configuration.overallScore}/100`);
    console.log(`Routing Config: ${configuration.routingConfig.exists ? '✅' : '❌'} ${configuration.routingConfig.valid ? '(valid)' : '(invalid)'}`);
    console.log(`Cursor Rules: ${configuration.cursorRules.exists ? '✅' : '❌'} (${configuration.cursorRules.directives} directives, ${configuration.cursorRules.wordCount} words)`);
    console.log(`Agent Scripts: ${configuration.packageScripts.exists ? '✅' : '❌'} (${configuration.packageScripts.agentScripts} scripts)`);

    // Tool Inventory Section
    console.log('\n🔧 Tool Inventory');
    console.log('-----------------');
    if (tools.error) {
      console.log(`❌ ${tools.error}`);
    } else {
      console.log(`Total Tools: ${tools.totalTools}`);
      console.log(`Spec Coverage: ${tools.specCoverage}/${tools.totalTools}`);
      console.log('Categories:');
      Object.entries(tools.categories).forEach(([category, toolList]: [string, string[]]) => {
        console.log(`  ${category}: ${toolList.length} tools`);
        toolList.forEach(tool => console.log(`    - ${tool}`));
      });
    }

    // Performance Section
    console.log('\n📊 Performance Analysis');
    console.log('-----------------------');
    console.log(`Analysis Time: ${performance.totalAnalysisTime}ms`);
    console.log(`Average Operation Time: ${performance.averageOperationTime}ms`);
    console.log(`Success Rate: ${performance.successRate}`);
    console.log('Operations:');
    performance.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`  ${status} ${test.operation}: ${test.duration}ms (${test.resultCount} results)${test.error ? ` - ${test.error}` : ''}`);
    });

    // Recommendations Section
    console.log('\n💡 Recommendations');
    console.log('------------------');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Export Metrics Section
    console.log('\n📋 Detailed Metrics Export');
    console.log('--------------------------');
    try {
      console.log(exportMetrics());
    } catch (error) {
      console.log('❌ Failed to export detailed metrics');
    }

    // Final Summary
    const totalDuration = Date.now() - this.startTime;
    console.log(`\n⏱️ Report generated in ${totalDuration}ms`);
    console.log(`🔍 Use 'bun run agent:validate' for detailed validation`);
    console.log(`🧪 Use 'bun run agent:test' for end-to-end testing`);
    console.log(`🎮 Use 'bun run agent:demo' for interactive demonstration`);
  }

  async runMetricsReport(): Promise<void> {
    await this.printFullReport();
  }
}

// Run metrics if this script is called directly
if (import.meta.main) {
  const metrics = new AgentMetrics();
  await metrics.runMetricsReport();
}