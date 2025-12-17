import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Column } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/StatusBadge';
import { CopyButton } from '@/components/CopyButton';
import { Plus, Globe, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';
import { getOrgDomains, createDomain, addAuditLog, syncDomain } from '@/lib/data';
import { generateId } from '@/lib/crypto';
import type { Domain } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { PLAN_LIMITS } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DomainsListPageProps = {
  onNavigate: (page: string) => void;
  onSelectDomain: (domainId: string) => void;
};

export function DomainsListPage({ onNavigate, onSelectDomain }: DomainsListPageProps) {
  const { user, currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [search, setSearch] = useState('');

  // Use React Query for data fetching with caching
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 10000, // 10 seconds
  });

  // Mutation for adding domains
  const addDomainMutation = useMutation({
    mutationFn: createDomain,
    onSuccess: (domain) => {
      queryClient.invalidateQueries({ queryKey: ['domains', currentOrg?.id] });
      setIsAddOpen(false);
      setNewDomainName('');
      toast.success('Domain added successfully');
      onSelectDomain(domain.id);
      onNavigate('domain-detail');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add domain');
    },
  });

  // Mutation for syncing domain
  const syncMutation = useMutation({
    mutationFn: (domainId: string) => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains', currentOrg?.id] });
      toast.success('Domain status refreshed');
    },
    onError: () => {
      toast.error('Failed to refresh domain status');
    },
  });

  const handleAddDomain = async () => {
    if (!currentOrg || !user) return;
    if (!newDomainName.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    const planLimit = PLAN_LIMITS[currentOrg.subscriptionTier];
    if (domains.length >= planLimit.maxDomains) {
      toast.error(`Domain limit reached (${planLimit.maxDomains}). Please upgrade your plan.`);
      return;
    }

    try {
      const domain = await addDomainMutation.mutateAsync(newDomainName.trim().toLowerCase());

      try {
        await addAuditLog({
          id: await generateId(),
          orgId: currentOrg.id,
          userId: user.id,
          action: 'domain.created',
          entityType: 'domain',
          entityId: domain.id,
          details: { domainName: domain.domainName },
          createdAt: new Date().toISOString(),
        });
        // Invalidate audit log queries so UI stays in sync
        queryClient.invalidateQueries({ queryKey: ['auditLogs', currentOrg.id] });
      } catch (auditError) {
        toast.error('Domain added, but failed to record audit log. Please contact support if this persists.');
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  // Define table columns
  const columns: Column<Domain>[] = [
    {
      key: 'domainName',
      header: 'Domain',
      sortable: true,
      render: (domain) => (
        <div>
          <p className="font-medium text-foreground">{domain.domainName}</p>
          <p className="text-sm text-muted-foreground">
            Added {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (domain) => <StatusBadge status={domain.status} />,
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      sortable: true,
      render: (domain) => (
        <div className="text-sm">
          {domain.expiresAt ? (
            <>
              <p className="text-foreground">{format(new Date(domain.expiresAt), 'MMM d, yyyy')}</p>
              <p className="text-muted-foreground">
                {formatDistanceToNow(new Date(domain.expiresAt), { addSuffix: true })}
              </p>
            </>
          ) : (
            <span className="text-muted-foreground">Not issued</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (domain) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {domain.status === 'pending_cname' && (
            <CopyButton
              value={`_acme-challenge.${domain.domainName} CNAME ${domain.cnameTarget}`}
              label="Copy DNS"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  onSelectDomain(domain.id);
                  onNavigate('domain-detail');
                }}
              >
                View Details
              </DropdownMenuItem>
              {domain.status === 'pending_cname' && (
                <DropdownMenuItem
                  onClick={() => syncMutation.mutate(domain.id)}
                  disabled={syncMutation.isPending}
                >
                  <CheckCircle size={16} className="mr-2" />
                  Check DNS
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => syncMutation.mutate(domain.id)}
                disabled={syncMutation.isPending}
              >
                <ArrowsClockwise size={16} className="mr-2" />
                Refresh Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (!currentOrg) {
    return (
      <AppShell onNavigate={onNavigate} currentPage="domains">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            No Organization Selected
          </h2>
          <p className="text-muted-foreground mb-6">
            Create or select an organization to get started.
          </p>
          <Button onClick={() => onNavigate('settings')}>
            Go to Settings
          </Button>
        </div>
      </AppShell>
    );
  }

  const planLimit = PLAN_LIMITS[currentOrg.subscriptionTier];

  return (
    <AppShell onNavigate={onNavigate} currentPage="domains">
      <div className="space-y-6">
        <PageHeader
          title="Domains"
          description="Manage your certificate domains and validation status"
          actions={
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={20} weight="bold" className="mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Domain</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain-name">Domain Name</Label>
                    <Input
                      id="domain-name"
                      placeholder="example.com"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your domain without protocol (e.g., example.com)
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddDomain}
                    disabled={addDomainMutation.isPending}
                  >
                    {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          }
        />

        <DataTable
          data={domains}
          columns={columns}
          searchKey="domainName"
          searchPlaceholder="Search domains..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'pending_cname', label: 'Pending CNAME' },
                { value: 'issuing', label: 'Issuing' },
                { value: 'pending_validation', label: 'Pending Validation' },
                { value: 'error', label: 'Error' },
              ],
            },
          ]}
          onRowClick={(domain) => {
            onSelectDomain(domain.id);
            onNavigate('domain-detail');
          }}
          emptyState={
            <EmptyState
              icon={<Globe size={48} weight="thin" />}
              title="No domains yet"
              description="Delegated DCV allows you to securely manage SSL/TLS certificates without exposing root DNS credentials. Add your first domain to get started."
              action={{
                label: 'Add Domain',
                onClick: () => setIsAddOpen(true),
              }}
            />
          }
        />

        <div className="text-sm text-muted-foreground">
          Using {domains.length} of {planLimit.maxDomains} domains •{' '}
          {currentOrg.subscriptionTier !== 'agency' && (
            <button
              onClick={() => onNavigate('billing')}
              className="text-primary hover:underline font-medium"
            >
              Upgrade plan
            </button>
          )}
          {currentOrg.subscriptionTier === 'agency' && (
            <span className="capitalize">{currentOrg.subscriptionTier} plan</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
