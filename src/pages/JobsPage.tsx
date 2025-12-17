import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getAllJobs, getOrgDomains } from '@/lib/data';
import type { Job, Domain } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { Queue, Clock, ArrowsClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type JobsPageProps = {
  onNavigate: (page: string) => void;
};

export function JobsPage({ onNavigate }: JobsPageProps) {
  const { currentOrg } = useAuth();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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

  // Define table columns
  const columns: Column<Job>[] = [
    {
      key: 'type',
      header: 'Job Type',
      sortable: true,
      render: (job) => (
        <span className="font-medium capitalize text-foreground">
          {job.type.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'domainId',
      header: 'Domain',
      render: (job) => (
        <span className="text-sm text-foreground">{getDomainName(job.domainId)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (job) => <StatusBadge status={job.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (job) => (
        <div className="text-sm">
          <p className="text-foreground">{format(new Date(job.createdAt), 'MMM d, yyyy')}</p>
          <p className="text-muted-foreground">
            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
          </p>
        </div>
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      sortable: true,
      render: (job) => (
        <span className="text-sm text-foreground">{job.attempts}</span>
      ),
    },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="jobs">
      <div className="space-y-6">
        <PageHeader
          title="Background Jobs"
          description="Monitor certificate issuance, DNS checks, and renewal jobs"
        />

        <DataTable
          data={jobs}
          columns={columns}
          searchKey="type"
          searchPlaceholder="Search jobs..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'queued', label: 'Queued' },
                { value: 'running', label: 'Running' },
                { value: 'succeeded', label: 'Succeeded' },
                { value: 'failed', label: 'Failed' },
              ],
            },
          ]}
          onRowClick={(job) => setSelectedJob(job)}
          emptyState={
            <EmptyState
              icon={<Queue size={48} weight="thin" />}
              title="No background jobs"
              description="Background jobs for DNS checks, certificate issuance, and renewals will appear here once domains are added."
            />
          }
        />
      </div>

      {/* Job Detail Sheet */}
      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader>
                <SheetTitle className="capitalize">
                  {selectedJob.type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription>
                  Job details and execution history
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Status
                  </h4>
                  <StatusBadge status={selectedJob.status} />
                </div>

                {/* Domain */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Domain
                  </h4>
                  <p className="text-foreground">
                    {getDomainName(selectedJob.domainId)}
                  </p>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Created
                    </h4>
                    <p className="text-sm text-foreground">
                      {format(new Date(selectedJob.createdAt), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Updated
                    </h4>
                    <p className="text-sm text-foreground">
                      {format(new Date(selectedJob.updatedAt), 'PPpp')}
                    </p>
                  </div>
                </div>

                {/* Attempts */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Attempts
                  </h4>
                  <p className="text-foreground">{selectedJob.attempts}</p>
                </div>

                {/* Error Details */}
                {selectedJob.lastError && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Error Details
                    </h4>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedJob.lastError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {selectedJob.result && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Result
                    </h4>
                    <div className="p-3 bg-muted rounded">
                      <pre className="text-xs text-foreground overflow-x-auto">
                        {JSON.stringify(selectedJob.result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedJob.status === 'failed' && (
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      <ArrowsClockwise size={20} className="mr-2" />
                      Retry Job (Coming Soon)
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
