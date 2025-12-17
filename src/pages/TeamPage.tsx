import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { PLAN_LIMITS, type Membership, type MemberRole } from '@/types';
import { useState, useEffect } from 'react';
import { getOrgMembers, inviteOrgMember, removeOrgMember } from '@/lib/data';
import { toast } from 'sonner';

type TeamPageProps = {
  onNavigate: (page: string) => void;
};

export function TeamPage({ onNavigate }: TeamPageProps) {
  const { currentOrg, user, userRole } = useAuth();
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  if (!currentOrg) return null;

  const hasAccess = PLAN_LIMITS[currentOrg.subscriptionTier].teamAccess;
  const canInvite = userRole === 'owner' || userRole === 'admin';
  const isOwner = userRole === 'owner';

  // Load members
  useEffect(() => {
    async function loadMembers() {
      if (currentOrg && hasAccess) {
        try {
          const data = await getOrgMembers(currentOrg.id);
          setMembers(data);
        } catch (err) {
          console.error('Failed to load members', err);
          toast.error('Failed to load team members');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
    loadMembers();
  }, [currentOrg?.id, hasAccess]);

  const handleInvite = async () => {
    if (!inviteEmail || !currentOrg) return;

    setInviting(true);
    try {
      const newMember = await inviteOrgMember(currentOrg.id, inviteEmail, inviteRole);
      setMembers([...members, newMember]);
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (err: any) {
      console.error('Failed to invite member', err);
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: Membership) => {
    if (!currentOrg) return;
    if (!confirm(`Remove ${member.email} from the organization?`)) return;

    try {
      await removeOrgMember(currentOrg.id, member.userId);
      setMembers(members.filter(m => m.id !== member.id));
      toast.success(`${member.email} has been removed`);
    } catch (err: any) {
      console.error('Failed to remove member', err);
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleAcceptInvitation = async (member: Membership) => {
    if (!currentOrg || !user) return;
    
    setAccepting(member.id);
    try {
      const { acceptOrgInvitation } = await import('@/lib/data');
      await acceptOrgInvitation(currentOrg.id, user.id, member.email);
      
      // Reload members to show updated status
      const updatedMembers = await getOrgMembers(currentOrg.id);
      setMembers(updatedMembers);
      
      toast.success('Invitation accepted! You are now an active member.');
    } catch (err: any) {
      console.error('Failed to accept invitation', err);
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(null);
    }
  };

  const getRoleBadgeVariant = (role: MemberRole): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
    }
  };

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
                Team Members ({members.length})
              </h3>
              {canInvite && (
                <Button onClick={() => setInviteDialogOpen(true)}>
                  Invite Member
                </Button>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members yet
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{member.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.status === 'invited' ? 'Invitation pending' : 'Active member'}
                        {(member.userId === user?.id || member.email === user?.email) && ' (You)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      {member.status === 'invited' && member.email === user?.email && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptInvitation(member)}
                          disabled={accepting === member.id}
                        >
                          {accepting === member.id ? 'Accepting...' : 'Accept Invitation'}
                        </Button>
                      )}
                      {canInvite && member.userId !== user?.id && member.email !== user?.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member - Can view and manage domains</SelectItem>
                  <SelectItem value="admin">Admin - Can manage members and domains</SelectItem>
                  {isOwner && (
                    <SelectItem value="owner">Owner - Full access</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
