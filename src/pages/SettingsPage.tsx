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
  const { user, currentOrg, setCurrentOrg, refreshOrganizations } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#2563eb');

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      setLogoUrl(currentOrg.logoUrl || '');
      setBrandColor(currentOrg.brandColor || '#2563eb');
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

  const handleSaveBranding = async () => {
    if (!currentOrg) return;
    
    // Validate hex color format
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
    if (brandColor && !hexColorRegex.test(brandColor)) {
      toast.error('Invalid color format. Please use hex format (e.g., #2563eb)');
      return;
    }
    
    // Validate URL format
    if (logoUrl.trim()) {
      try {
        new URL(logoUrl.trim());
      } catch {
        toast.error('Invalid logo URL. Please enter a valid URL');
        return;
      }
    }
    
    try {
      const updated: Organization = {
        ...currentOrg,
        logoUrl: logoUrl.trim() || undefined,
        brandColor: brandColor || undefined,
      };
      await setOrganization(updated);
      setCurrentOrg(updated);
      toast.success('Branding saved successfully');
      await refreshOrganizations();
    } catch (error) {
      toast.error('Failed to save branding');
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
                    <Label htmlFor="logo-url">Logo URL</Label>
                    <Input
                      id="logo-url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-color">Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="brand-color"
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveBranding}>Save Branding</Button>
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
