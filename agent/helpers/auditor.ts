/**
 * Automated audit system for redaction coverage and logging hygiene
 * Performs periodic audits and generates compliance reports
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { containsSensitiveData, getRedactionSummary } from './redact.js';

export interface AuditResult {
  id: string;
  timestamp: string;
  auditType: 'redaction' | 'logging' | 'security' | 'performance' | 'compliance';
  status: 'pass' | 'warning' | 'fail';
  score: number; // 0-100
  findings: AuditFinding[];
  summary: string;
  recommendations: string[];
  nextAuditDue: string;
}

export interface AuditFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  location?: string;
  evidence?: string;
  fixRecommendation: string;
}

export interface ComplianceReport {
  overallScore: number;
  auditResults: AuditResult[];
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
}

class CodeModeAuditor {
  private auditLogPath: string;
  private reportPath: string;
  private schedulePath: string;

  constructor() {
    const auditDir = join(process.cwd(), 'out', 'audits');
    if (!existsSync(auditDir)) {
      mkdirSync(auditDir, { recursive: true });
    }

    this.auditLogPath = join(auditDir, 'audit-log.json');
    this.reportPath = join(auditDir, 'compliance-report.json');
    this.schedulePath = join(auditDir, 'audit-schedule.json');
  }

  /**
   * Run all audits
   */
  async runFullAudit(): Promise<AuditResult[]> {
    console.log('🔍 Starting comprehensive Code Mode audit...\n');

    const results: AuditResult[] = [];

    // 1. Redaction Coverage Audit
    console.log('📋 Audit 1: Redaction Coverage');
    results.push(await this.auditRedactionCoverage());

    // 2. Logging Hygiene Audit
    console.log('📋 Audit 2: Logging Hygiene');
    results.push(await this.auditLoggingHygiene());

    // 3. Security Audit
    console.log('📋 Audit 3: Security Practices');
    results.push(await this.auditSecurityPractices());

    // 4. Performance Audit
    console.log('📋 Audit 4: Performance Optimization');
    results.push(await this.auditPerformanceOptimization());

    // 5. Compliance Audit
    console.log('📋 Audit 5: Regulatory Compliance');
    results.push(await this.auditCompliance());

    // Save results and generate report
    this.saveAuditResults(results);
    this.generateComplianceReport(results);

    console.log('\n✅ Full audit completed');
    return results;
  }

  /**
   * Audit redaction coverage
   */
  async auditRedactionCoverage(): Promise<AuditResult> {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Check redaction helper functions
    const redactionFile = join(process.cwd(), 'agent/helpers/redact.ts');
    if (!existsSync(redactionFile)) {
      findings.push({
        severity: 'critical',
        category: 'missing-file',
        description: 'Redaction helper not found',
        location: 'agent/helpers/redact.ts',
        fixRecommendation: 'Implement redaction helper with comprehensive patterns'
      });
      score -= 40;
    } else {
      const content = readFileSync(redactionFile, 'utf8');

      // Check for essential redaction patterns
      const essentialPatterns = [
        'email',
        'phone',
        'api_key',
        'password',
        'credit_card',
        'jwt_token'
      ];

      essentialPatterns.forEach(pattern => {
        if (!content.includes(pattern)) {
          findings.push({
            severity: 'high',
            category: 'incomplete-redaction',
            description: `Missing redaction pattern for ${pattern}`,
            location: 'agent/helpers/redact.ts',
            fixRecommendation: `Add redaction pattern for ${pattern}`
          });
          score -= 10;
        }
      });
    }

    // Check if redaction is used in callMCPTool
    const callMCPFile = join(process.cwd(), 'agent/helpers/callMCPTool.ts');
    if (existsSync(callMCPFile)) {
      const content = readFileSync(callMCPFile, 'utf8');
      if (!content.includes('redactArgs') && !content.includes('redactJSON')) {
        findings.push({
          severity: 'high',
          category: 'unused-redaction',
          description: 'Redaction not integrated in tool calls',
          location: 'agent/helpers/callMCPTool.ts',
          fixRecommendation: 'Integrate redaction in callMCPTool helper'
        });
        score -= 20;
      }
    }

    // Test redaction effectiveness
    const testCases = [
      'User email: user@example.com',
      'Phone: 555-123-4567',
      'API key: sk_test_4242424242424242',
      'Password: MySecretPassword123',
      'Card: 4242-4242-4242-4242'
    ];

    let redactionFailures = 0;
    testCases.forEach(testCase => {
      if (containsSensitiveData(testCase)) {
        // This means our test case wasn't redacted properly
        redactionFailures++;
      }
    });

    if (redactionFailures > 0) {
      findings.push({
        severity: 'medium',
        category: 'ineffective-redaction',
        description: `${redactionFailures} test cases not properly redacted`,
        fixRecommendation: 'Review and improve redaction patterns'
      });
      score -= redactionFailures * 5;
    }

    return this.createAuditResult('redaction', score, findings, 'Redaction coverage and effectiveness');
  }

  /**
   * Audit logging hygiene
   */
  async auditLoggingHygiene(): Promise<AuditResult> {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Check helper files for logging practices
    const helperFiles = [
      'agent/helpers/callMCPTool.ts',
      'agent/helpers/router.ts',
      'agent/helpers/searchTools.ts'
    ];

    helperFiles.forEach(file => {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');

        // Check for structured logging
        if (!content.includes('console.log') && !content.includes('logger')) {
          findings.push({
            severity: 'medium',
            category: 'no-logging',
            description: 'No logging found in helper file',
            location: file,
            fixRecommendation: 'Add appropriate logging for debugging and monitoring'
          });
          score -= 15;
        }

        // Check for raw data logging
        if (content.includes('console.log(args)') || content.includes('console.log(result)')) {
          findings.push({
            severity: 'high',
            category: 'raw-data-logging',
            description: 'Raw data potentially being logged without redaction',
            location: file,
            fixRecommendation: 'Use structured logging with redaction'
          });
          score -= 20;
        }

        // Check for error logging
        if (content.includes('try') && !content.includes('console.error')) {
          findings.push({
            severity: 'low',
            category: 'insufficient-error-logging',
            description: 'Error handling without proper logging',
            location: file,
            fixRecommendation: 'Add proper error logging in try-catch blocks'
          });
          score -= 10;
        }
      }
    });

    // Check for log levels and consistency
    const files = [
      'agent/helpers/callMCPTool.ts',
      'agent/skills/triageFromLogfile.ts',
      'agent/skills/saveSheetAsCSV.ts'
    ];

    let hasConsistentLogging = true;
    files.forEach(file => {
      const filePath = join(process.cwd(), file);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        const hasStructuredLogging = content.includes('🔧') || content.includes('✅') || content.includes('❌');
        if (!hasStructuredLogging) {
          hasConsistentLogging = false;
        }
      }
    });

    if (!hasConsistentLogging) {
      findings.push({
        severity: 'low',
        category: 'inconsistent-logging',
        description: 'Inconsistent logging patterns across files',
        fixRecommendation: 'Standardize logging patterns with consistent prefixes'
      });
      score -= 10;
    }

    return this.createAuditResult('logging', score, findings, 'Logging hygiene and best practices');
  }

  /**
   * Audit security practices
   */
  async auditSecurityPractices(): Promise<AuditResult> {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Check for .cursorrules security guidance
    const cursorRulesPath = join(process.cwd(), '.cursorrules');
    if (existsSync(cursorRulesPath)) {
      const content = readFileSync(cursorRulesPath, 'utf8');

      const securityDirectives = [
        'Direct MCP tool invocation',
        'Logging raw request/response',
        'Bypassing the redaction layer'
      ];

      securityDirectives.forEach(directive => {
        if (!content.includes(directive)) {
          findings.push({
            severity: 'high',
            category: 'missing-security-directive',
            description: `Missing security directive: ${directive}`,
            location: '.cursorrules',
            fixRecommendation: `Add prohibition for ${directive}`
          });
          score -= 15;
        }
      });
    } else {
      findings.push({
        severity: 'critical',
        category: 'missing-security-guidance',
        description: 'No .cursorrules file found',
        fixRecommendation: 'Create .cursorrules with security guidance'
      });
      score -= 40;
    }

    // Check for hardcoded secrets in source files
    const sourceFiles = this.findSourceFiles('agent');
    let secretFindings = 0;

    sourceFiles.forEach(file => {
      const content = readFileSync(file, 'utf8');

      // Check for common secret patterns
      const secretPatterns = [
        /sk_[a-zA-Z0-9]{20,}/g, // Stripe keys
        /[a-zA-Z0-9]{32,}/g, // Long alphanumeric strings
        /password\s*=\s*['"][^'"]{8,}['"]/gi, // Passwords
        /api[_-]?key\s*=\s*['"][^'"]{16,}['"]/gi // API keys
      ];

      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          // Filter out false positives
          const suspiciousMatches = matches.filter(match =>
            !match.includes('example') &&
            !match.includes('test') &&
            !match.includes('mock') &&
            !match.includes('sample')
          );

          if (suspiciousMatches.length > 0) {
            secretFindings++;
            findings.push({
              severity: 'critical',
              category: 'hardcoded-secrets',
              description: `Potential hardcoded secrets detected`,
              location: file,
              evidence: `${suspiciousMatches.length} suspicious patterns found`,
              fixRecommendation: 'Remove hardcoded secrets and use environment variables'
            });
          }
        }
      });
    });

    if (secretFindings > 0) {
      score -= secretFindings * 25;
    }

    return this.createAuditResult('security', score, findings, 'Security practices and compliance');
  }

  /**
   * Audit performance optimization
   */
  async auditPerformanceOptimization(): Promise<AuditResult> {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Check for chunking implementation
    const callMCPFile = join(process.cwd(), 'agent/helpers/callMCPTool.ts');
    if (existsSync(callMCPFile)) {
      const content = readFileSync(callMCPFile, 'utf8');

      if (!content.includes('chunk') && !content.includes('slice')) {
        findings.push({
          severity: 'medium',
          category: 'no-chunking',
          description: 'No chunking implementation for large datasets',
          location: 'agent/helpers/callMCPTool.ts',
          fixRecommendation: 'Implement chunking for processing large datasets'
        });
        score -= 20;
      }

      if (!content.includes('sampleSize') && !content.includes('limit')) {
        findings.push({
          severity: 'low',
          category: 'no-sampling',
          description: 'No sampling for large result sets',
          location: 'agent/helpers/callMCPTool.ts',
          fixRecommendation: 'Implement result sampling to reduce token usage'
        });
        score -= 15;
      }
    }

    // Check for caching mechanisms
    const routingFile = join(process.cwd(), 'agent/helpers/router.ts');
    if (existsSync(routingFile)) {
      const content = readFileSync(routingFile, 'utf8');

      if (!content.includes('cache') && !content.includes('Cache')) {
        findings.push({
          severity: 'low',
          category: 'no-caching',
          description: 'No caching mechanism for routing decisions',
          location: 'agent/helpers/router.ts',
          fixRecommendation: 'Implement caching for frequently accessed data'
        });
        score -= 10;
      }
    }

    return this.createAuditResult('performance', score, findings, 'Performance optimization and efficiency');
  }

  /**
   * Audit regulatory compliance
   */
  async auditCompliance(): Promise<AuditResult> {
    const findings: AuditFinding[] = [];
    let score = 100;

    // Check for documentation
    const requiredDocs = [
      'README.md',
      'docs/specs/tools',
      '.cursorrules',
      'mcp.routing.json'
    ];

    requiredDocs.forEach(doc => {
      const docPath = join(process.cwd(), doc);
      if (!existsSync(docPath)) {
        findings.push({
          severity: 'medium',
          category: 'missing-documentation',
          description: `Required documentation missing: ${doc}`,
          fixRecommendation: `Create or update ${doc}`
        });
        score -= 15;
      }
    });

    // Check for test coverage
    const testFiles = this.findSourceFiles('tests');
    const sourceFiles = this.findSourceFiles('agent');

    if (testFiles.length === 0) {
      findings.push({
        severity: 'medium',
        category: 'no-tests',
        description: 'No test files found',
        fixRecommendation: 'Add comprehensive test suite'
      });
      score -= 25;
    } else {
      const coverageRatio = testFiles.length / sourceFiles.length;
      if (coverageRatio < 0.5) {
        findings.push({
          severity: 'low',
          category: 'low-test-coverage',
          description: `Low test coverage: ${Math.round(coverageRatio * 100)}%`,
          fixRecommendation: 'Increase test coverage to at least 50%'
        });
        score -= 10;
      }
    }

    return this.createAuditResult('compliance', score, findings, 'Documentation and testing compliance');
  }

  /**
   * Find all source files in a directory
   */
  private findSourceFiles(dir: string): string[] {
    const fs = require('fs');
    const path = require('path');
    const files: string[] = [];

    function walkDirectory(currentDir: string) {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.')) {
          walkDirectory(fullPath);
        } else if (item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    }

    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      walkDirectory(fullPath);
    }

    return files;
  }

  /**
   * Create audit result
   */
  private createAuditResult(
    auditType: AuditResult['auditType'],
    score: number,
    findings: AuditFinding[],
    summary: string
  ): AuditResult {
    // Determine status based on score and critical findings
    let status: AuditResult['status'] = 'pass';
    if (score < 70 || findings.some(f => f.severity === 'critical')) {
      status = 'fail';
    } else if (score < 85 || findings.some(f => f.severity === 'high')) {
      status = 'warning';
    }

    // Generate recommendations
    const recommendations = findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .map(f => f.fixRecommendation)
      .slice(0, 5);

    // Schedule next audit based on findings
    const nextAuditDays = findings.some(f => f.severity === 'critical') ? 7 :
                          findings.some(f => f.severity === 'high') ? 14 :
                          findings.some(f => f.severity === 'medium') ? 30 : 90;

    const nextAuditDue = new Date();
    nextAuditDue.setDate(nextAuditDue.getDate() + nextAuditDays);

    return {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      auditType,
      status,
      score: Math.max(0, Math.min(100, score)),
      findings,
      summary,
      recommendations,
      nextAuditDue: nextAuditDue.toISOString()
    };
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save audit results
   */
  private saveAuditResults(results: AuditResult[]): void {
    const existingLog = this.loadAuditLog();
    existingLog.push(...results);
    writeFileSync(this.auditLogPath, JSON.stringify(existingLog, null, 2));
  }

  /**
   * Load existing audit log
   */
  private loadAuditLog(): AuditResult[] {
    if (!existsSync(this.auditLogPath)) {
      return [];
    }

    try {
      const content = readFileSync(this.auditLogPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load audit log:', error);
      return [];
    }
  }

  /**
   * Generate compliance report
   */
  private generateComplianceReport(results: AuditResult[]): void {
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const criticalFindings = results.flatMap(r => r.findings).filter(f => f.severity === 'critical');
    const riskLevel: ComplianceReport['riskLevel'] =
      criticalFindings.length > 0 ? 'critical' :
      overallScore < 70 ? 'high' :
      overallScore < 85 ? 'medium' : 'low';

    const actionItems = results
      .flatMap(r => r.recommendations)
      .filter((item, index, arr) => arr.indexOf(item) === index) // Remove duplicates
      .slice(0, 10);

    const report: ComplianceReport = {
      overallScore,
      auditResults: results,
      trends: {
        improving: [],
        declining: [],
        stable: []
      },
      riskLevel,
      actionItems
    };

    writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
  }

  /**
   * Get latest compliance report
   */
  getComplianceReport(): ComplianceReport | null {
    if (!existsSync(this.reportPath)) {
      return null;
    }

    try {
      const content = readFileSync(this.reportPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load compliance report:', error);
      return null;
    }
  }

  /**
   * Schedule automated audits
   */
  scheduleAudit(frequencyDays: number = 30): void {
    const schedule = {
      enabled: true,
      frequencyDays,
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString()
    };

    writeFileSync(this.schedulePath, JSON.stringify(schedule, null, 2));
    console.log(`📅 Audit scheduled every ${frequencyDays} days`);
  }

  /**
   * Check if audit is due
   */
  isAuditDue(): boolean {
    if (!existsSync(this.schedulePath)) {
      return true; // No schedule, run now
    }

    try {
      const schedule = JSON.parse(readFileSync(this.schedulePath, 'utf8'));
      return new Date() >= new Date(schedule.nextAudit);
    } catch (error) {
      return true;
    }
  }
}

// Singleton instance
const auditor = new CodeModeAuditor();

// Export convenience functions
export const runFullAudit = () => auditor.runFullAudit();
export const getComplianceReport = () => auditor.getComplianceReport();
export const scheduleAudit = (days?: number) => auditor.scheduleAudit(days);
export const isAuditDue = () => auditor.isAuditDue();

// CLI command for audits
export async function handleAuditCLI(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.log('🔍 Audit System Usage:');
    console.log('  bun run agent:audit run          # Run full audit');
    console.log('  bun run agent:audit report       # Show compliance report');
    console.log('  bun run agent:audit schedule <n> # Schedule audit every n days');
    console.log('  bun run agent:audit status       # Check if audit is due');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'run':
      const results = await runFullAudit();
      console.log('\n📊 Audit Summary:');
      results.forEach(result => {
        console.log(`${result.auditType}: ${result.status.toUpperCase()} (${result.score}/100)`);
        if (result.findings.length > 0) {
          console.log(`  Findings: ${result.findings.length}`);
        }
      });
      break;

    case 'report':
      const report = getComplianceReport();
      if (report) {
        console.log(`📈 Overall Score: ${report.overallScore.toFixed(1)}/100`);
        console.log(`🚨 Risk Level: ${report.riskLevel.toUpperCase()}`);
        console.log(`📋 Action Items: ${report.actionItems.length}`);
        if (report.actionItems.length > 0) {
          console.log('\nTop Action Items:');
          report.actionItems.slice(0, 5).forEach((item, i) => {
            console.log(`${i + 1}. ${item}`);
          });
        }
      } else {
        console.log('No compliance report available. Run audit first.');
      }
      break;

    case 'schedule':
      const days = args[1] ? parseInt(args[1]) : 30;
      scheduleAudit(days);
      break;

    case 'status':
      if (isAuditDue()) {
        console.log('⚠️ Audit is due! Run: bun run agent:audit run');
      } else {
        console.log('✅ Audit up to date');
      }
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      break;
  }
}

export default auditor;