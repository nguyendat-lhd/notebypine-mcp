import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import IncidentsPage from '@/components/incidents/IncidentsPage';
import type { PageType, User } from '@/types';
import apiService from '@/services/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated on app load
    if (apiService.isAuthenticated()) {
      const currentUser = apiService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    const currentUser = apiService.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'incidents':
        return <IncidentsPage />;
      case 'solutions':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Solutions</h1>
            <p className="text-muted-foreground">View and manage solutions</p>
            <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">Solutions management coming soon...</p>
            </div>
          </div>
        );
      case 'knowledge':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">Manage knowledge base articles</p>
            <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">Knowledge base management coming soon...</p>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">ChatOps</h1>
            <p className="text-muted-foreground">Chat with the system using natural language</p>
            <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">ChatOps interface coming soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage system settings</p>
            <div className="p-8 text-center border-2 border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">Settings management coming soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard user={user} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      user={user}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {renderCurrentPage()}
    </Layout>
  );
}

export default App;