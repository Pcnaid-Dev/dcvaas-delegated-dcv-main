import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { WebhookEndpoint } from '@/types';
import { PLAN_LIMITS } from '@/types';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash, Copy, Eye, EyeSlash, Bell } from '@phosphor-icons/react';
import { CopyButton } from '@/components/CopyButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getOrgWebhooks, 
  createWebhook, 
  updateWebhook, 
  deleteWebhook 
} from '@/lib/data';

type WebhooksPageProps = {
  onNavigate: (page: string) => void;
};

const AVAILABLE_EVENTS = [
  { name: 'domain.active', description: 'Certificate has been successfully issued and is active', category: 'Certificate Lifecycle' },
  { name: 'domain.error', description: 'Certificate issuance or renewal has failed', category: 'Certificate Lifecycle' },
  { name: 'domain.expiring_soon', description: 'Certificate will expire within 30 days', category: 'Certificate Lifecycle' },
  { name: 'domain.renewed', description: 'Certificate has been successfully renewed', category: 'Certificate Lifecycle' },
  { name: 'domain.added', description: 'New domain has been added to organization', category: 'Domain Management' },
  { name: 'domain.removed', description: 'Domain has been removed from organization', category: 'Domain Management' },
  { name: 'dns.verified', description: 'DNS CNAME record has been verified', category: 'DNS Operations' },
  { name: 'dns.check_failed', description: 'DNS CNAME verification has failed', category: 'DNS Operations' },
  { name: 'job.failed', description: 'Background job has failed after all retries', category: 'Job Queue' },
  { name: 'job.dlq', description: 'Job has been moved to dead letter queue', category: 'Job Queue' },
];

export function WebhooksPage({ onNavigate }: WebhooksPageProps) {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] });

  const hasApiAccess = currentOrg && PLAN_LIMITS[currentOrg.subscriptionTier].apiAccess;

  // Fetch webhooks with React Query
  const { data: orgWebhooks = [], isLoading } = useQuery({
  const { data: orgWebhooksData = [] } = useQuery({
    queryKey: ['webhooks', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgWebhooks() : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 30000,
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error('No organization');
      return createWebhook(newWebhook.url, newWebhook.events);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      setNewWebhookSecret(result.webhook.secret);
      setNewWebhook({ url: '', events: [] });
      setIsCreateOpen(false);
      toast.success('Webhook endpoint created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create webhook');
    },
  });

  useEffect(() => {
    if (!hasApiAccess) return;
    const loadWebhooks = async () => {
      try {
        const data = await getOrgWebhooks();
        setWebhooks(data);
      } catch (error) {
        console.error('Failed to load webhooks:', error);
        toast.error('Failed to load webhooks');
      } finally {
        setIsLoading(false);
      }
    };
    loadWebhooks();
  }, [hasApiAccess]);

  const handleCreateWebhook = async () => {
    if (!currentOrg) return;
    if (!newWebhook.url.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }
    if (!newWebhook.url.startsWith('http://') && !newWebhook.url.startsWith('https://')) {
      toast.error('Webhook URL must start with http:// or https://');
      return;
    }
    if (newWebhook.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }
    createWebhookMutation.mutate();
  };

  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      setDeleteWebhookId(null);
      toast.success('Webhook deleted');
    },
    onError: () => {
      toast.error('Failed to delete webhook');
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete webhook');
    }
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ webhookId, enabled }: { webhookId: string; enabled: boolean }) =>
      updateWebhook(webhookId, { enabled }),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      toast.success(enabled ? 'Webhook enabled' : 'Webhook disabled');
    },
    onError: () => {
      toast.error('Failed to update webhook');
    }
  });

  const handleDeleteWebhook = async () => {
    if (!deleteWebhookId) return;
    deleteWebhookMutation.mutate(deleteWebhookId);
  };

  const handleToggleEnabled = async (webhookId: string, enabled: boolean) => {
    updateWebhookMutation.mutate({ webhookId, enabled });
  };

  const toggleEventSelection = (eventName: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(eventName) ? prev.events.filter((e) => e !== eventName) : [...prev.events, eventName],
    }));
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setRevealedSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(webhookId)) newSet.delete(webhookId);
      else newSet.add(webhookId);
      return newSet;
    });
  };

  const groupedEvents = AVAILABLE_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_EVENTS>);

  if (!hasApiAccess) {
    return (
      <AppShell onNavigate={onNavigate} currentPage="webhooks">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Webhooks</h1>
            <p className="text-muted-foreground mt-1">Configure webhook endpoints for domain event notifications</p>
          </div>
          <Card className="p-8">
            <div className="text-center space-y-4">
              <Bell size={32} className="text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Webhooks require Pro plan</h3>
              <p className="text-muted-foreground max-w-md mx-auto">Upgrade to receive notifications.</p>
              <Button onClick={() => onNavigate('billing')}>Upgrade Plan</Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell onNavigate={onNavigate} currentPage="webhooks">
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Webhooks</h1>
            <p className="text-muted-foreground mt-1">Configure webhook endpoints for domain event notifications</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus size={20} className="mr-2" />Add Endpoint</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Webhook Endpoint</DialogTitle>
                <DialogDescription>Add a new webhook endpoint.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input id="webhook-url" type="url" value={newWebhook.url} onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })} />
                <Separator />
                <Label>Events to Subscribe</Label>
                {Object.entries(groupedEvents).map(([category, events]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-semibold">{category}</h4>
                    {events.map((event) => (
                      <div key={event.name} className="flex items-start gap-3">
                        <Checkbox checked={newWebhook.events.includes(event.name)} onCheckedChange={() => toggleEventSelection(event.name)} />
                        <Label className="text-sm font-mono">{event.name}</Label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateWebhook}>Create Endpoint</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p>Loading webhooks...</p>
        ) : orgWebhooksData.length === 0 ? (
          <Card className="p-12 text-center"><Button onClick={() => setIsCreateOpen(true)}>Add Endpoint</Button></Card>
        ) : (
          <div className="space-y-4">
            {orgWebhooksData.map((webhook) => (
              <Card key={webhook.id} className="p-6">
                <div className="flex justify-between">
                  <h3 className="font-semibold">{webhook.url}</h3>
                  <div className="flex gap-2">
                    <Switch checked={webhook.enabled} onCheckedChange={(enabled) => handleToggleEnabled(webhook.id, enabled)} />
                    <Button variant="ghost" onClick={() => setDeleteWebhookId(webhook.id)}><Trash className="text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete webhook?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}