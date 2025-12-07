import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PricingPage } from './pages/PricingPage';
import { DocsPage } from './pages/DocsPage';
import { DomainDetailPage } from './pages/DomainDetailPage';
import { TeamPage } from './pages/TeamPage';
import { BillingPage } from './pages/BillingPage';
import { APITokensPage } from './pages/APITokensPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { JobsPage } from './pages/JobsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && currentPage === 'home') {
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  if (!isAuthenticated && currentPage === 'pricing') {
    return <PricingPage onNavigate={setCurrentPage} />;
  }

  if (!isAuthenticated && currentPage === 'docs') {
    return <DocsPage onNavigate={setCurrentPage} />;
  }

  if (!isAuthenticated) {
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            onSelectDomain={setSelectedDomainId}
          />
        );
      case 'domain-detail':
        return (
          <DomainDetailPage
            domainId={selectedDomainId}
            onNavigate={setCurrentPage}
          />
        );
      case 'team':
        return <TeamPage onNavigate={setCurrentPage} />;
      case 'billing':
        return <BillingPage onNavigate={setCurrentPage} />;
      case 'api-tokens':
        return <APITokensPage onNavigate={setCurrentPage} />;
      case 'webhooks':
        return <WebhooksPage onNavigate={setCurrentPage} />;
      case 'settings':
        return <SettingsPage onNavigate={setCurrentPage} />;
      case 'jobs':
        return <JobsPage onNavigate={setCurrentPage} />;
      case 'audit':
        return <AuditLogsPage onNavigate={setCurrentPage} />;
      case 'admin':
        return <AdminPage onNavigate={setCurrentPage} />;
      case 'pricing':
        return <PricingPage onNavigate={setCurrentPage} />;
      case 'docs':
        return <DocsPage onNavigate={setCurrentPage} />;
      default:
        return (
          <DashboardPage
            onNavigate={setCurrentPage}
            onSelectDomain={setSelectedDomainId}
          />
        );
    }
  };

  return renderPage();
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
