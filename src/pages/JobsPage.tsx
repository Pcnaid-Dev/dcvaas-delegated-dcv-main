import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getAllJobs, getOrgDomains } from '@/lib/data';
import { PageHeader, DataTable, EmptyState, type Column } from '@/components/common';
import type { Job, Domain } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Queue } from '@phosphor-icons/react';

type JobsPageProps = {
  onNavigate: (page: string) => void;
};

export function JobsPage({ onNavigate }: JobsPageProps) {
  const { currentOrg } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Memoize domain lookup map for O(1) access
  const domainMap = useMemo(() => {
    return new Map(domains.map(d => [d.id, d.domainName]));
  }, [domains]);

  const getDomainName = (domainId: string) => {
    return domainMap.get(domainId) || 'Unknown';
  };

  // Memoize domain ID set and filtered/sorted jobs
  const filteredJobs = useMemo(() => {
    const orgDomainIds = new Set(domains.map(d => d.id));
    let orgJobs = allJobs
      .filter(j => orgDomainIds.has(j.domainId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply status filter
    if (statusFilter !== 'all') {
      orgJobs = orgJobs.filter(j => j.status === statusFilter);
    }

    return orgJobs;
  }, [allJobs, domains, statusFilter]);

  // Define table columns
  const columns: Column<Job>[] = [
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
      key: 'domainId',
      label: 'Domain',
      render: (job) => (
        <span className="text-sm text-muted-foreground">
          {getDomainName(job.domainId)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (job) => (
        <div>
          <div className="text-sm text-foreground">
            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(job.createdAt), 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
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
          <div className="max-w-xs">
            <p className="text-sm text-destructive truncate">{job.lastError}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="jobs">
      <PageHeader
        title="Jobs"
        description="Monitor background job execution and status"
      />

      <DataTable
        columns={columns}
        data={filteredJobs}
        searchable
        searchPlaceholder="Search jobs..."
        filters={
          <>
            <Badge
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Badge>
            <Badge
              variant={statusFilter === 'queued' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('queued')}
            >
              Queued
            </Badge>
            <Badge
              variant={statusFilter === 'running' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('running')}
            >
              Running
            </Badge>
            <Badge
              variant={statusFilter === 'succeeded' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('succeeded')}
            >
              Succeeded
            </Badge>
            <Badge
              variant={statusFilter === 'failed' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('failed')}
            >
              Failed
            </Badge>
          </>
        }
        emptyState={
          <EmptyState
            icon={<Queue size={32} />}
            title="No jobs found"
            description="Background jobs will appear here once domain operations are triggered."
          />
        }
      />
    </AppShell>
  );
}
