import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { Stepper, Step } from '@/components/ui/stepper';
import { EmptyState } from '@/components/ui/empty-state';
import { Callout } from '@/components/ui/callout';
import { ArrowLeft, ArrowsClockwise, CheckCircle, Certificate, Clock, Queue } from '@phosphor-icons/react';
import { getDomain, getJobs, syncDomain } from '@/lib/data';
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

  // Calculate steps for the stepper
  const steps: Step[] = useMemo(() => {
    if (!domain) return [];

    return [
      {
        title: 'Configure DNS',
        description: 'Add CNAME record to your DNS',
        status: domain.status === 'pending_cname' ? 'current' : 'completed',
      },
      {
        title: 'Verify DNS',
        description: 'Waiting for DNS propagation',
        status:
          domain.status === 'pending_cname'
            ? 'pending'
            : domain.status === 'issuing' || domain.status === 'pending_validation'
            ? 'current'
            : 'completed',
      },
      {
        title: 'Issue Certificate',
        description: 'Cloudflare is issuing your certificate',
        status:
          domain.status === 'active'
            ? 'completed'
            : domain.status === 'issuing' || domain.status === 'pending_validation'
            ? 'current'
            : 'pending',
      },
      {
        title: 'Active & Auto-Renewing',
        description: 'Certificate is active and will renew automatically',
        status: domain.status === 'active' ? 'completed' : 'pending',
      },
    ];
  }, [domain]);

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
      <div className="space-y-6">
        <PageHeader
          title={domain.domainName}
          description={`Added ${formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}`}
          breadcrumb={
            <Button
              variant="ghost"
              onClick={() => onNavigate('domains')}
              className="p-0 h-auto"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to Domains
            </Button>
          }
          actions={
            <div className="flex items-center gap-3">
              <StatusBadge status={domain.status} />
              <Button
                variant="outline"
                onClick={handleRefreshStatus}
                disabled={syncMutation.isPending}
              >
                <ArrowsClockwise size={20} className="mr-2" />
                Refresh
              </Button>
            </div>
          }
        />

        {/* Progress Stepper */}
        {domain.status !== 'error' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Issuance Progress
            </h3>
            <Stepper steps={steps} />
          </Card>
        )}

        {/* Error Callout */}
        {domain.status === 'error' && (
          <Callout variant="error" title="Certificate Issuance Failed">
            <p className="mb-2">
                ? domain.cfVerificationErrors.map(e => typeof e === 'string' ? e : e.message).join(', ')

            </p>
            <Button onClick={handleCheckDNS} variant="outline" size="sm">
              Retry DNS Check
            </Button>
          </Callout>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="certificate">Certificate</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {domain.status === 'pending_cname' && (
              <Callout variant="info" title="Action Required: Configure DNS">
                <p className="mb-4">
                  Add the following CNAME record to your DNS to delegate certificate validation:
                </p>
                <DNSRecordDisplay
                  domain={domain.domainName}
                  cnameTarget={domain.cnameTarget}
                />
                <p className="text-sm mt-4 mb-3">
                  After adding the record, DNS propagation may take a few minutes. Click below to verify.
                </p>
                <Button
                  onClick={handleCheckDNS}
                  disabled={syncMutation.isPending}
                  size="sm"
                >
                  {syncMutation.isPending ? 'Checking DNS...' : 'Check DNS Now'}
                </Button>
              </Callout>
            )}

            {(domain.status === 'issuing' || domain.status === 'pending_validation') && (
              <Callout variant="info" title="Verification in Progress">
                <div className="flex items-center gap-3 mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p>
                    Cloudflare is validating your DNS configuration and issuing your certificate. This process is automatic and typically completes within a few minutes.
                  </p>
                </div>
                <Button onClick={handleRefreshStatus} variant="outline" size="sm" disabled={syncMutation.isPending}>
                  {syncMutation.isPending ? 'Refreshing...' : 'Refresh Status'}
                </Button>
              </Callout>
            )}

            {domain.status === 'active' && (
              <Callout variant="success" title="Certificate Active">
                <p className="mb-4">
                  Your certificate is active and configured for automatic renewal. No action required.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Last Updated</p>
                    <p className="text-sm">
                      {domain.updatedAt && format(new Date(domain.updatedAt), 'PPP')}
                    </p>
                  </div>
                  {domain.expiresAt && (
                    <div>
                      <p className="text-sm font-medium mb-1">Expires</p>
                      <p className="text-sm">
                        {format(new Date(domain.expiresAt), 'PPP')}
                      </p>
                    </div>
                  )}
                </div>
              </Callout>
            )}
          </TabsContent>

          <TabsContent value="certificate" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Certificate size={24} className="text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Certificate Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Domain Name
                  </p>
                  <p className="text-foreground">{domain.domainName}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </p>
                  <StatusBadge status={domain.status} />
                </div>

                {domain.lastIssuedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Issued At
                    </p>
                    <p className="text-foreground">
                      {format(new Date(domain.lastIssuedAt), 'PPP')}
                    </p>
                  </div>
                )}

                {domain.expiresAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Expires At
                    </p>
                    <p className="text-foreground">
                      {format(new Date(domain.expiresAt), 'PPP')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(domain.expiresAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}

                {domain.cfCustomHostnameId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Cloudflare ID
                    </p>
                    <p className="text-sm font-mono text-foreground">
                      {domain.cfCustomHostnameId}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Auto-Renewal
                  </p>
                  <p className="text-foreground">
                    {domain.status === 'active' ? 'Enabled' : 'Not yet active'}
                  </p>
                </div>
              </div>

              {domain.status === 'active' && (
                <div className="mt-6 pt-6 border-t border-border">
                  <Callout variant="success">
                    Your certificate will automatically renew before expiration. No action is required from you.
                  </Callout>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            {jobs.length === 0 ? (
              <EmptyState
                icon={<Queue size={48} weight="thin" />}
                title="No background jobs yet"
                description="Background jobs will appear here as DNS checks and certificate operations are performed."
              />
            ) : (
              jobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground capitalize">
                          {job.type.replace(/_/g, ' ')}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <Clock size={14} className="inline mr-1" />
                          {format(new Date(job.createdAt), 'PPpp')}
                        </p>
                        <p>Attempts: {job.attempts}</p>
                      </div>
                      {job.lastError && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded">
                          <p className="text-sm font-medium text-destructive mb-1">
                            Error Details:
                          </p>
                          <p className="text-sm text-foreground">{job.lastError}</p>
                        </div>
                      )}
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
