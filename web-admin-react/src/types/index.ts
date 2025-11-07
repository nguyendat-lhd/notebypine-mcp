export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

export type PageType =
  | 'dashboard'
  | 'incidents'
  | 'solutions'
  | 'knowledge'
  | 'chat'
  | 'settings';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'open' | 'investigating' | 'resolved' | 'closed';
  tags: string[];
  assigned_to?: string;
  created: string;
  updated: string;
  created_at?: string;
  updated_at?: string;
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  category: string;
  tags: string[];
  verified: boolean;
  incidentId?: string;
  incident_id?: string;
  created: string;
  updated: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: string;
  updated: string;
}

export interface DashboardStats {
  incidents: number;
  solutions: number;
  knowledgeBase: number;
  recent: Incident[];
  highSeverity: Incident[];
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: string;
  memory: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  };
  database: {
    connected: boolean;
    status: string;
  };
  version: string;
  environment: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}