import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getAllJobs, getOrgDomains } from '@/lib/data';
import type { Job, Domain } from '@/types';
import { format } from 'date-fns';

type JobsPageProps = {
  onNavigate: (page: string) => void;
};

export function JobsPage({ onNavigate }: JobsPageProps) {
  const { currentOrg } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    const allJobs = await getAllJobs();
    const orgDomains = await getOrgDomains(currentOrg.id);
    const orgDomainIds = new Set(orgDomains.map(d => d.id));
    const orgJobs = allJobs.filter(j => orgDomainIds.has(j.domainId));
    setJobs(orgJobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setDomains(orgDomains);
  };

  const getDomainName = (domainId: string) => {
    return domains.find(d => d.id === domainId)?.domainName || 'Unknown';
  };

  return (
    <AppShell onNavigate={onNavigate} currentPage="jobs">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            View all background jobs and their status
          </p>
        </div>

        {jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No jobs yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground capitalize">
                        {job.type.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Domain: {getDomainName(job.domainId)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(job.createdAt), 'PPpp')}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Attempts: {job.attempts}
                  </div>
                </div>
                {job.lastError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                    <p className="text-sm text-destructive font-medium mb-1">
                      Error:
                    </p>
                    <p className="text-sm text-foreground">{job.lastError}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
