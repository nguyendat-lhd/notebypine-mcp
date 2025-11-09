import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import type { FC } from 'react';
import type { PageType, User } from '@/types';
import { pageToPath } from '@/utils/routes';

interface SidebarProps {
  user: User | null;
  currentPage: PageType;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navigationItems: Array<{
  id: PageType;
  label: string;
  icon: LucideIcon;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
  },
  {
    id: 'solutions',
    label: 'Solutions',
    icon: CheckCircle,
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    icon: BookOpen,
  },
  {
    id: 'chat',
    label: 'ChatOps',
    icon: MessageSquare,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const Sidebar: FC<SidebarProps> = ({
  user,
  currentPage,
  onLogout,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <div className={`relative bg-white dark:bg-slate-900 border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">NoteByPine</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const path = pageToPath[item.id];

          return (
            <NavLink
              key={item.id}
              to={path}
              className={({ isActive: isNavActive }) =>
                `flex items-center w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isNavActive || isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                } ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`
              }
            >
              <Icon className="h-4 w-4" />
              {!isCollapsed && <span className="ml-3">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        {user && !isCollapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-primary capitalize">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={`w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
};