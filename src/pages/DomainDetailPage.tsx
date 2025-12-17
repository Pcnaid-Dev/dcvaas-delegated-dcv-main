import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowsClockwise, CheckCircle, Warning } from '@phosphor-icons/react';
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

/**
 * Formats verification errors for display in the UI.
 * Handles arrays, strings, and objects with proper formatting.
 */
function formatVerificationErrors(errors: any, fallbackMessage?: string): React.ReactNode {
  if (!errors) {
    return fallbackMessage || 'Unknown error occurred during validation';
  }

  // Handle array of errors
  if (Array.isArray(errors)) {
    return errors.map((err: any, idx: number) => (
      <div key={idx} className="mb-1">
        • {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
      </div>
    ));
  }

  // Handle string errors
  if (typeof errors === 'string') {
    return errors;
  }

  // Handle object errors - format as JSON
  return JSON.stringify(errors, null, 2);
}

export function DomainDetailPage({ domainId, onNavigate }: DomainDetailPageProps) {
  const { user, currentOrg } = useAuth();
  const queryClient = useQueryClient();

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
                <DNSRecordDisplay
                  domain={domain.domainName}
                  cnameTarget={domain.cnameTarget}
                />
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Verify DNS Configuration
                  </h3>
                  <Button
                    onClick={handleCheckDNS}
                    disabled={syncMutation.isPending}
                    className="w-full"
                    size="lg"
                  >
                    {syncMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Checking DNS...
                      </>
                    ) : (
                      'Check DNS Now'
                    )}
                  </Button>
                </Card>
              </>
            )}

            {(domain.status === 'issuing' || domain.status === 'pending_validation') && (
              <Card className="p-6 border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="relative flex h-10 w-10">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-10 w-10 bg-primary items-center justify-center">
                        <ArrowsClockwise size={20} weight="bold" className="text-primary-foreground" />
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Verification in Progress</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Cloudflare is validating your DNS configuration and issuing your certificate. 
                      This process is automatic and typically completes within a few minutes.
                    </p>
                    <Button 
                      onClick={handleRefreshStatus} 
                      variant="outline" 
                      size="sm" 
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <ArrowsClockwise size={16} weight="bold" className="mr-2" />
                          Refresh Status
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {domain.status === 'active' && (
              <Card className="p-6 border-success/20 bg-success/5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="flex h-10 w-10 rounded-full bg-success items-center justify-center">
                      <CheckCircle size={24} weight="fill" className="text-success-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Certificate Active</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Issued</p>
                        <p className="font-medium text-foreground">
                          {domain.updatedAt && format(new Date(domain.updatedAt), 'PPP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-medium text-foreground">
                          Active (Auto-Renewing)
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleRefreshStatus} 
                      variant="outline" 
                      className="w-full" 
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <ArrowsClockwise size={20} weight="bold" className="mr-2" />
                          Refresh Status
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {domain.status === 'error' && (
              <Card className="p-6 border-destructive/50 bg-destructive/5">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="flex h-10 w-10 rounded-full bg-destructive items-center justify-center">
                      <Warning size={24} weight="fill" className="text-destructive-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-destructive mb-2">
                      Validation Error
                    </h3>
                    <div className="mb-4 p-3 bg-card rounded-lg border border-destructive/20">
                      <div className="text-sm text-foreground">
                        {formatVerificationErrors(
                          domain.cfVerificationErrors,
                          domain.errorMessage
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please verify your DNS configuration and try again. If the issue persists, check our documentation or contact support.
                    </p>
                    <Button 
                      onClick={handleCheckDNS} 
                      variant="outline" 
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Retrying...
                        </>
                      ) : (
                        'Retry DNS Check'
                      )}
                    </Button>
                  </div>
                </div>
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
