import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  // Fetch jobs with React Query
  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: getAllJobs,
    staleTime: 10000,
  });

  // Fetch domains with React Query
  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 10000,
  });

  // Memoize domain ID set and filtered/sorted jobs
  const { jobs } = useMemo(() => {
    const orgDomainIds = new Set(domains.map(d => d.id));
    const orgJobs = allJobs
      .filter(j => orgDomainIds.has(j.domainId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return { jobs: orgJobs };
  }, [allJobs, domains]);

  // Memoize domain lookup map for O(1) access
  const domainMap = useMemo(() => {
    return new Map(domains.map(d => [d.id, d.domainName]));
  }, [domains]);

  const getDomainName = (domainId: string) => {
    return domainMap.get(domainId) || 'Unknown';
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
