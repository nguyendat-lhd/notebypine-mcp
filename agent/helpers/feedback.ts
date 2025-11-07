/**
 * Feedback collection and iteration system for Code Mode
 * Collects user feedback from Cursor/Claude users and drives improvements
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  source: 'cursor' | 'claude' | 'cli' | 'test';
  category: 'performance' | 'usability' | 'bug' | 'feature' | 'documentation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  context?: {
    toolUsed?: string;
    operation?: string;
    data?: any;
    error?: string;
  };
  userAgent?: string;
  version: string;
  resolved: boolean;
  resolutionNotes?: string;
  tags: string[];
}

export interface FeedbackMetrics {
  totalFeedback: number;
  unresolvedIssues: number;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  averageResolutionTime: number;
  satisfactionScore: number;
}

export interface ImprovementSuggestion {
  category: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  implementationNotes: string;
  estimatedEffort: 'small' | 'medium' | 'large';
  relatedFeedback: string[];
}

class FeedbackSystem {
  private feedbackPath: string;
  private metricsPath: string;
  private suggestionsPath: string;
  private version: string;

  constructor() {
    const outputDir = join(process.cwd(), 'out', 'feedback');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    this.feedbackPath = join(outputDir, 'feedback.json');
    this.metricsPath = join(outputDir, 'metrics.json');
    this.suggestionsPath = join(outputDir, 'suggestions.json');
    this.version = '1.0.0'; // This should match package.json version
  }

  /**
   * Submit new feedback
   */
  submitFeedback(feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'version' | 'resolved'>): string {
    const feedbackId = this.generateId();
    const timestamp = new Date().toISOString();

    const fullFeedback: FeedbackEntry = {
      ...feedback,
      id: feedbackId,
      timestamp,
      version: this.version,
      resolved: false
    };

    const existingFeedback = this.loadFeedback();
    existingFeedback.push(fullFeedback);
    this.saveFeedback(existingFeedback);

    console.log(`📝 Feedback submitted: ${feedbackId} - ${feedback.title}`);
    return feedbackId;
  }

  /**
   * Generate unique ID for feedback entry
   */
  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Load existing feedback from file
   */
  private loadFeedback(): FeedbackEntry[] {
    if (!existsSync(this.feedbackPath)) {
      return [];
    }

    try {
      const data = readFileSync(this.feedbackPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load feedback:', error);
      return [];
    }
  }

  /**
   * Save feedback to file
   */
  private saveFeedback(feedback: FeedbackEntry[]): void {
    writeFileSync(this.feedbackPath, JSON.stringify(feedback, null, 2));
  }

  /**
   * Get feedback metrics
   */
  getMetrics(): FeedbackMetrics {
    const feedback = this.loadFeedback();
    const now = new Date().toISOString();

    const categoryBreakdown: Record<string, number> = {};
    const severityBreakdown: Record<string, number> = {};
    const sourceBreakdown: Record<string, number> = {};

    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let satisfactionScores: number[] = [];

    feedback.forEach(entry => {
      // Category breakdown
      categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] || 0) + 1;

      // Severity breakdown
      severityBreakdown[entry.severity] = (severityBreakdown[entry.severity] || 0) + 1;

      // Source breakdown
      sourceBreakdown[entry.source] = (sourceBreakdown[entry.source] || 0) + 1;

      // Resolution time
      if (entry.resolved && entry.resolutionNotes) {
        const created = new Date(entry.timestamp);
        const resolved = new Date(entry.resolutionNotes);
        const resolutionTime = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }

      // Satisfaction score (inferred from severity and resolution status)
      if (entry.resolved) {
        satisfactionScores.push(5); // Resolved issues get high score
      } else {
        const severityScores = { low: 4, medium: 3, high: 2, critical: 1 };
        satisfactionScores.push(severityScores[entry.severity] || 3);
      }
    });

    return {
      totalFeedback: feedback.length,
      unresolvedIssues: feedback.filter(f => !f.resolved).length,
      categoryBreakdown,
      severityBreakdown,
      sourceBreakdown,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      satisfactionScore: satisfactionScores.length > 0
        ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
        : 0
    };
  }

  /**
   * Generate improvement suggestions based on feedback patterns
   */
  generateSuggestions(): ImprovementSuggestion[] {
    const feedback = this.loadFeedback();
    const metrics = this.getMetrics();
    const suggestions: ImprovementSuggestion[] = [];

    // Analyze performance feedback
    const performanceIssues = feedback.filter(f => f.category === 'performance' && !f.resolved);
    if (performanceIssues.length >= 3) {
      suggestions.push({
        category: 'performance',
        priority: 'high',
        description: 'Multiple performance issues reported. Optimize wrapper execution and reduce latency.',
        implementationNotes: 'Review callMCPTool execution paths, implement caching, optimize chunking algorithms.',
        estimatedEffort: 'medium',
        relatedFeedback: performanceIssues.map(f => f.id)
      });
    }

    // Analyze usability feedback
    const usabilityIssues = feedback.filter(f => f.category === 'usability' && !f.resolved);
    if (usabilityIssues.length >= 2) {
      suggestions.push({
        category: 'usability',
        priority: 'medium',
        description: 'Users report usability issues. Simplify workflows and improve error messages.',
        implementationNotes: 'Review .cursorrules, add more examples, improve error handling in helpers.',
        estimatedEffort: 'small',
        relatedFeedback: usabilityIssues.map(f => f.id)
      });
    }

    // Analyze bug reports
    const criticalBugs = feedback.filter(f => f.category === 'bug' && f.severity === 'critical' && !f.resolved);
    if (criticalBugs.length > 0) {
      suggestions.push({
        category: 'stability',
        priority: 'critical',
        description: 'Critical bugs need immediate attention. Address stability issues.',
        implementationNotes: 'Prioritize fixes for critical bugs, add comprehensive error handling.',
        estimatedEffort: 'large',
        relatedFeedback: criticalBugs.map(f => f.id)
      });
    }

    // Analyze documentation feedback
    const docIssues = feedback.filter(f => f.category === 'documentation' && !f.resolved);
    if (docIssues.length >= 2) {
      suggestions.push({
        category: 'documentation',
        priority: 'medium',
        description: 'Documentation improvements needed. Update guides and add more examples.',
        implementationNotes: 'Expand README sections, add more skill examples, improve API documentation.',
        estimatedEffort: 'medium',
        relatedFeedback: docIssues.map(f => f.id)
      });
    }

    // Check for feature requests
    const featureRequests = feedback.filter(f => f.category === 'feature' && !f.resolved);
    if (featureRequests.length >= 5) {
      suggestions.push({
        category: 'features',
        priority: 'low',
        description: 'Multiple feature requests received. Plan next development cycle.',
        implementationNotes: 'Analyze feature patterns, prioritize based on user impact, plan implementation.',
        estimatedEffort: 'large',
        relatedFeedback: featureRequests.map(f => f.id)
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Mark feedback as resolved
   */
  resolveFeedback(feedbackId: string, resolutionNotes: string): boolean {
    const feedback = this.loadFeedback();
    const entry = feedback.find(f => f.id === feedbackId);

    if (!entry) {
      console.error(`Feedback entry not found: ${feedbackId}`);
      return false;
    }

    entry.resolved = true;
    entry.resolutionNotes = resolutionNotes;
    this.saveFeedback(feedback);

    console.log(`✅ Feedback resolved: ${feedbackId} - ${entry.title}`);
    return true;
  }

  /**
   * Get feedback by category
   */
  getFeedbackByCategory(category: string): FeedbackEntry[] {
    return this.loadFeedback().filter(f => f.category === category);
  }

  /**
   * Get unresolved issues
   */
  getUnresolvedIssues(): FeedbackEntry[] {
    return this.loadFeedback().filter(f => !f.resolved);
  }

  /**
   * Generate feedback report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const suggestions = this.generateSuggestions();
    const unresolvedIssues = this.getUnresolvedIssues();

    return `
📊 Code Mode Feedback Report
============================

📈 Overview
------------
Total Feedback: ${metrics.totalFeedback}
Unresolved Issues: ${metrics.unresolvedIssues}
Satisfaction Score: ${metrics.satisfactionScore.toFixed(1)}/5.0
Average Resolution Time: ${metrics.averageResolutionTime.toFixed(1)} days

📂 Category Breakdown
--------------------
${Object.entries(metrics.categoryBreakdown).map(([cat, count]) =>
  `${cat}: ${count} (${((count / metrics.totalFeedback) * 100).toFixed(1)}%)`
).join('\n')}

🚨 Severity Breakdown
---------------------
${Object.entries(metrics.severityBreakdown).map(([sev, count]) =>
  `${sev}: ${count} (${((count / metrics.totalFeedback) * 100).toFixed(1)}%)`
).join('\n')}

📱 Source Breakdown
------------------
${Object.entries(metrics.sourceBreakdown).map(([src, count]) =>
  `${src}: ${count} (${((count / metrics.totalFeedback) * 100).toFixed(1)}%)`
).join('\n')}

🎯 Improvement Suggestions
-------------------------
${suggestions.length === 0 ? 'No suggestions at this time.' :
  suggestions.map((s, i) => `
${i + 1}. ${s.category.toUpperCase()} (${s.priority} priority)
   Description: ${s.description}
   Implementation: ${s.implementationNotes}
   Estimated Effort: ${s.estimatedEffort}
   Related Feedback: ${s.relatedFeedback.length} items
  `).join('')
}

🔥 Unresolved Issues
--------------------
${unresolvedIssues.length === 0 ? 'No unresolved issues!' :
  unresolvedIssues.slice(0, 10).map(issue => `
• ${issue.title} (${issue.severity}) - ${issue.category}
  ${issue.description.slice(0, 100)}${issue.description.length > 100 ? '...' : ''}
  ID: ${issue.id}
  `).join('')
} ${unresolvedIssues.length > 10 ? `\n... and ${unresolvedIssues.length - 10} more issues.` : ''}

📋 Next Steps
-------------
1. Address critical and high-priority suggestions
2. Resolve outstanding issues, especially critical bugs
3. Monitor satisfaction score trends
4. Collect more feedback from diverse user groups

Generated: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Quick feedback submission for common issues
   */
  submitQuickFeedback(
    type: 'slow' | 'confusing' | 'error' | 'missing-feature',
    details: string,
    source: FeedbackEntry['source'] = 'cli'
  ): string {
    const templates = {
      slow: {
        title: 'Performance Issue - Slow Response',
        category: 'performance' as const,
        description: `The system is responding slowly. Details: ${details}`,
        severity: 'medium' as const
      },
      confusing: {
        title: 'Usability Issue - Confusing Interface',
        category: 'usability' as const,
        description: `The interface/workflow is confusing. Details: ${details}`,
        severity: 'low' as const
      },
      error: {
        title: 'Bug Report - Unexpected Error',
        category: 'bug' as const,
        description: `An unexpected error occurred. Details: ${details}`,
        severity: 'high' as const
      },
      'missing-feature': {
        title: 'Feature Request - Missing Functionality',
        category: 'feature' as const,
        description: `Missing functionality needed. Details: ${details}`,
        severity: 'low' as const
      }
    };

    const template = templates[type];
    return this.submitFeedback({
      ...template,
      source,
      tags: [type]
    });
  }
}

// Singleton instance
const feedbackSystem = new FeedbackSystem();

// Export convenience functions
export const submitFeedback = (feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'version' | 'resolved'>) =>
  feedbackSystem.submitFeedback(feedback);

export const getFeedbackMetrics = () => feedbackSystem.getMetrics();

export const generateFeedbackReport = () => feedbackSystem.generateReport();

export const submitQuickFeedback = (
  type: 'slow' | 'confusing' | 'error' | 'missing-feature',
  details: string,
  source?: FeedbackEntry['source']
) => feedbackSystem.submitQuickFeedback(type, details, source);

export const resolveFeedback = (id: string, notes: string) => feedbackSystem.resolveFeedback(id, notes);

// CLI command to submit feedback
export function handleFeedbackCLI(args: string[]): void {
  if (args.length === 0) {
    console.log('📝 Feedback System Usage:');
    console.log('  bun run agent:feedback quick <type> <message>  # Submit quick feedback');
    console.log('  bun run agent:feedback report               # Generate feedback report');
    console.log('  bun run agent:feedback metrics              # Show metrics');
    console.log('');
    console.log('Quick feedback types: slow, confusing, error, missing-feature');
    return;
  }

  const command = args[0];

  switch (command) {
    case 'quick':
      if (args.length < 3) {
        console.log('❌ Usage: bun run agent:feedback quick <type> <message>');
        return;
      }

      const type = args[1] as 'slow' | 'confusing' | 'error' | 'missing-feature';
      const message = args.slice(2).join(' ');

      if (!['slow', 'confusing', 'error', 'missing-feature'].includes(type)) {
        console.log('❌ Invalid type. Use: slow, confusing, error, missing-feature');
        return;
      }

      const feedbackId = submitQuickFeedback(type, message);
      console.log(`✅ Feedback submitted with ID: ${feedbackId}`);
      break;

    case 'report':
      console.log(generateFeedbackReport());
      break;

    case 'metrics':
      const metrics = getFeedbackMetrics();
      console.log('📊 Feedback Metrics:');
      console.log(`Total: ${metrics.totalFeedback}`);
      console.log(`Unresolved: ${metrics.unresolvedIssues}`);
      console.log(`Satisfaction: ${metrics.satisfactionScore.toFixed(1)}/5.0`);
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      break;
  }
}

export default feedbackSystem;