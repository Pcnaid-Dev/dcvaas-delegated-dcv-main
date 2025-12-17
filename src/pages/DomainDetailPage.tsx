import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';
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
  const [previousStatus, setPreviousStatus] = React.useState<string | null>(null);

  // Fetch domain with React Query
  const { data: domain, isLoading: isDomainLoading } = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => domainId ? getDomain(domainId) : Promise.resolve(null),
    enabled: !!domainId,
    staleTime: 5000,
    // Auto-poll every 12 seconds when domain is in pending or issuing state
    refetchInterval: (query) => {
      const domain = query.state.data;
      if (!domain) return false;
      
      const shouldPoll = domain.status === 'pending_cname' || 
                         domain.status === 'issuing' || 
                         domain.status === 'pending_validation';
      
      return shouldPoll ? 12000 : false; // 12 seconds
    },
  });

  // Fetch jobs for this domain
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', domainId],
    queryFn: () => domainId ? getJobs(domainId) : Promise.resolve([]),
    enabled: !!domainId,
    staleTime: 5000,
  });

  // Show toast notification when status changes to active
  React.useEffect(() => {
    if (domain && previousStatus && previousStatus !== domain.status) {
      if (domain.status === 'active') {
        toast.success('🎉 Certificate is now active!', {
          description: `${domain.domainName} is ready to use`,
        });
      } else if (domain.status === 'error' && previousStatus !== 'error') {
        toast.error('Domain verification failed', {
          description: 'Please check your DNS configuration',
        });
      }
    }
    
    if (domain) {
      setPreviousStatus(domain.status);
    }
  }, [domain?.status, previousStatus, domain?.domainName]);

  // Mutation for syncing domain
  const syncMutation = useMutation({
    mutationFn: (domainId: string) => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Status refreshed from Cloudflare');
    },
    onError: () => {
      toast.error('Failed to refresh status');
    },
  });

  const handleCheckDNS = async () => {
    if (!domain || !user || !currentOrg) return;
    syncMutation.mutate(domain.id);
  };

  const handleRefreshStatus = async () => {
    if (!domain) return;
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
              <>
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
                    className="w-full"
                  >
                    {syncMutation.isPending ? 'Checking DNS...' : 'Check DNS Now'}
                  </Button>
                </Card>
                
                {/* DNS Troubleshooting Tips */}
                <Card className="p-6 space-y-3 bg-blue-50/50 border-blue-200">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="text-blue-600">💡</span> DNS Propagation Tips
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      • DNS propagation can take <strong>5-15 minutes</strong> after adding the CNAME record
                    </p>
                    <p>
                      • If using Cloudflare, ensure the CNAME is <strong>DNS Only (gray cloud)</strong>, not proxied
                    </p>
                    <p>
                      • The system automatically checks your DNS every 12 seconds
                    </p>
                    <p>
                      • If the record doesn't verify after 30 minutes, double-check the CNAME target matches exactly
                    </p>
                  </div>
                </Card>
              </>
            )}

            {(domain.status === 'issuing' || domain.status === 'pending_validation') && (
              <Card className="p-6 border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Verification in Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      Cloudflare is validating your DNS configuration. This process is automatic and typically completes within 5-15 minutes.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status updates automatically every 12 seconds
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
