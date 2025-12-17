import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Users, UserPlus, CheckCircle, Clock, Crown } from '@phosphor-icons/react';

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

  // Define table columns
  const columns: Column<Membership>[] = [
    {
      key: 'email',
      header: 'Member',
      sortable: true,
      render: (member) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-foreground">{member.email}</p>
            {(member.userId === user?.id || member.email === user?.email) && (
              <p className="text-xs text-muted-foreground">(You)</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (member) => (
        <div className="flex items-center gap-2">
          {member.role === 'owner' && <Crown size={16} className="text-yellow-600" />}
          <Badge variant={getRoleBadgeVariant(member.role)}>
            {member.role}
          </Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (member) => (
        <div className="flex items-center gap-2">
          {member.status === 'active' ? (
            <>
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-foreground">Active</span>
            </>
          ) : (
            <>
              <Clock size={16} className="text-yellow-600" />
              <span className="text-sm text-muted-foreground">Pending Invite</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (member) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {member.status === 'invited' && member.email === user?.email && (
            <Button
              size="sm"
              onClick={() => handleAcceptInvitation(member)}
              disabled={accepting === member.id}
            >
              {accepting === member.id ? 'Accepting...' : 'Accept'}
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
      ),
    },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="team">
      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Manage team members and their permissions"
          actions={
            hasAccess && canInvite && (
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus size={20} weight="bold" className="mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
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
            )
          }
        />

        {!hasAccess ? (
          <Card className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Team Management
              </h3>
              <p className="text-muted-foreground mb-6">
                Upgrade to the Agency plan to unlock team collaboration features.
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-foreground mb-3">
                  Agency Plan includes:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Invite unlimited team members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Role-based access control (Owner, Admin, Member)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>Comprehensive audit logging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span>White-label branding options</span>
                  </li>
                </ul>
              </div>
              <Button onClick={() => onNavigate('billing')}>
                Upgrade to Agency
              </Button>
            </div>
          </Card>
        ) : (
          <DataTable
            data={members}
            columns={columns}
            searchKey="email"
            searchPlaceholder="Search members..."
            emptyState={
              <EmptyState
                icon={<Users size={48} weight="thin" />}
                title="No team members"
                description="Invite team members to collaborate on certificate management with role-based permissions."
                action={
                  canInvite
                    ? {
                        label: 'Invite Member',
                        onClick: () => setInviteDialogOpen(true),
                      }
                    : undefined
                }
              />
            }
          />
        )}
      </div>

    </AppShell>
  );
}
