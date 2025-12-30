import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ArrowsClockwise, CheckCircle, Clock, Warning } from '@phosphor-icons/react';
import { getDomain, getJobs, setJob, addAuditLog, syncDomain } from '@/lib/data';
import { checkCNAME } from '@/lib/dns';
import { generateId } from '@/lib/crypto';
import { PageHeader, Callout, Stepper, DataTable, type Column } from '@/components/common';
import type { Domain, Job, DomainStatus } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { PageHeader, Callout, Stepper, DataTable, type Column } from '@/components/common';

type DomainDetailPageProps = {
  domainId: string | null;
  onNavigate: (page: string) => void;
};

// Auto-poll interval configuration
const AUTO_POLL_INTERVAL_MS = 12000; // 12 seconds
const AUTO_POLL_INTERVAL_SECONDS = AUTO_POLL_INTERVAL_MS / 1000;

// Statuses that trigger auto-polling
const POLLING_STATUSES: DomainStatus[] = ['pending_cname', 'issuing', 'pending_validation'];

export function DomainDetailPage({ domainId, onNavigate }: DomainDetailPageProps) {
  const { user, currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const previousStatusRef = React.useRef<DomainStatus | null>(null);

  // Fetch domain with React Query
  const query = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => domainId ? getDomain(domainId) : Promise.resolve(null),
    enabled: !!domainId,
    staleTime: 5000,
    // Auto-poll when domain is in pending or issuing state
    refetchInterval: (query) => {
      return query.state.data?.status && POLLING_STATUSES.includes(query.state.data.status)
        ? AUTO_POLL_INTERVAL_MS
        : false;
    },
    refetchIntervalInBackground: false, // Stop polling when page is not visible
  });

  const domain = query.data;
  const isDomainLoading = query.isLoading;

  // Fetch jobs for this domain
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', domainId],
    queryFn: () => domainId ? getJobs(domainId) : Promise.resolve([]),
    enabled: !!domainId,
    staleTime: 5000,
  });

  // Calculate stepper state (MOVED BEFORE CONDITIONAL RETURNS TO FIX HOOK ORDER)
  const stepperSteps = useMemo(() => {
    if (!domain) return [];
    
    const steps = [
      {
        label: 'Domain Added',
        description: 'Initial setup',
        status: 'complete' as const,
      },
      {
        label: 'DNS Configured',
        description: 'CNAME record verified',
        status: 
          domain.status === 'pending_cname'
            ? 'current' as const
            : domain.status === 'error'
            ? 'current' as const  // Error state halts at DNS step
            : 'complete' as const,
      },
      {
        label: 'Validation',
        description: 'Certificate issuance',
        status:
          domain.status === 'active'
            ? 'complete' as const
            : domain.status === 'issuing' || domain.status === 'pending_validation'
            ? 'current' as const
            : 'upcoming' as const,
      },
      {
        label: 'Active',
        description: 'Certificate issued',
        status: domain.status === 'active' ? 'complete' as const : 'upcoming' as const,
      },
    ];

    return steps;
  }, [domain?.status]);

  // Show toast notification when status changes
  React.useEffect(() => {
    if (!domain) return;
    
    const currentStatus = domain.status;
    const previousStatus = previousStatusRef.current;
    
    // Only show toasts if we have a previous status and it changed
    if (previousStatus && previousStatus !== currentStatus) {
      if (currentStatus === 'active') {
        toast.success('🎉 Certificate is now active!', {
          description: `${domain.domainName} is ready to use`,
        });
      } else if (currentStatus === 'error') {
        toast.error('Domain verification failed', {
          description: 'Please check your DNS configuration',
        });
      }
    }
    
    // Update the ref with current status
    previousStatusRef.current = currentStatus;
  }, [domain?.status, domain?.domainName]);

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

  // Jobs table columns (moved after conditional returns since it uses domain data)
  const jobColumns: Column<Job>[] = [
    {
      key: 'type',
      label: 'Type',
      render: (job) => (
        <span className="font-medium text-foreground capitalize">
          {job.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (job) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'attempts',
      label: 'Attempts',
      render: (job) => (
        <span className="text-sm text-muted-foreground">{job.attempts}</span>
      ),
    },
    {
      key: 'lastError',
      label: 'Error',
      render: (job) =>
        job.lastError ? (
          <span className="text-sm text-destructive">{job.lastError}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <AppShell onNavigate={onNavigate}>
      <PageHeader
        title={domain.domainName}
        description={`Added ${formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}`}
        breadcrumbs={[
          { label: 'Domains', onClick: () => onNavigate('dashboard') },
          { label: domain.domainName },
        ]}
        actions={
          <>
            <StatusBadge status={domain.status} />
            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              disabled={syncMutation.isPending}
            >
              <ArrowsClockwise size={18} weight="bold" />
              <span className="ml-2">
                {syncMutation.isPending ? 'Refreshing...' : 'Refresh'}
              </span>
            </Button>
          </>
        }
      />

      {/* Progress Stepper */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Onboarding Progress
        </h3>
        <Stepper steps={stepperSteps} orientation="horizontal" />
      </Card>

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
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                    <li>
                      DNS propagation can take <strong>5-15 minutes</strong> after adding the CNAME record
                    </li>
                    <li>
                      If using Cloudflare, ensure the CNAME is <strong>DNS Only (gray cloud)</strong>, not proxied
                    </li>
                    <li>
                      The system automatically checks your DNS every {AUTO_POLL_INTERVAL_SECONDS} seconds
                    </li>
                    <li>
                      If the record doesn't verify after 30 minutes, double-check the CNAME target matches exactly
                    </li>
                  </ul>
                </Card>
              </>
            )}

          {(domain.status === 'issuing' || domain.status === 'pending_validation') && (
            <Callout variant="info" title="Verification in Progress">
              Cloudflare is validating your DNS configuration and issuing the
              certificate. This process is automatic and usually completes within a few
              minutes. You can refresh the status to check for updates.
            </Callout>
          )}

          {domain.status === 'active' && (
            <>
              <Callout variant="info" title="Certificate Active">
                Your SSL/TLS certificate is active and will be automatically renewed
                before expiration.
              </Callout>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Certificate Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Verification in Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      Cloudflare is validating your DNS configuration. This process is automatic and typically completes within 5-15 minutes.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status updates automatically every {AUTO_POLL_INTERVAL_SECONDS} seconds
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <CheckCircle size={16} weight="fill" className="text-success" />
                      Active (Auto-Renewing)
                    </p>
                  </div>
                  {domain.expiresAt && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Expires</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(domain.expiresAt), 'PPP')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                    <p className="font-medium text-foreground">
                      {formatDistanceToNow(new Date(domain.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {domain.status === 'error' && (
            <>
              <Callout variant="error" title="Validation Error">
                {domain.cfVerificationErrors && domain.cfVerificationErrors.length > 0
                  ? domain.cfVerificationErrors.map(e => e.message || String(e)).join(', ')
                  : domain.errorMessage || 'Unknown error occurred during validation'}
              </Callout>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Next Steps
                </h3>
                <p className="text-muted-foreground mb-4">
                  Please check your DNS configuration and try again. If the issue
                  persists, contact support.
                </p>
                <Button onClick={handleCheckDNS} disabled={syncMutation.isPending}>
                  Retry DNS Check
                </Button>
              </Card>
            </>
          )}

          {/* Timeline / Activity Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle size={16} weight="fill" className="text-primary" />
                  </div>
                  <div className="w-0.5 h-full bg-border mt-2" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-medium text-foreground">Domain Added</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(domain.createdAt), 'PPP')}
                  </p>
                </div>
              </div>

              {domain.status !== 'pending_cname' && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle size={16} weight="fill" className="text-primary" />
                    </div>
                    {domain.status !== 'issuing' &&
                      domain.status !== 'pending_validation' && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-foreground">DNS Verified</p>
                    <p className="text-sm text-muted-foreground">
                      CNAME record confirmed
                    </p>
                  </div>
                </div>
              )}

              {domain.status === 'active' && domain.expiresAt && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle size={16} weight="fill" className="text-success" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Certificate Issued</p>
                    <p className="text-sm text-muted-foreground">
                      Valid until {format(new Date(domain.expiresAt), 'PPP')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <DataTable
            columns={jobColumns}
            data={jobs}
            emptyState={
              <div className="text-center py-12">
                <Clock size={32} className="mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No jobs recorded yet</p>
              </div>
            }
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
