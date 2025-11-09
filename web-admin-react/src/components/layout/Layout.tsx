import { useState, type FC, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { pathToPage } from '@/utils/routes';
import { ROUTES } from '@/utils/routes';
import { repositoryService } from '@/services/repository.service';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = pathToPage(location.pathname) || 'dashboard';
  const user = repositoryService.auth.getCurrentUser();

  const handleLogout = () => {
    repositoryService.auth.logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        user={user}
        currentPage={currentPage}
        onLogout={handleLogout}
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