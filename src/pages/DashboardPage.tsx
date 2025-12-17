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
import { Plus, MagnifyingGlass, Globe, CheckCircle, ArrowsClockwise, Warning, Shield } from '@phosphor-icons/react';
import { getOrgDomains, createDomain, addAuditLog } from '@/lib/data';
import { generateId } from '@/lib/crypto';
import { DNSRecordDisplay } from '@/components/DNSRecordDisplay';
import type { Domain } from '@/types';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
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

  // Memoize filtered domains to avoid recalculation on every render
  const filteredDomains = useMemo(() => {
    const searchLower = search.toLowerCase();
    return domains.filter(d => d.domainName.toLowerCase().includes(searchLower));
  }, [domains, search]);

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

  // Calculate metrics
  const totalDomains = domains.length;
  const activeCertificates = domains.filter(d => d.status === 'active').length;
  const pendingChallenges = domains.filter(d => d.status === 'issuing' || d.status === 'pending_validation').length;
  const errorsCount = domains.filter(d => d.status === 'error').length;

  return (
    <AppShell onNavigate={onNavigate} currentPage="dashboard">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Domains</h1>
            <p className="text-muted-foreground mt-1">
              Manage your certificate domains and validation status
            </p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="active:scale-95 transition-transform">
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
                  className="w-full active:scale-95 transition-transform"
                  onClick={handleAddDomain}
                  disabled={addDomainMutation.isPending}
                >
                  {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Domains</p>
                <p className="text-3xl font-bold text-foreground">{totalDomains}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe size={24} className="text-primary" weight="fill" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Certificates</p>
                <p className="text-3xl font-bold text-success">{activeCertificates}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle size={24} className="text-success" weight="fill" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending Challenges</p>
                <p className="text-3xl font-bold text-primary">{pendingChallenges}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowsClockwise size={24} className="text-primary" weight="fill" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Errors/Action Needed</p>
                <p className="text-3xl font-bold text-destructive">{errorsCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Warning size={24} className="text-destructive" weight="fill" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <MagnifyingGlass size={20} className="text-muted-foreground" />
            <Input
              placeholder="Search domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          {filteredDomains.length === 0 ? (
            <div className="text-center py-16">
              {search ? (
                <p className="text-muted-foreground">
                  No domains found matching your search.
                </p>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield size={40} className="text-primary" weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No domains yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first domain to get started with automated certificate management.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsAddOpen(true)}
                    className="active:scale-95 transition-transform"
                  >
                    <Plus size={20} weight="bold" className="mr-2" />
                    Add Domain
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    onSelectDomain(domain.id);
                    onNavigate('domain-detail');
                  }}
                >
                  {/* Favicon */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain.domainName}&sz=32`}
                    alt={`Favicon for ${domain.domainName}`}
                    className="w-8 h-8 rounded"
                    onError={(e) => {
                      // Fallback to Globe icon on error
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center hidden">
                    <Globe size={20} className="text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {domain.domainName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {domain.expiresAt
                        ? `Expires ${formatDistanceToNow(new Date(domain.expiresAt), { addSuffix: true })}`
                        : 'Not issued yet'}
                    </div>
                  </div>
                  <StatusBadge status={domain.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-2">Plan Usage</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {domains.length} / {PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains} domains used
          </p>
          {domains.length >= PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains && (
            <Button variant="outline" onClick={() => onNavigate('billing')}>
              Upgrade Plan
            </Button>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
