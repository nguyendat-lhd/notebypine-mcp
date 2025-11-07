#!/usr/bin/env bun

/**
 * Agent Validation Script
 * Validates the Code Mode agent configuration and setup
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateRoutingConfig, getRoutingConfig } from '../agent/helpers/router.js';

interface ValidationResult {
  valid: boolean;
  category: string;
  message: string;
  fix?: string;
}

class AgentValidator {
  private results: ValidationResult[] = [];

  addResult(category: string, valid: boolean, message: string, fix?: string): void {
    this.results.push({ valid, category, message, fix });
  }

  validateFileStructure(): void {
    console.log('📁 Validating file structure...');

    const requiredFiles = [
      'agent/helpers/callMCPTool.ts',
      'agent/helpers/redact.ts',
      'agent/helpers/searchTools.ts',
      'agent/helpers/router.ts',
      'agent/servers/notebypine/index.ts',
      'agent/servers/notebypine/createIncident.ts',
      'agent/servers/notebypine/searchIncidents.ts',
      'agent/servers/notebypine/addSolution.ts',
      'agent/servers/notebypine/extractLessons.ts',
      'agent/servers/notebypine/exportKnowledge.ts',
      'agent/skills/triageFromLogfile.ts',
      'agent/skills/saveSheetAsCSV.ts',
      'agent/examples/incident_to_kb.ts',
      'mcp.routing.json',
      '.cursorrules'
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
      const filePath = join(process.cwd(), file);
      const exists = existsSync(filePath);

      if (exists) {
        this.addResult('File Structure', true, `✅ ${file} exists`);
      } else {
        allFilesExist = false;
        this.addResult('File Structure', false, `❌ Missing file: ${file}`, 'Run Phase 1 and 2 setup scripts');
      }
    }

    if (allFilesExist) {
      this.addResult('File Structure', true, '✅ All required files present');
    }
  }

  validateRoutingConfiguration(): void {
    console.log('🛣️ Validating routing configuration...');

    try {
      const validation = validateRoutingConfig();

      if (validation.valid) {
        this.addResult('Routing Config', true, '✅ Routing configuration is valid');
      } else {
        validation.errors.forEach(error => {
          this.addResult('Routing Config', false, `❌ ${error}`, 'Check mcp.routing.json syntax and required fields');
        });
      }

      // Check specific routing requirements
      const config = getRoutingConfig();
      const notebypineConfig = config.servers.notebypine;

      if (notebypineConfig) {
        if (notebypineConfig.mode === 'code') {
          this.addResult('Routing Config', true, '✅ NotByPine server configured for Code Mode');
        } else {
          this.addResult('Routing Config', false, '❌ NotByPine server not in Code Mode', 'Set mode to "code" in mcp.routing.json');
        }

        if (notebypineConfig.capabilities?.supportsWrapper) {
          this.addResult('Routing Config', true, '✅ Wrapper support enabled');
        } else {
          this.addResult('Routing Config', false, '❌ Wrapper support disabled', 'Enable supportsWrapper in capabilities');
        }

        if (config.globalSettings?.preferWrapperRoutes) {
          this.addResult('Routing Config', true, '✅ Preferring wrapper routes');
        } else {
          this.addResult('Routing Config', false, '❌ Not preferring wrapper routes', 'Enable preferWrapperRoutes in globalSettings');
        }
      } else {
        this.addResult('Routing Config', false, '❌ NotByPine server configuration missing', 'Add notebypine server config to mcp.routing.json');
      }

    } catch (error) {
      this.addResult('Routing Config', false, `❌ Configuration loading failed: ${error}`, 'Check mcp.routing.json syntax');
    }
  }

  validateCursorRules(): void {
    console.log('📋 Validating Cursor rules...');

    const cursorRulesPath = join(process.cwd(), '.cursorrules');

    if (!existsSync(cursorRulesPath)) {
      this.addResult('Cursor Rules', false, '❌ .cursorrules file missing', 'Create .cursorrules with Code Mode guidance');
      return;
    }

    try {
      const content = readFileSync(cursorRulesPath, 'utf8');

      // Check for key Code Mode directives
      const requiredDirectives = [
        'Tool Discovery First',
        'Route Through Helper Stack',
        'Security & Logging',
        'Use Skills for Complex Workflows',
        'agent/helpers/callMCPTool.ts',
        'agent/helpers/router.ts'
      ];

      let missingDirectives: string[] = [];

      for (const directive of requiredDirectives) {
        if (!content.includes(directive)) {
          missingDirectives.push(directive);
        }
      }

      if (missingDirectives.length === 0) {
        this.addResult('Cursor Rules', true, '✅ .cursorrules contains all required directives');
      } else {
        this.addResult('Cursor Rules', false, `❌ Missing directives in .cursorrules: ${missingDirectives.join(', ')}`, 'Update .cursorrules with complete Code Mode guidance');
      }

      // Check for prohibited patterns
      const prohibitedPatterns = [
        'Direct MCP tool invocation',
        'Logging raw request/response',
        'Bypassing the redaction layer'
      ];

      for (const pattern of prohibitedPatterns) {
        if (content.includes(pattern)) {
          this.addResult('Cursor Rules', true, `✅ Prohibits ${pattern.toLowerCase()}`);
        } else {
          this.addResult('Cursor Rules', false, `❌ Should prohibit ${pattern.toLowerCase()}`, 'Add prohibition to .cursorrules');
        }
      }

    } catch (error) {
      this.addResult('Cursor Rules', false, `❌ Failed to read .cursorrules: ${error}`, 'Check .cursorrules file permissions and format');
    }
  }

  validatePackageJson(): void {
    console.log('📦 Validating package.json scripts...');

    const packageJsonPath = join(process.cwd(), 'package.json');

    if (!existsSync(packageJsonPath)) {
      this.addResult('Package JSON', false, '❌ package.json missing', 'Initialize package.json');
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        'agent:demo',
        'agent:test',
        'agent:validate',
        'agent:metrics'
      ];

      let missingScripts: string[] = [];

      for (const script of requiredScripts) {
        if (!scripts[script]) {
          missingScripts.push(script);
        }
      }

      if (missingScripts.length === 0) {
        this.addResult('Package JSON', true, '✅ All agent scripts present in package.json');
      } else {
        this.addResult('Package JSON', false, `❌ Missing scripts: ${missingScripts.join(', ')}`, 'Add missing scripts to package.json');
      }

    } catch (error) {
      this.addResult('Package JSON', false, `❌ Failed to parse package.json: ${error}`, 'Check package.json syntax');
    }
  }

  validateDependencies(): void {
    console.log('📚 Validating dependencies...');

    const packageJsonPath = join(process.cwd(), 'package.json');

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const dependencies = packageJson.dependencies || {};

      const requiredDeps = [
        '@modelcontextprotocol/sdk',
        'pocketbase',
        'zod'
      ];

      let missingDeps: string[] = [];

      for (const dep of requiredDeps) {
        if (!dependencies[dep]) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length === 0) {
        this.addResult('Dependencies', true, '✅ All required dependencies present');
      } else {
        this.addResult('Dependencies', false, `❌ Missing dependencies: ${missingDeps.join(', ')}`, 'Install missing dependencies: bun install <package>');
      }

      // Check TypeScript support
      const devDependencies = packageJson.devDependencies || {};
      if (devDependencies.typescript || devDependencies['@types/node']) {
        this.addResult('Dependencies', true, '✅ TypeScript support available');
      } else {
        this.addResult('Dependencies', false, '❌ TypeScript support missing', 'Add TypeScript as dev dependency');
      }

    } catch (error) {
      this.addResult('Dependencies', false, `❌ Failed to check dependencies: ${error}`, 'Check package.json structure');
    }
  }

  validateDirectoryStructure(): void {
    console.log('📂 Validating directory structure...');

    const requiredDirs = [
      'agent',
      'agent/helpers',
      'agent/servers',
      'agent/servers/notebypine',
      'agent/skills',
      'agent/examples',
      'src',
      'src/mcp',
      'scripts'
    ];

    for (const dir of requiredDirs) {
      const dirPath = join(process.cwd(), dir);

      if (existsSync(dirPath)) {
        this.addResult('Directory Structure', true, `✅ Directory exists: ${dir}`);
      } else {
        this.addResult('Directory Structure', false, `❌ Missing directory: ${dir}`, 'Create missing directory');
      }
    }
  }

  printSummary(): void {
    console.log('\n📊 Validation Summary');
    console.log('======================');

    const categories = [...new Set(this.results.map(r => r.category))];
    const validResults = this.results.filter(r => r.valid);
    const invalidResults = this.results.filter(r => !r.valid);

    console.log(`Total Checks: ${this.results.length}`);
    console.log(`Passed: ${validResults.length} ✅`);
    console.log(`Failed: ${invalidResults.length} ❌`);

    if (invalidResults.length > 0) {
      console.log('\n❌ Failed Checks:');

      categories.forEach(category => {
        const categoryFailures = invalidResults.filter(r => r.category === category);
        if (categoryFailures.length > 0) {
          console.log(`\n${category}:`);
          categoryFailures.forEach(failure => {
            console.log(`  ❌ ${failure.message}`);
            if (failure.fix) {
              console.log(`     💡 Fix: ${failure.fix}`);
            }
          });
        }
      });

      console.log('\n🔧 Recommended Actions:');
      const uniqueFixes = [...new Set(invalidResults.filter(r => r.fix).map(r => r.fix))];
      uniqueFixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix}`);
      });
    } else {
      console.log('\n🎉 All validations passed! Agent Code Mode is properly configured.');
      console.log('\n✅ Ready to use Code Mode with Cursor and Claude Desktop');
    }
  }

  async runAllValidations(): Promise<void> {
    console.log('🔍 Agent Code Mode Validation');
    console.log('===============================\n');

    this.validateFileStructure();
    this.validateDirectoryStructure();
    this.validateRoutingConfiguration();
    this.validateCursorRules();
    this.validatePackageJson();
    this.validateDependencies();

    this.printSummary();
  }
}

// Run validations if this script is called directly
if (import.meta.main) {
  const validator = new AgentValidator();
  await validator.runAllValidations();
}