import { useState, useEffect } from 'react';
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
  const [domain, setDomainState] = useState<Domain | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadDomain();
  }, [domainId]);

  const loadDomain = async () => {
    if (!domainId) return;
    const d = await getDomain(domainId);
    if (d) {
      setDomainState(d);
      const domainJobs = await getJobs(d.id);
      setJobs(domainJobs);
    }
  };

  const handleCheckDNS = async () => {
    if (!domain || !user || !currentOrg) return;

    setIsChecking(true);
    try {
      const result = await checkCNAME(domain.domainName, domain.cnameTarget);

      const job: Job = {
        id: await generateId(),
        type: 'dns_check',
        domainId: domain.id,
        status: result.success ? 'succeeded' : 'failed',
        attempts: 1,
        lastError: result.error,
        result,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setJob(job);

      if (result.success) {
        await addAuditLog({
          id: await generateId(),
          orgId: currentOrg.id,
          userId: user.id,
          action: 'domain.dns_verified',
          entityType: 'domain',
          entityId: domain.id,
          details: { result },
          createdAt: new Date().toISOString(),
        });

        // Trigger sync with Cloudflare
        await syncDomain(domain.id);
        toast.success('DNS verified! Cloudflare is now validating.');
      } else {
        toast.error(result.error || 'DNS verification failed');
      }

      await loadDomain();
    } catch (error) {
      toast.error('Failed to check DNS');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!domain) return;
    setIsChecking(true);
    try {
      await syncDomain(domain.id);
      toast.success('Status refreshed from Cloudflare');
      await loadDomain();
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setIsChecking(false);
    }
  };

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
                  disabled={isChecking}
                  className="w-full"
                >
                  {isChecking ? 'Checking DNS...' : 'Check DNS Now'}
                </Button>
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
                    <Button onClick={handleRefreshStatus} variant="outline" size="sm" disabled={isChecking}>
                        {isChecking ? 'Refreshing...' : 'Refresh Status'}
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
                <Button onClick={handleRefreshStatus} variant="outline" className="w-full" disabled={isChecking}>
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
