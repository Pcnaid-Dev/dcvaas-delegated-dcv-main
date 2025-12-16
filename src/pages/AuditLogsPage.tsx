import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getOrgAuditLogs } from '@/lib/data';
import type { AuditLog } from '@/types';
import { format } from 'date-fns';
import { PLAN_LIMITS } from '@/types';
import { Button } from '@/components/ui/button';

type AuditLogsPageProps = {
  onNavigate: (page: string) => void;
};

export function AuditLogsPage({ onNavigate }: AuditLogsPageProps) {
  const { currentOrg } = useAuth();

  // Fetch audit logs with React Query
  const { data: logs = [] } = useQuery({
    queryKey: ['auditLogs', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgAuditLogs(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 30000, // 30 seconds - audit logs don't change frequently
  });

  if (!currentOrg) return null;

  const hasAccess = PLAN_LIMITS[currentOrg.subscriptionTier].auditLogs;

  return (
    <AppShell onNavigate={onNavigate} currentPage="audit">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View all activity and changes in your organization
          </p>
        </div>

        {!hasAccess ? (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Full Audit Logs (Agency Plan)
            </h3>
            <p className="text-muted-foreground mb-6">
              Upgrade to Agency plan for complete audit logging and compliance features.
            </p>
            <Button onClick={() => onNavigate('billing')}>
              Upgrade to Agency
            </Button>
          </Card>
        ) : (
          <>
            {logs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No audit logs yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground capitalize">
                          {log.action.replace(/\./g, ' ')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.createdAt), 'PPpp')}
                        </p>
                        {log.details && (
                          <pre className="text-xs text-muted-foreground mt-2 font-mono bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
