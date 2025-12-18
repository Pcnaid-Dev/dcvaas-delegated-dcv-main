import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, DotsThree, ArrowsClockwise, Eye, Copy } from '@phosphor-icons/react';
import { getOrgDomains, createDomain, addAuditLog, syncDomain } from '@/lib/data';
import { generateId } from '@/lib/crypto';
import { PageHeader, DataTable, EmptyState, Callout, type Column } from '@/components/common';
import type { Domain } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { PLAN_LIMITS } from '@/types';

type DashboardPageProps = {
  onNavigate: (page: string) => void;
  onSelectDomain: (domainId: string) => void;
};

export function DashboardPage({ onNavigate, onSelectDomain }: DashboardPageProps) {
  const { user, currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Use React Query for data fetching with caching
  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 10000, // 10 seconds
  });

  // Mutation for adding domains
  const addDomainMutation = useMutation({
    mutationFn: createDomain,
    onSuccess: (domain) => {
      // Invalidate and refetch domains query
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

  // Mutation for syncing domain
  const syncMutation = useMutation({
    mutationFn: (domainId: string) => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains', currentOrg?.id] });
      toast.success('Status refreshed from Cloudflare');
    },
    onError: () => {
      toast.error('Failed to refresh status');
    },
  });

  // Memoize filtered domains to avoid recalculation on every render
  const filteredDomains = useMemo(() => {
    const searchLower = search.toLowerCase();
    let filtered = domains.filter(d => d.domainName.toLowerCase().includes(searchLower));
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'expiring') {
        // Find domains expiring soon (within 30 days)
        const now = Date.now();
        const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(d => {
          if (!d.expiresAt) return false;
          const expiryTime = new Date(d.expiresAt).getTime();
          return expiryTime > now && expiryTime <= thirtyDaysFromNow;
        });
      } else {
        filtered = filtered.filter(d => d.status === statusFilter);
      }
    }
    
    return filtered;
  }, [domains, search, statusFilter]);

  const handleCopyCNAME = (domain: Domain) => {
    const cnameTarget = process.env.SAAS_CNAME_TARGET || 'dcv.pcnaid.com';
    const instruction = `${domain.domainName} CNAME ${cnameTarget}`;
    navigator.clipboard.writeText(instruction);
    toast.success('CNAME instruction copied to clipboard');
  };

  const handleRefreshStatus = (domainId: string) => {
    syncMutation.mutate(domainId);
  };

  // Define table columns
  const columns: Column<Domain>[] = [
    {
      key: 'domainName',
      label: 'Domain',
      sortable: true,
      render: (domain) => (
        <div className="font-medium text-foreground">{domain.domainName}</div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (domain) => <StatusBadge status={domain.status} />,
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      sortable: true,
      render: (domain) => (
        <div className="text-sm text-muted-foreground">
          {domain.expiresAt
            ? format(new Date(domain.expiresAt), 'MMM dd, yyyy')
            : 'Not issued'}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (domain) => (
        <div className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(domain.updatedAt), { addSuffix: true })}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (domain) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <DotsThree size={20} weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                onSelectDomain(domain.id);
                onNavigate('domain-detail');
              }}
            >
              <Eye size={16} className="mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyCNAME(domain)}>
              <Copy size={16} className="mr-2" />
              Copy CNAME
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRefreshStatus(domain.id)}>
              <ArrowsClockwise size={16} className="mr-2" />
              Refresh Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!currentOrg) {
    return (
      <AppShell onNavigate={onNavigate} currentPage="dashboard">
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

  return (
    <AppShell onNavigate={onNavigate} currentPage="dashboard">
      <PageHeader
        title="Domains"
        description="Manage your certificate domains and validation status"
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={20} weight="bold" />
                <span className="ml-2">Add Domain</span>
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

      {domains.length >= PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains && (
        <Callout variant="warning" title="Domain Limit Reached">
          You've reached your plan limit of {PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains} domains.{' '}
          <Button
            variant="link"
            onClick={() => onNavigate('billing')}
            className="h-auto p-0 font-medium"
          >
            Upgrade your plan
          </Button>
          to add more domains.
        </Callout>
      )}

      <DataTable
        columns={columns}
        data={filteredDomains}
        searchable
        searchPlaceholder="Search domains..."
        onSearch={setSearch}
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
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Badge>
            <Badge
              variant={statusFilter === 'pending_cname' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('pending_cname')}
            >
              Pending
            </Badge>
            <Badge
              variant={statusFilter === 'issuing' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('issuing')}
            >
              Issuing
            </Badge>
            <Badge
              variant={statusFilter === 'error' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('error')}
            >
              Error
            </Badge>
            <Badge
              variant={statusFilter === 'expiring' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('expiring')}
            >
              Expiring Soon
            </Badge>
          </>
        }
        emptyState={
          <EmptyState
            icon={<Plus size={32} />}
            title="No domains yet"
            description="Add your first domain to start managing SSL/TLS certificates with delegated validation."
            primaryAction={{
              label: 'Add Domain',
              onClick: () => setIsAddOpen(true),
            }}
          />
        }
      />

      <Card className="p-6 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground mb-1">Plan Usage</h3>
            <p className="text-sm text-muted-foreground">
              {domains.length} / {PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains} domains used
            </p>
          </div>
          {domains.length >= PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains * 0.8 && (
            <Button variant="outline" onClick={() => onNavigate('billing')}>
              Upgrade Plan
            </Button>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
