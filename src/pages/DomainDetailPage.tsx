import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowsClockwise, CheckCircle, XCircle, Spinner } from '@phosphor-icons/react';
import { getDomain, getJobs, setJob, addAuditLog, syncDomain } from '@/lib/data';
import { checkCNAME } from '@/lib/dns';
import { generateId } from '@/lib/crypto';
import type { Domain, Job } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

type DomainDetailPageProps = {
  domainId: string | null;
  onNavigate: (page: string) => void;
};

export function DomainDetailPage({ domainId, onNavigate }: DomainDetailPageProps) {
  const { user, currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [verificationResult, setVerificationResult] = React.useState<'success' | 'error' | null>(null);

  // Fetch domain with React Query
  const { data: domain, isLoading: isDomainLoading } = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => domainId ? getDomain(domainId) : Promise.resolve(null),
    enabled: !!domainId,
    staleTime: 5000,
  });

  // Fetch jobs for this domain
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', domainId],
    queryFn: () => domainId ? getJobs(domainId) : Promise.resolve([]),
    enabled: !!domainId,
    staleTime: 5000,
  });

  // Mutation for syncing domain
  const syncMutation = useMutation({
    mutationFn: (domainId: string) => syncDomain(domainId),
    onSuccess: (updatedDomain) => {
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      
      // Set verification result based on updated status
      if (updatedDomain && updatedDomain.status === 'active') {
        setVerificationResult('success');
        toast.success('Status refreshed from Cloudflare');
      } else if (updatedDomain && updatedDomain.status === 'error') {
        setVerificationResult('error');
        toast.error('Verification failed');
      } else {
        toast.success('Status refreshed from Cloudflare');
      }
      
      // Clear result after 5 seconds
      setTimeout(() => setVerificationResult(null), 5000);
    },
    onError: () => {
      setVerificationResult('error');
      toast.error('Failed to refresh status');
      setTimeout(() => setVerificationResult(null), 5000);
    },
  });

  const handleCheckDNS = async () => {
    if (!domain || !user || !currentOrg) return;
    setVerificationResult(null);
    syncMutation.mutate(domain.id);
  };

  const handleRefreshStatus = async () => {
    if (!domain) return;
    setVerificationResult(null);
    syncMutation.mutate(domain.id);
  };

  // Show loading state while fetching domain
  if (isDomainLoading) {
    return (
      <AppShell onNavigate={onNavigate}>
        <div className="text-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading domain...</p>
        </div>
      </AppShell>
    );
  }

  // Show error state if domain not found
  if (!domain) {
    return (
      <AppShell onNavigate={onNavigate}>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Domain not found</p>
          <Button onClick={() => onNavigate('dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell onNavigate={onNavigate}>
      <div className="space-y-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Domains
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {domain.domainName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Added {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
              </p>
            </div>
            <StatusBadge status={domain.status} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {domain.status === 'pending_cname' && (
              <Card className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Step 1: Configure DNS
                </h3>
                <DNSRecordDisplay
                  domain={domain.domainName}
                  cnameTarget={domain.cnameTarget}
                />
                <Button
                  onClick={handleCheckDNS}
                  disabled={syncMutation.isPending}
                  className="w-full gap-2"
                  size="lg"
                >
                  {syncMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      Checking DNS...
                    </>
                  ) : (
                    'Check DNS Now'
                  )}
                </Button>
                
                {/* Verification Result Alerts */}
                {verificationResult === 'success' && (
                  <Alert variant="default" className="border-success bg-success/10">
                    <CheckCircle size={16} weight="fill" className="text-success" />
                    <AlertTitle className="text-success">DNS Verified!</AlertTitle>
                    <AlertDescription className="text-success/90">
                      Your DNS configuration is correct. Certificate issuance in progress.
                    </AlertDescription>
                  </Alert>
                )}
                
                {verificationResult === 'error' && (
                  <Alert variant="destructive">
                    <XCircle size={16} weight="fill" />
                    <AlertTitle>Verification Failed</AlertTitle>
                    <AlertDescription>
                      DNS records not found or incorrect. Please verify your CNAME record and try again.
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            )}

            {(domain.status === 'issuing' || domain.status === 'pending_validation') && (
              <Card className="p-6 border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Verification in Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      Cloudflare is validating your DNS configuration. This process is automatic.
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                    <Button onClick={handleRefreshStatus} variant="outline" size="sm" disabled={syncMutation.isPending}>
                        {syncMutation.isPending ? 'Refreshing...' : 'Refresh Status'}
                    </Button>
                </div>
              </Card>
            )}

            {domain.status === 'active' && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle size={24} weight="fill" />
                  <h3 className="text-lg font-semibold">Certificate Active</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Issued</p>
                    <p className="font-medium text-foreground">
                      {domain.updatedAt && format(new Date(domain.updatedAt), 'PPP')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium text-foreground">
                      Active (Auto-Renewing)
                    </p>
                  </div>
                </div>
                <Button onClick={handleRefreshStatus} variant="outline" className="w-full" disabled={syncMutation.isPending}>
                  <ArrowsClockwise size={20} weight="bold" className="mr-2" />
                  Refresh Status
                </Button>
              </Card>
            )}

            {domain.status === 'error' && (
              <Card className="p-6 border-destructive">
                <h3 className="text-lg font-semibold text-destructive mb-2">
                  Error
                </h3>
                <p className="text-sm text-muted-foreground">
                  {domain.cfVerificationErrors ? JSON.stringify(domain.cfVerificationErrors) : (domain.errorMessage || 'Unknown error')}
                </p>
                <Button onClick={handleCheckDNS} variant="outline" className="mt-4">
                  Retry DNS Check
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            {jobs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No jobs yet</p>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground capitalize">
                          {job.type.replace('_', ' ')}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(job.createdAt), 'PPpp')}
                      </p>
                      {job.lastError && (
                        <p className="text-sm text-destructive mt-2">
                          {job.lastError}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Attempts: {job.attempts}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
