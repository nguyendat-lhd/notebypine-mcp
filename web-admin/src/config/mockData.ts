// Mock data for development when PocketBase is not available

export const mockIncidents = [
  {
    id: '1',
    title: 'Database Connection Failed',
    description: 'Primary database server is not responding to connection attempts.',
    severity: 'critical',
    status: 'investigating',
    tags: ['database', 'urgent'],
    created: '2025-11-07T07:30:00Z',
    updated: '2025-11-07T07:45:00Z'
  },
  {
    id: '2',
    title: 'API Response Time Degradation',
    description: 'API endpoints are responding slower than usual, average response time increased by 300%.',
    severity: 'high',
    status: 'new',
    tags: ['api', 'performance'],
    created: '2025-11-07T08:00:00Z',
    updated: '2025-11-07T08:00:00Z'
  },
  {
    id: '3',
    title: 'User Login Issues',
    description: 'Several users reporting inability to login to the application.',
    severity: 'medium',
    status: 'resolved',
    tags: ['authentication', 'user-impact'],
    created: '2025-11-06T15:30:00Z',
    updated: '2025-11-06T17:00:00Z'
  }
];

export const mockSolutions = [
  {
    id: '1',
    title: 'Restart Database Service',
    description: 'Steps to restart the database service when it becomes unresponsive.',
    steps: [
      'SSH to the database server',
      'Check service status: systemctl status postgresql',
      'Stop the service: sudo systemctl stop postgresql',
      'Wait 10 seconds',
      'Start the service: sudo systemctl start postgresql',
      'Verify connectivity with pg_isready'
    ],
    category: 'troubleshooting',
    tags: ['database', 'restart'],
    verified: true,
    created: '2025-11-05T10:00:00Z',
    updated: '2025-11-05T10:00:00Z'
  },
  {
    id: '2',
    title: 'Clear API Cache',
    description: 'How to clear API cache when experiencing performance issues.',
    steps: [
      'Navigate to admin panel',
      'Go to System Settings',
      'Click on Cache Management',
      'Select "Clear All Cache"',
      'Confirm action',
      'Monitor API performance'
    ],
    category: 'performance',
    tags: ['api', 'cache'],
    verified: true,
    created: '2025-11-04T14:30:00Z',
    updated: '2025-11-04T14:30:00Z'
  }
];

export const mockKnowledge = [
  {
    id: '1',
    title: 'Database Backup Procedures',
    content: 'This document outlines the standard procedures for creating and restoring database backups. The backup process runs daily at 2 AM UTC and creates full backups of the primary database. Backups are retained for 30 days.',
    category: 'documentation',
    tags: ['database', 'backup', 'procedures'],
    type: 'documentation',
    verified: true,
    created: '2025-11-01T09:00:00Z',
    updated: '2025-11-01T09:00:00Z'
  },
  {
    id: '2',
    title: 'API Rate Limiting Configuration',
    content: 'API rate limiting is configured to prevent abuse and ensure fair usage. The current limits are: 100 requests per minute per IP for authenticated users, 20 requests per minute for anonymous users. Rate limit headers are included in all API responses.',
    category: 'configuration',
    tags: ['api', 'rate-limiting', 'security'],
    type: 'reference',
    verified: true,
    created: '2025-11-02T11:30:00Z',
    updated: '2025-11-02T11:30:00Z'
  }
];

export const mockStats = {
  incidents: 15,
  solutions: 8,
  knowledgeBase: 25,
  recent: mockIncidents.slice(0, 3),
  highSeverity: mockIncidents.filter(i => i.severity === 'high' || i.severity === 'critical')
};