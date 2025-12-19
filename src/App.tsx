import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
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
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { ToolsPage } from './pages/ToolsPage';
import { TLSConfigScanPage } from './pages/tools/TLSConfigScanPage';
import { OCSPStaplingCheckPage } from './pages/tools/OCSPStaplingCheckPage';
import { HSTSCheckPage } from './pages/tools/HSTSCheckPage';
import { CTCheckPage } from './pages/tools/CTCheckPage';
import { SANPlannerPage } from './pages/tools/SANPlannerPage';
import { BrowserSecurityPage } from './pages/tools/BrowserSecurityPage';

// Create a QueryClient instance with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  // Check if this is an OAuth callback
  const isOAuthCallback = window.location.pathname === '/oauth/callback';

  if (isLoading && !isOAuthCallback) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle OAuth callback without checking authentication
  if (isOAuthCallback) {
    return <OAuthCallbackPage />;
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

  // Tool pages are public
  if (!isAuthenticated && currentPage === 'tools') {
    return <ToolsPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'tls-scan') {
    return <TLSConfigScanPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'ocsp-check') {
    return <OCSPStaplingCheckPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'hsts-check') {
    return <HSTSCheckPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'ct-check') {
    return <CTCheckPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'san-planner') {
    return <SANPlannerPage onNavigate={setCurrentPage} />;
  }
  if (!isAuthenticated && currentPage === 'browser-security') {
    return <BrowserSecurityPage onNavigate={setCurrentPage} />;
  }

  if (!isAuthenticated) {
    return <LandingPage onNavigate={setCurrentPage} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            onNavigate={setCurrentPage}
            onSelectDomain={setSelectedDomainId}
          />
        );
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
      case 'tools':
        return <ToolsPage onNavigate={setCurrentPage} />;
      case 'tls-scan':
        return <TLSConfigScanPage onNavigate={setCurrentPage} />;
      case 'ocsp-check':
        return <OCSPStaplingCheckPage onNavigate={setCurrentPage} />;
      case 'hsts-check':
        return <HSTSCheckPage onNavigate={setCurrentPage} />;
      case 'ct-check':
        return <CTCheckPage onNavigate={setCurrentPage} />;
      case 'san-planner':
        return <SANPlannerPage onNavigate={setCurrentPage} />;
      case 'browser-security':
        return <BrowserSecurityPage onNavigate={setCurrentPage} />;
      default:
        return (
          <OverviewPage
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
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);
}

export default App;
