import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, StatCard } from '@/components/common';
import { getOrgDomains, getAllJobs } from '@/lib/data';
import { Plus, Globe, CheckCircle, Clock, XCircle, Queue } from '@phosphor-icons/react';
import { formatDistanceToNow } from 'date-fns';
import type { Domain, Job } from '@/types';

type OverviewPageProps = {
  onNavigate: (page: string) => void;
  onSelectDomain?: (domainId: string) => void;
};

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

const DOMAIN_STATUS_CONFIG = {
  active: {
    icon: CheckCircle,
    label: 'Active',
    className: 'text-success',
  },
  issuing: {
    icon: Clock,
    label: 'Issuing',
    className: 'text-primary',
  },
  pending_cname: {
    icon: Clock,
    label: 'Pending',
    className: 'text-muted-foreground',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    className: 'text-destructive',
  },
} as const;

export function OverviewPage({ onNavigate, onSelectDomain }: OverviewPageProps) {
  const { currentOrg } = useAuth();

  const { data: domains = [] } = useQuery({
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

  // Calculate stats
  const stats = useMemo(() => {
    const orgDomainIds = new Set(domains.map(d => d.id));
    const orgJobs = allJobs.filter(j => orgDomainIds.has(j.domainId));

    const totalDomains = domains.length;
    const activeDomains = domains.filter(d => d.status === 'active').length;
    const pendingDomains = domains.filter(d => 
      d.status === 'pending_cname' || d.status === 'issuing'
    ).length;
    
    // Find domains expiring soon (within 30 days)
    const now = Date.now();
    const thirtyDaysFromNow = now + THIRTY_DAYS_IN_MS;
    const expiringSoon = domains.filter(d => {
      if (!d.expiresAt) return false;
      const expiryTime = new Date(d.expiresAt).getTime();
      return expiryTime > now && expiryTime <= thirtyDaysFromNow;
    }).length;

    const failedJobs = orgJobs.filter(j => j.status === 'failed').length;

    return {
      totalDomains,
      activeDomains,
      pendingDomains,
      expiringSoon,
      failedJobs,
    };
  }, [domains, allJobs]);

  // Recent activity
  const recentDomains = useMemo(() => {
    return [...domains]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [domains]);

  return (
    <AppShell onNavigate={onNavigate} currentPage="overview">
      <PageHeader
        title="Overview"
        description="Monitor your certificate lifecycle at a glance"
        actions={
          <Button onClick={() => onNavigate('dashboard')}>
            <Plus size={18} weight="bold" />
            <span className="ml-2">Add Domain</span>
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Globe size={24} weight="fill" />}
          label="Total Domains"
          value={stats.totalDomains}
          helpText="Total number of domains in your organization"
        />
        <StatCard
          icon={<CheckCircle size={24} weight="fill" />}
          label="Active Certificates"
          value={stats.activeDomains}
          helpText="Domains with active SSL/TLS certificates"
          trend={stats.activeDomains > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          icon={<Clock size={24} weight="fill" />}
          label="Pending"
          value={stats.pendingDomains}
          helpText="Domains waiting for DNS configuration or issuance"
        />
        <StatCard
          icon={<XCircle size={24} weight="fill" />}
          label="Failed Jobs"
          value={stats.failedJobs}
          helpText="Background jobs that require attention"
          trend={stats.failedJobs > 0 ? 'down' : 'neutral'}
        />
      </div>

      {stats.expiringSoon > 0 && (
        <Card className="p-6 mb-8 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <Clock size={24} className="text-yellow-600 dark:text-yellow-500 mt-1" weight="fill" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {stats.expiringSoon} {stats.expiringSoon === 1 ? 'certificate' : 'certificates'} expiring soon
              </h3>
              <p className="text-sm text-muted-foreground">
                Certificates expiring within 30 days will be automatically renewed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <Globe size={32} weight="duotone" className="text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Add Domain</h3>
            <p className="text-sm text-muted-foreground">
              Configure a new domain for SSL/TLS certificates
            </p>
          </Card>
          <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <CheckCircle size={32} weight="duotone" className="text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">View Domains</h3>
            <p className="text-sm text-muted-foreground">
              Manage all your SSL/TLS certificates
            </p>
          </Card>
          <Card className="p-6 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onNavigate('jobs')}>
            <Queue size={32} weight="duotone" className="text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">View Jobs</h3>
            <p className="text-sm text-muted-foreground">
              Monitor background job status
            </p>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
        {recentDomains.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No recent activity</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {recentDomains.map((domain) => (
                <div
                  key={domain.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (onSelectDomain) {
                      onSelectDomain(domain.id);
                      onNavigate('domain-detail');
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{domain.domainName}</p>
                      <p className="text-sm text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(domain.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="ml-4">
                      {DOMAIN_STATUS_CONFIG[domain.status as keyof typeof DOMAIN_STATUS_CONFIG] ? (
                        <span className={`${DOMAIN_STATUS_CONFIG[domain.status as keyof typeof DOMAIN_STATUS_CONFIG].className} flex items-center gap-1`}>
                          {React.createElement(
                            DOMAIN_STATUS_CONFIG[domain.status as keyof typeof DOMAIN_STATUS_CONFIG].icon,
                            { size: 16, weight: 'fill' }
                          )}
                          {DOMAIN_STATUS_CONFIG[domain.status as keyof typeof DOMAIN_STATUS_CONFIG].label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
