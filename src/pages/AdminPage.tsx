import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getAllDomains, getDomainsExpiringBefore, setJob, addAuditLog } from '@/lib/data';
import { generateId } from '@/lib/crypto';
import { toast } from 'sonner';
import type { Job } from '@/types';
import { Badge } from '@/components/ui/badge';

type AdminPageProps = {
  onNavigate: (page: string) => void;
};

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { user, currentOrg } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleSimulateCron = async () => {
    if (!user || !currentOrg) return;

    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringDomains = await getDomainsExpiringBefore(
        thirtyDaysFromNow.toISOString()
      );

      for (const domain of expiringDomains) {
        const job: Job = {
          id: await generateId(),
          type: 'renewal',
          domainId: domain.id,
          status: 'queued',
          attempts: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setJob(job);

        await addAuditLog({
          id: await generateId(),
          orgId: domain.orgId,
          action: 'admin.cron_renewal_queued',
          entityType: 'domain',
          entityId: domain.id,
          details: { jobId: job.id },
          createdAt: new Date().toISOString(),
        });
      }

      toast.success(`Queued ${expiringDomains.length} renewal jobs`);
    } catch (error) {
      toast.error('Failed to simulate cron');
    }
  };

  const envVars = [
    {
      key: 'CLOUDFLARE_API_TOKEN',
      description: 'API token for Cloudflare DNS management',
      isSet: false,
      required: true,
    },
    {
      key: 'STRIPE_PUBLIC_KEY',
      description: 'Stripe public key for payments',
      isSet: false,
      required: false,
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      description: 'Stripe webhook secret for payment events',
      isSet: false,
      required: false,
    },
    {
      key: 'SECONDARY_CA',
      description: 'Backup CA endpoint (ZeroSSL)',
      isSet: false,
      required: false,
    },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="admin">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            System administration and testing tools
          </p>
        </div>

        <Alert>
          <AlertDescription>
            This is the admin panel for testing and system management. Some features are stubbed for demonstration.
          </AlertDescription>
        </Alert>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Demo Mode
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="demo-mode">Enable Demo Mode</Label>
              <p className="text-sm text-muted-foreground">
                Seed example organizations and domains for testing
              </p>
            </div>
            <Switch
              id="demo-mode"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            System Operations
          </h3>
          <div className="space-y-4">
            <div>
              <Label>Simulate Daily Cron</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Find certificates expiring in less than 30 days and queue renewal jobs
              </p>
              <Button onClick={handleSimulateCron} variant="outline">
                Run Cron Now
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Environment Variables
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configuration status for external services (values not shown for security)
          </p>
          <div className="space-y-3">
            {envVars.map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground font-mono text-sm">
                      {env.key}
                    </span>
                    {env.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {env.description}
                  </p>
                </div>
                <Badge
                  variant={env.isSet ? 'default' : 'outline'}
                  className={env.isSet ? 'bg-success text-success-foreground' : ''}
                >
                  {env.isSet ? '✓ Set' : '✗ Not Set'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-muted/30">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Publishing Notes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            When you publish this Spark, remember that all users share the same datastore.
            You can make it read-only for viewers to prevent modifications.
          </p>
          <div className="flex items-center gap-2">
            <Switch id="readonly" />
            <Label htmlFor="readonly">Make this spark read-only</Label>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
