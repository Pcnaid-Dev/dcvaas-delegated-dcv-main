import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Certificate } from '@phosphor-icons/react';

type DocsPageProps = {
  onNavigate: (page: string) => void;
};

export function DocsPage({ onNavigate }: DocsPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2"
            >
              <Certificate size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">DCVaaS</span>
            </button>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => onNavigate('home')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigate('docs')}
                className="text-sm font-medium text-primary"
              >
                Docs
              </button>
              <button
                onClick={() => onNavigate('csr-decoder')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                CSR Decoder
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Documentation
          </h1>
          <p className="text-xl text-muted-foreground">
            Learn how to automate SSL/TLS certificates with delegated DCV
          </p>
        </div>

        <Tabs defaultValue="quickstart" className="space-y-8">
          <TabsList>
            <TabsTrigger value="quickstart">Quickstart</TabsTrigger>
            <TabsTrigger value="concepts">Concepts</TabsTrigger>
            <TabsTrigger value="api">API Reference</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Quickstart Guide
              </h2>
              <div className="space-y-4 text-foreground">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    1. Sign In and Create Organization
                  </h3>
                  <p className="text-muted-foreground">
                    Sign in with your GitHub account and create a new
                    organization to manage your certificates.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    2. Add Your First Domain
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    In the dashboard, click "Add Domain" and enter your domain
                    name (e.g., example.com).
                  </p>
                  <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                    Domain: example.com
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    3. Create CNAME Record
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Add the generated CNAME record to your DNS:
                  </p>
                  <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                    _acme-challenge.example.com CNAME abc123.acme.dcvaas-verify.com
                  </pre>
                  <p className="text-muted-foreground mt-2">
                    DNS propagation typically takes 5-15 minutes.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    4. Verify and Issue
                  </h3>
                  <p className="text-muted-foreground">
                    Click "Check DNS" to verify the CNAME, then "Start
                    Issuance" to obtain your certificate. Renewals happen
                    automatically 30 days before expiration.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="concepts" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Understanding Delegated DCV
              </h2>
              <div className="space-y-6 text-foreground">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    What is Delegated Domain Control Validation?
                  </h3>
                  <p className="text-muted-foreground">
                    Delegated DCV allows you to prove domain ownership for SSL/TLS
                    certificates without exposing your root DNS API credentials. By
                    creating a one-time CNAME record, you delegate validation
                    authority to DCVaaS for the _acme-challenge subdomain only.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    DNS-01 Challenge
                  </h3>
                  <p className="text-muted-foreground">
                    The DNS-01 challenge is an ACME validation method where you
                    prove domain ownership by publishing a specific TXT record.
                    Unlike HTTP-01, DNS-01 works for wildcard certificates and
                    doesn't require a public web server.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Why This Matters: 47-Day Certificates
                  </h3>
                  <p className="text-muted-foreground">
                    Certificate Authority Browser Forum is reducing max
                    certificate lifetime from 398 days (2020) to 90 days (2024)
                    and eventually 47 days (2029). Manual renewals become
                    impossible—automation is essential. DCVaaS provides secure,
                    reliable automation without security compromises.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                API Reference
              </h2>
              <p className="text-muted-foreground mb-6">
                Programmatic access to DCVaaS (Pro and Agency plans).
              </p>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Authentication
                  </h3>
                  <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                    Authorization: Bearer YOUR_API_TOKEN
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    POST /api/domains
                  </h3>
                  <p className="text-muted-foreground mb-2">Create a new domain.</p>
                  <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
{`{
  "domainName": "example.com"
}`}
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    GET /api/domains
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    List all domains with optional status filter.
                  </p>
                  <pre className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                    GET /api/domains?status=active
                  </pre>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    POST /api/domains/:id/issue
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Trigger certificate issuance for a domain.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Webhook Events
              </h2>
              <p className="text-muted-foreground mb-6">
                Configure webhooks to receive real-time notifications about certificate lifecycle events, DNS operations, and job failures.
              </p>

              <div className="space-y-6 text-foreground">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Available Events</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Certificate Lifecycle</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">domain.active</code>
                          <span className="text-muted-foreground">Certificate has been successfully issued and is active</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">domain.error</code>
                          <span className="text-muted-foreground">Certificate issuance or renewal has failed</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">domain.expiring_soon</code>
                          <span className="text-muted-foreground">Certificate will expire within 30 days</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">domain.renewed</code>
                          <span className="text-muted-foreground">Certificate has been successfully renewed</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">DNS Operations</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">dns.verified</code>
                          <span className="text-muted-foreground">DNS CNAME record has been verified</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">dns.check_failed</code>
                          <span className="text-muted-foreground">DNS CNAME verification has failed</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Job Queue</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">job.failed</code>
                          <span className="text-muted-foreground">Background job has failed after all retries</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <code className="font-mono bg-muted px-2 py-1 rounded text-xs">job.dlq</code>
                          <span className="text-muted-foreground">Job has been moved to dead letter queue</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Payload Structure</h3>
                  <p className="text-muted-foreground mb-3">
                    Each webhook request includes a JSON payload with event details:
                  </p>
                  <pre className="bg-muted p-4 rounded font-mono text-xs overflow-x-auto">
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
                  <h3 className="text-lg font-semibold mb-2">Signature Verification</h3>
                  <p className="text-muted-foreground mb-3">
                    Each webhook request includes an <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">X-DCVaaS-Signature</code> header. 
                    Verify it using HMAC-SHA256 with your webhook secret:
                  </p>
                  <pre className="bg-muted p-4 rounded font-mono text-xs overflow-x-auto">
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
}

// Express.js middleware
app.post('/webhooks/dcvaas', (req, res) => {
  const signature = req.headers['x-dcvaas-signature'];
  const isValid = verifyWebhook(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook event
  const { event, data } = req.body;
  console.log(\`Received event: \${event}\`, data);
  
  res.status(200).json({ received: true });
});`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Best Practices</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Respond with 2xx status code within 5 seconds to acknowledge receipt</li>
                    <li>Process webhook events asynchronously in a background queue</li>
                    <li>Always verify the signature before processing the payload</li>
                    <li>Implement idempotent handlers - events may be delivered more than once</li>
                    <li>Monitor your webhook endpoint and disable it if consistently failing</li>
                    <li>Store webhook secrets securely in environment variables</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Retry Behavior</h3>
                  <p className="text-muted-foreground">
                    If your endpoint returns an error (non-2xx status code) or times out, DCVaaS will retry delivery with exponential backoff:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                    <li>Attempt 1: Immediately</li>
                    <li>Attempt 2: After 1 minute</li>
                    <li>Attempt 3: After 5 minutes</li>
                    <li>Attempt 4: After 15 minutes</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    After 4 failed attempts, the webhook will be automatically disabled and you'll receive a notification.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Production Architecture
              </h2>
              <div className="space-y-6 text-foreground">
                <p className="text-muted-foreground">
                  This Spark implements the DCVaaS control plane with stubs for
                  certificate issuance. Production deployment uses Cloudflare
                  Workers for the backend orchestration.
                </p>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Components</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">API Worker (Hono):</strong>{' '}
                      REST API endpoints with D1 database
                    </li>
                    <li>
                      <strong className="text-foreground">Queue + Consumer Worker:</strong>{' '}
                      Async job processing with retry and DLQ
                    </li>
                    <li>
                      <strong className="text-foreground">ACME Client:</strong>{' '}
                      Certificate issuance with acme-client library
                    </li>
                    <li>
                      <strong className="text-foreground">Cron Triggers:</strong>{' '}
                      Daily renewal checks for expiring certificates
                    </li>
                    <li>
                      <strong className="text-foreground">CA Failover:</strong>{' '}
                      Let's Encrypt primary, ZeroSSL backup
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Security</h3>
                  <p className="text-muted-foreground">
                    OAuth tokens are encrypted at rest using AES-GCM. In
                    production, encryption keys are stored in Cloudflare's Secret
                    Store and decryption happens in Workers. No plaintext secrets
                    are persisted.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
