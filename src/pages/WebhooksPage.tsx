import { useState, useEffect } from 'react';
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
import { generateWebhookSecret } from '@/lib/crypto';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getWebhooks, createWebhook as apiCreateWebhook, deleteWebhook as apiDeleteWebhook, updateWebhookEnabled as apiUpdateWebhookEnabled } from '@/lib/data';

type WebhooksPageProps = {
  onNavigate: (page: string) => void;
};

const AVAILABLE_EVENTS = [
  {
    name: 'domain.active',
    description: 'Certificate has been successfully issued and is active',
    category: 'Certificate Lifecycle',
  },
  {
    name: 'domain.error',
    description: 'Certificate issuance or renewal has failed',
    category: 'Certificate Lifecycle',
  },
  {
    name: 'domain.expiring_soon',
    description: 'Certificate will expire within 30 days',
    category: 'Certificate Lifecycle',
  },
  {
    name: 'domain.renewed',
    description: 'Certificate has been successfully renewed',
    category: 'Certificate Lifecycle',
  },
  {
    name: 'domain.added',
    description: 'New domain has been added to organization',
    category: 'Domain Management',
  },
  {
    name: 'domain.removed',
    description: 'Domain has been removed from organization',
    category: 'Domain Management',
  },
  {
    name: 'dns.verified',
    description: 'DNS CNAME record has been verified',
    category: 'DNS Operations',
  },
  {
    name: 'dns.check_failed',
    description: 'DNS CNAME verification has failed',
    category: 'DNS Operations',
  },
  {
    name: 'job.failed',
    description: 'Background job has failed after all retries',
    category: 'Job Queue',
  },
  {
    name: 'job.dlq',
    description: 'Job has been moved to dead letter queue',
    category: 'Job Queue',
  },
];

export function WebhooksPage({ onNavigate }: WebhooksPageProps) {
  const { currentOrg } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[],
  });

  const hasApiAccess = currentOrg && PLAN_LIMITS[currentOrg.subscriptionTier].apiAccess;

  // Load webhooks from API on mount
  useEffect(() => {
    if (!hasApiAccess) return;
    
    const loadWebhooks = async () => {
      try {
        const data = await getWebhooks();
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

  const orgWebhooks = webhooks;

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

    try {
      const secret = generateWebhookSecret();
      const webhook = await apiCreateWebhook(newWebhook.url, secret, newWebhook.events);

      setWebhooks((current) => [...current, webhook]);
      setIsCreateOpen(false);
      setNewWebhook({ url: '', events: [] });
      toast.success('Webhook endpoint created');

      setTimeout(() => {
        toast.info('Save your webhook secret securely - it will only be shown once', {
          duration: 8000,
        });
      }, 500);
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    }
  };

  const handleDeleteWebhook = async () => {
    if (!deleteWebhookId) return;

    try {
      await apiDeleteWebhook(deleteWebhookId);
      setWebhooks((current) => current.filter((wh) => wh.id !== deleteWebhookId));
      setDeleteWebhookId(null);
      toast.success('Webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleToggleEnabled = async (webhookId: string, enabled: boolean) => {
    // Optimistic UI update: update state immediately
    const previousWebhooks = webhooks;
    setWebhooks((current) =>
      current.map((wh) => (wh.id === webhookId ? { ...wh, enabled } : wh))
    );
    toast.success(enabled ? 'Webhook enabled' : 'Webhook disabled');

    try {
      await apiUpdateWebhookEnabled(webhookId, enabled);
    } catch (error) {
      // Revert on error
      console.error('Failed to update webhook:', error);
      setWebhooks(previousWebhooks);
      toast.error('Failed to update webhook');
    }
  };

  const toggleEventSelection = (eventName: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(eventName)
        ? prev.events.filter((e) => e !== eventName)
        : [...prev.events, eventName],
    }));
  };

  const toggleSecretVisibility = (webhookId: string) => {
    setRevealedSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(webhookId)) {
        newSet.delete(webhookId);
      } else {
        newSet.add(webhookId);
      }
      return newSet;
    });
  };

  const groupedEvents = AVAILABLE_EVENTS.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = [];
    }
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_EVENTS>);

  if (!hasApiAccess) {
    return (
      <AppShell onNavigate={onNavigate} currentPage="webhooks">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Webhooks</h1>
            <p className="text-muted-foreground mt-1">
              Configure webhook endpoints for domain event notifications
            </p>
          </div>

          <Card className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Bell size={32} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Webhooks require Pro plan</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upgrade to Pro or Agency to receive real-time notifications about certificate
                  lifecycle events, DNS operations, and job failures.
                </p>
              </div>
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
            <p className="text-muted-foreground mt-1">
              Configure webhook endpoints for domain event notifications
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={20} className="mr-2" />
                Add Endpoint
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Webhook Endpoint</DialogTitle>
                <DialogDescription>
                  Add a new webhook endpoint to receive real-time notifications about domain events.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://api.example.com/webhooks/dcvaas"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    POST requests will be sent to this URL with event data
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label>Events to Subscribe</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select which events should trigger this webhook
                    </p>
                  </div>

                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                      <div className="space-y-2">
                        {events.map((event) => (
                          <div key={event.name} className="flex items-start gap-3">
                            <Checkbox
                              id={`event-${event.name}`}
                              checked={newWebhook.events.includes(event.name)}
                              onCheckedChange={() => toggleEventSelection(event.name)}
                            />
                            <div className="flex-1 space-y-1">
                              <Label
                                htmlFor={`event-${event.name}`}
                                className="text-sm font-mono cursor-pointer"
                              >
                                {event.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Security:</strong> Each webhook receives a unique signing secret. Use it
                    to verify webhook authenticity by validating the{' '}
                    <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                      X-DCVaaS-Signature
                    </code>{' '}
                    header.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWebhook}>Create Endpoint</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Bell size={32} className="text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">Loading webhooks...</p>
            </div>
          </Card>
        ) : orgWebhooks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Bell size={32} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No webhook endpoints configured</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create your first webhook endpoint to receive real-time notifications about
                  certificate lifecycle events, DNS operations, and job failures.
                </p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus size={20} className="mr-2" />
                Add Endpoint
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {orgWebhooks.map((webhook) => (
              <Card key={webhook.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold break-all">{webhook.url}</h3>
                        <Badge variant={webhook.enabled ? 'default' : 'secondary'}>
                          {webhook.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(webhook.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(enabled) => handleToggleEnabled(webhook.id, enabled)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteWebhookId(webhook.id)}
                      >
                        <Trash size={18} className="text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Signing Secret</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type={revealedSecrets.has(webhook.id) ? 'text' : 'password'}
                        value={webhook.secret}
                        readOnly
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleSecretVisibility(webhook.id)}
                      >
                        {revealedSecrets.has(webhook.id) ? (
                          <EyeSlash size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </Button>
                      <CopyButton text={webhook.secret} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this secret to validate webhook signatures. Include it in your webhook
                      handler to verify requests originate from DCVaaS.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Subscribed Events ({webhook.events.length})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((eventName) => (
                        <Badge key={eventName} variant="outline" className="font-mono text-xs">
                          {eventName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-6 bg-muted/50">
          <h3 className="text-lg font-semibold mb-4">Webhook Implementation Guide</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Payload Structure</h4>
              <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs font-mono">
                {`{
  "event": "domain.active",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "domain_id": "dom_abc123",
    "domain_name": "example.com",
    "status": "active",
    "expires_at": "2024-04-15T10:30:00Z"
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Signature Verification</h4>
              <p className="text-muted-foreground mb-2">
                Each webhook request includes an{' '}
                <code className="font-mono bg-background px-1 py-0.5 rounded">
                  X-DCVaaS-Signature
                </code>{' '}
                header. Verify it using HMAC-SHA256:
              </p>
              <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs font-mono">
                {`// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac)
  );
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Best Practices</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Respond with 2xx status code within 5 seconds to acknowledge receipt</li>
                <li>Process webhook events asynchronously in a background queue</li>
                <li>Always verify the signature before processing the payload</li>
                <li>Implement idempotent handlers - events may be delivered more than once</li>
                <li>Monitor your webhook endpoint and disable it if consistently failing</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook endpoint?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will stop receiving notifications for this endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWebhook}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
