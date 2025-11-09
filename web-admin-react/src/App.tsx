import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/components/dashboard/Dashboard';
import IncidentsPage from '@/components/incidents/IncidentsPage';
import SolutionsPage from '@/components/solutions/SolutionsPage';
import KnowledgePage from '@/components/knowledge/KnowledgePage';
import { ChatPage } from '@/components/chatops/ChatPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { ROUTES } from '@/utils/routes';
import { repositoryService } from '@/services/repository.service';

// Component to redirect authenticated users away from login page
const LoginRoute = () => {
  if (repositoryService.auth.isAuthenticated()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <LoginForm />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login route - redirects to dashboard if already authenticated */}
        <Route path={ROUTES.LOGIN} element={<LoginRoute />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path={ROUTES.INCIDENTS}
            element={
              <Layout>
                <IncidentsPage />
              </Layout>
            }
          />
          <Route
            path={ROUTES.SOLUTIONS}
            element={
              <Layout>
                <SolutionsPage />
              </Layout>
            }
          />
          <Route
            path={ROUTES.KNOWLEDGE}
            element={
              <Layout>
                <KnowledgePage />
              </Layout>
            }
          />
          <Route
            path={ROUTES.CHAT}
            element={
              <Layout>
                <ChatPage />
              </Layout>
            }
          />
          <Route
            path={ROUTES.SETTINGS}
            element={
              <Layout>
                <SettingsPage />
              </Layout>
            }
          />
        </Route>
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;