import { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getOrganization, setOrganization, getUserOrganizations, addMembership } from '@/lib/data';
import { generateId } from '@/lib/crypto';
import { toast } from 'sonner';
import type { Organization } from '@/types';
import { PLAN_LIMITS } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from '@phosphor-icons/react';

type SettingsPageProps = {
  onNavigate: (page: string) => void;
};

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, currentOrg, refreshOrganizations } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
    }
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg) return;
    try {
      const updated: Organization = {
        ...currentOrg,
        name: orgName,
      };
      await setOrganization(updated);
      toast.success('Settings saved');
      await refreshOrganizations();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleCreateOrg = async () => {
    if (!user) return;
    if (!newOrgName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    try {
      const org: Organization = {
        id: await generateId(),
        name: newOrgName,
        ownerId: user.id,
        subscriptionTier: 'free',
        createdAt: new Date().toISOString(),
      };
      await setOrganization(org);

      const now = new Date().toISOString();
      await addMembership({
        id: await generateId(),
        userId: user.id,
        orgId: org.id,
        email: user.email,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      await refreshOrganizations();
      setIsCreateOpen(false);
      setNewOrgName('');
      toast.success('Organization created');
    } catch (error) {
      toast.error('Failed to create organization');
    }
  };

  const hasWhiteLabel = currentOrg && PLAN_LIMITS[currentOrg.subscriptionTier].whiteLabel;

  return (
    <AppShell onNavigate={onNavigate} currentPage="settings">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization settings
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus size={20} className="mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-org-name">Organization Name</Label>
                  <Input
                    id="new-org-name"
                    placeholder="My Organization"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCreateOrg}>
                  Create Organization
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {currentOrg && (
          <>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Organization Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                White-Label Branding
              </h3>
              {hasWhiteLabel ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Customize the appearance of your DCVaaS portal with your own branding.
                  </p>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input placeholder="https://example.com/logo.png" />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <Input type="color" />
                  </div>
                  <Button variant="outline">Save Branding</Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    White-label branding is available on the Agency plan.
                  </p>
                  <Button variant="outline" onClick={() => onNavigate('billing')}>
                    Upgrade to Agency
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
