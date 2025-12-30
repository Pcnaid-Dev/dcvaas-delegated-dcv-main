import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { CopyButton } from '@/components/CopyButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { useAuth } from '@/hooks/useAuth';
import { createWebhook, deleteWebhook, getOrgWebhooks, updateWebhook } from '@/lib/data';
import { PLAN_LIMITS } from '@/types';

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

type NewWebhookState = {
  url: string;
  events: string[];
};

export function WebhooksPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [newWebhook, setNewWebhook] = useState<NewWebhookState>({ url: '', events: [] });
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const hasApiAccess = Boolean(currentOrg && PLAN_LIMITS[currentOrg.subscriptionTier].apiAccess);

  // Fetch webhooks with React Query (org-scoped cache key)
  const { data: orgWebhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks', currentOrg?.id],
    queryFn: () => getOrgWebhooks(),
    enabled: Boolean(currentOrg && hasApiAccess),
    staleTime: 30_000,
  });

  const createWebhookMutation = useMutation({
    mutationFn: (payload: { url: string; events: string[] }) => createWebhook(payload.url, payload.events),
    onSuccess: (result) => {
      setNewWebhookSecret(result.webhook.secret);
      setNewWebhook({ url: '', events: [] });
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      toast.success('Webhook endpoint created');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create webhook');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      setDeleteWebhookId(null);
      toast.success('Webhook deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete webhook');
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ webhookId, enabled }: { webhookId: string; enabled: boolean }) =>
      updateWebhook(webhookId, { enabled }),
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', currentOrg?.id] });
      toast.success(enabled ? 'Webhook enabled' : 'Webhook disabled');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update webhook');
    },
  });

  const handleCreateWebhook = () => {
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

    createWebhookMutation.mutate({ url: newWebhook.url.trim(), events: newWebhook.events });
  };

  const handleDeleteWebhook = () => {
    if (!deleteWebhookId) return;
    deleteWebhookMutation.mutate(deleteWebhookId);
  };

  const handleUpdateWebhook = (webhookId: string, enabled: boolean) => {
    updateWebhookMutation.mutate({ webhookId, enabled });
  };

  const handleRevealSecret = (webhookId: string, secret?: string) => {
    if (!secret) {
      toast.error('Secret not available. Secrets are only shown on creation.');
      return;
    }
    setRevealedSecrets((prev) => ({ ...prev, [webhookId]: !prev[webhookId] }));
  };

  if (!hasApiAccess) {
    // If your product wants a loading state here, you can add it,
    // but keeping behavior consistent with existing UI:
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Webhooks are available on Pro and Agency plans.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Upgrade your plan to enable webhook notifications and integrate with your systems.
            </p>
            <Button onClick={() => onNavigate('billing')}>View Plans</Button>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>What you get with Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Event-driven notifications (domain lifecycle, DNS verification, job failures)</li>
              <li>Secure webhook secrets for signature verification</li>
              <li>Enable/disable endpoints anytime</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Receive real-time notifications when events occur in your DCVaaS account.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Webhook</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Configure a webhook URL to receive event notifications.
              </DialogDescription>
            </DialogHeader>

            {newWebhookSecret && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Webhook Secret (copy now)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs break-all bg-muted px-2 py-1 rounded">
                        {newWebhookSecret}
                      </code>
                      <CopyButton value={newWebhookSecret} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This secret is shown only once on creation.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhooks/dcvaas"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>

              <div>
                <Label>Events</Label>
                <div className="mt-2 space-y-3">
                  {['Certificate Lifecycle', 'Domain Management', 'DNS Operations', 'Job Queue'].map((category) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm">{category}</h4>
                      <div className="space-y-2 pl-4">
                        {AVAILABLE_EVENTS.filter((event) => event.category === category).map((event) => (
                          <div key={event.name} className="flex items-start space-x-2">
                            <Checkbox
                              id={event.name}
                              checked={newWebhook.events.includes(event.name)}
                              onCheckedChange={(checked) => {
                                setNewWebhook((prev) => ({
                                  ...prev,
                                  events: checked
                                    ? [...prev.events, event.name]
                                    : prev.events.filter((e) => e !== event.name),
                                }));
                              }}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={event.name}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {event.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWebhook}
                  disabled={createWebhookMutation.isPending}
                >
                  {createWebhookMutation.isPending ? 'Creating...' : 'Create Webhook'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading webhooks…</div>
          ) : orgWebhooks.length === 0 ? (
            <div className="text-muted-foreground">No webhook endpoints configured.</div>
          ) : (
            <div className="space-y-4">
              {orgWebhooks.map((webhook: any) => (
                <div key={webhook.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{webhook.url}</code>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            webhook.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {webhook.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {webhook.events?.length || 0} events subscribed
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateWebhook(webhook.id, !webhook.enabled)}
                        disabled={updateWebhookMutation.isPending}
                      >
                        {webhook.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteWebhookId(webhook.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {webhook.secret && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevealSecret(webhook.id, webhook.secret)}
                      >
                        {revealedSecrets[webhook.id] ? 'Hide Secret' : 'Reveal Secret'}
                      </Button>

                      {revealedSecrets[webhook.id] && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs break-all bg-muted px-2 py-1 rounded">
                            {webhook.secret}
                          </code>
                          <CopyButton value={webhook.secret} />
                        </div>
                      )}
                    </div>
                  )}

                  {deleteWebhookId === webhook.id && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <p className="text-sm text-muted-foreground flex-1">
                        Are you sure you want to delete this webhook?
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteWebhook}
                        disabled={deleteWebhookMutation.isPending}
                      >
                        {deleteWebhookMutation.isPending ? 'Deleting...' : 'Confirm'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteWebhookId(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Subscribed Events</h4>
                    <div className="flex flex-wrap gap-1">
                      {(webhook.events || []).map((eventName: string) => (
                        <span key={eventName} className="text-xs bg-muted px-2 py-1 rounded">
                          {eventName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Webhooks are delivered as HTTP POST requests with JSON payloads. Verify the webhook secret
            to ensure requests are authentic.
          </p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Example Payload</h4>
            <pre className="bg-muted p-4 rounded text-xs overflow-auto">
{JSON.stringify(
  {
    event: 'domain.active',
    timestamp: new Date().toISOString(),
    data: {
      domainId: 'domain_123',
      domain: 'example.com',
      status: 'active',
    },
  },
  null,
  2
)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
