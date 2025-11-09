import type { PageType } from '@/types';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  INCIDENTS: '/incidents',
  SOLUTIONS: '/solutions',
  KNOWLEDGE: '/knowledge',
  CHAT: '/chat',
  SETTINGS: '/settings',
} as const;

export const pageToPath: Record<PageType, string> = {
  dashboard: ROUTES.DASHBOARD,
  incidents: ROUTES.INCIDENTS,
  solutions: ROUTES.SOLUTIONS,
  knowledge: ROUTES.KNOWLEDGE,
  chat: ROUTES.CHAT,
  settings: ROUTES.SETTINGS,
};

export const pathToPage = (path: string): PageType | null => {
  // Handle root path
  if (path === '/' || path === '') {
    return 'dashboard';
  }
  
  const entry = Object.entries(pageToPath).find(([_, routePath]) => 
    routePath === path
  );
  
  return entry ? (entry[0] as PageType) : null;
};

