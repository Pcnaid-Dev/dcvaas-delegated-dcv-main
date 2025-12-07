import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_LIMITS } from '@/types';

type TeamPageProps = {
  onNavigate: (page: string) => void;
};

export function TeamPage({ onNavigate }: TeamPageProps) {
  const { currentOrg } = useAuth();

  if (!currentOrg) return null;

  const hasAccess = PLAN_LIMITS[currentOrg.subscriptionTier].teamAccess;

  return (
    <AppShell onNavigate={onNavigate} currentPage="team">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage team members and permissions
          </p>
        </div>

        {!hasAccess ? (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Team Management (Agency Plan)
            </h3>
            <p className="text-muted-foreground mb-6">
              Upgrade to Agency plan to invite team members with role-based access control.
            </p>
            <Button onClick={() => onNavigate('billing')}>
              Upgrade to Agency
            </Button>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Team Members
              </h3>
              <Button>Invite Member</Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Owner</p>
                  <p className="text-sm text-muted-foreground">Full access</p>
                </div>
                <Badge>Owner</Badge>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
