import { useState, type FC, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { PageType, User } from '@/types';

interface LayoutProps {
  user: User | null;
  children: ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onLogout: () => void;
}

export const Layout: FC<LayoutProps> = ({
  user,
  children,
  currentPage,
  onNavigate,
  onLogout,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};