import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Callout } from '@/components/ui/callout';
import { getOrgDomains, getAllJobs } from '@/lib/data';
import { PLAN_LIMITS } from '@/types';
import {
  Globe,
  Clock,
  Warning,
  CheckCircle,
  Plus,
  ArrowRight,
} from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '@/components/StatusBadge';

type OverviewPageProps = {
  onNavigate: (page: string) => void;
  onSelectDomain: (domainId: string) => void;
};

export function OverviewPage({ onNavigate, onSelectDomain }: OverviewPageProps) {
  const { currentOrg } = useAuth();

  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 10000,
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: getAllJobs,
    staleTime: 10000,
  });

  // Calculate KPIs
  const stats = useMemo(() => {
    const active = domains.filter(d => d.status === 'active').length;
    const pending = domains.filter(d => d.status === 'pending_cname').length;
    const issuing = domains.filter(d => d.status === 'issuing' || d.status === 'pending_validation').length;
    const error = domains.filter(d => d.status === 'error').length;
    
    // Calculate expiring soon (within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = domains.filter(d => {
      if (!d.expiresAt) return false;
      const expiresDate = new Date(d.expiresAt);
      return expiresDate > now && expiresDate <= thirtyDaysFromNow;
    }).length;

    return { active, pending, issuing, error, expiringSoon };
  }, [domains]);

  // Calculate progress for onboarding checklist
  const onboardingProgress = useMemo(() => {
    const steps = {
      addedDomain: domains.length > 0,
      configuredDNS: domains.some(d => d.status !== 'pending_cname'),
      verifiedDNS: domains.some(d => d.status === 'issuing' || d.status === 'pending_validation' || d.status === 'active'),
      activeCert: domains.some(d => d.status === 'active'),
    };
    const completed = Object.values(steps).filter(Boolean).length;
    return { steps, completed, total: 4 };
  }, [domains]);

  // Get recent activity
  const recentActivity = useMemo(() => {
    const domainMap = new Map(domains.map(d => [d.id, d]));
    
    // Combine domains and jobs for activity feed
    const activities: Array<{
      id: string;
      type: 'domain' | 'job';
      timestamp: string;
      domain: string;
      status: string;
      message: string;
    }> = [];

    // Add recent domain updates
    domains.slice(0, 5).forEach(d => {
      activities.push({
        id: d.id,
        type: 'domain',
        timestamp: d.updatedAt,
        domain: d.domainName,
        status: d.status,
        message: `Domain ${d.status === 'active' ? 'activated' : 'status changed'}`,
      });
    });

    // Add recent jobs
    allJobs
      .filter(j => domainMap.has(j.domainId))
      .slice(0, 5)
      .forEach(j => {
        const domain = domainMap.get(j.domainId);
        if (domain) {
          activities.push({
            id: j.id,
            type: 'job',
            timestamp: j.updatedAt || j.createdAt,
            domain: domain.domainName,
            status: j.status,
            message: `Job ${j.type.replace(/_/g, ' ')} ${j.status}`,
          });
        }
      });

    // Sort by timestamp and take top 5
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [domains, allJobs]);

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

  const planLimits = PLAN_LIMITS[currentOrg.subscriptionTier];
  const usagePercentage = (domains.length / planLimits.maxDomains) * 100;

  return (
    <AppShell onNavigate={onNavigate} currentPage="dashboard">
      <div className="space-y-8">
        <PageHeader
          title="Overview"
          description="Monitor your certificate management at a glance"
          actions={
            <Button onClick={() => onNavigate('domains')}>
              <Plus size={20} weight="bold" className="mr-2" />
              Add Domain
            </Button>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Domains"
            value={stats.active}
            description="Certificates active and auto-renewing"
            icon={<CheckCircle size={24} weight="fill" />}
          />
          <StatCard
            title="Pending CNAME"
            value={stats.pending}
            description="Awaiting DNS configuration"
            icon={<Clock size={24} weight="fill" />}
          />
          <StatCard
            title="Expiring Soon"
            value={stats.expiringSoon}
            description="Within 30 days"
            icon={<Warning size={24} weight="fill" />}
          />
          <StatCard
            title="Errors"
            value={stats.error}
            description="Requires attention"
            icon={<Warning size={24} weight="fill" />}
            className={stats.error > 0 ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : ''}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Onboarding Checklist */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Getting Started
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${onboardingProgress.steps.addedDomain ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {onboardingProgress.steps.addedDomain ? '✓' : '1'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Add Domain</p>
                  <p className="text-sm text-muted-foreground">Start by adding your first domain</p>
                </div>
                {!onboardingProgress.steps.addedDomain && (
                  <Button size="sm" variant="outline" onClick={() => onNavigate('domains')}>
                    Add
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${onboardingProgress.steps.configuredDNS ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {onboardingProgress.steps.configuredDNS ? '✓' : '2'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Configure DNS</p>
                  <p className="text-sm text-muted-foreground">Add CNAME record to your DNS</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${onboardingProgress.steps.verifiedDNS ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {onboardingProgress.steps.verifiedDNS ? '✓' : '3'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Verify DNS</p>
                  <p className="text-sm text-muted-foreground">Check DNS propagation</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${onboardingProgress.steps.activeCert ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                  {onboardingProgress.steps.activeCert ? '✓' : '4'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">Certificate Active</p>
                  <p className="text-sm text-muted-foreground">Auto-renew enabled</p>
                </div>
              </div>

              <div className="pt-3">
                <Progress value={(onboardingProgress.completed / onboardingProgress.total) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {onboardingProgress.completed} of {onboardingProgress.total} steps completed
                </p>
              </div>
            </div>
          </Card>

          {/* Plan Usage */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Plan Usage</h3>
              <Globe size={24} className="text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Domains
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {domains.length} / {planLimits.maxDomains}
                  </span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  Current Plan: <span className="font-semibold capitalize">{currentOrg.subscriptionTier}</span>
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {planLimits.apiAccess && <li>✓ API Access</li>}
                  {planLimits.teamAccess && <li>✓ Team Management</li>}
                  {planLimits.whiteLabel && <li>✓ White-label Branding</li>}
                </ul>
              </div>

              {usagePercentage >= 80 && (
                <Callout variant="warning" className="mt-4">
                  You're approaching your domain limit. Consider upgrading your plan.
                </Callout>
              )}

              {currentOrg.subscriptionTier !== 'agency' && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => onNavigate('billing')}
                >
                  Upgrade Plan
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('domains')}
            >
              View All <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity. Add a domain to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (activity.type === 'domain') {
                      onSelectDomain(activity.id);
                      onNavigate('domain-detail');
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {activity.message}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.domain} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={activity.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        {domains.length > 0 && stats.error > 0 && (
          <Callout variant="error">
            <p className="font-semibold mb-1">Action Required</p>
            <p>
              You have {stats.error} domain{stats.error !== 1 ? 's' : ''} with errors.{' '}
              <button
                onClick={() => onNavigate('domains')}
                className="underline font-medium"
              >
                View domains
              </button>
            </p>
          </Callout>
        )}
      </div>
    </AppShell>
  );
}
