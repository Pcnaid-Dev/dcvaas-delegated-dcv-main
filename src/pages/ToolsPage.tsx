import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Certificate,
  Shield,
  CloudArrowDown,
  LinkSimple,
  EnvelopeSimple,
  Wrench,
} from '@phosphor-icons/react';

type ToolsPageProps = {
  onNavigate: (page: string) => void;
};

const TOOLS = [
  {
    id: 'acme-dns01-checker',
    title: 'ACME DNS-01 Readiness Check',
    description:
      'Verify _acme-challenge placement, detect CNAME delegation patterns, and identify DNS provider limitations',
    icon: Wrench,
    cta: 'Check DNS-01 Setup',
    page: 'tool-acme-dns01',
  },
  {
    id: 'tls-alpn01-tester',
    title: 'TLS-ALPN-01 Tester',
    description:
      'Test ALPN negotiation for acme-tls/1 and detect load balancer or CDN incompatibilities',
    icon: Shield,
    cta: 'Test TLS-ALPN-01',
    page: 'tool-tls-alpn01',
  },
  {
    id: 'cdn-interference',
    title: 'CDN/Proxy Interference Detector',
    description:
      'Detect Cloudflare, CDN, and proxy configurations that block HTTP-01 validation challenges',
    icon: CloudArrowDown,
    cta: 'Detect Interference',
    page: 'tool-cdn-interference',
  },
  {
    id: 'cname-chain-validator',
    title: 'DNS CNAME Chain Validator',
    description:
      'Resolve CNAME chains, detect loops, excessive depth, and NXDOMAIN issues in DNS resolution',
    icon: LinkSimple,
    cta: 'Validate CNAME Chain',
    page: 'tool-cname-chain',
  },
  {
    id: 'dnssec-health',
    title: 'DNSSEC Health Check',
    description:
      'Detect DNSSEC misconfigurations, DS/RRSIG issues, and resolver disagreements that break validation',
    icon: Shield,
    cta: 'Check DNSSEC',
    page: 'tool-dnssec',
  },
  {
    id: 'email-dcv',
    title: 'Email DCV Readiness Check',
    description:
      'Verify MX record presence, mail routing sanity, and list validation mailbox options',
    icon: EnvelopeSimple,
    cta: 'Check Email Config',
    page: 'tool-email-dcv',
  },
];

export function ToolsPage({ onNavigate }: ToolsPageProps) {
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
                onClick={() => onNavigate('tools')}
                className="text-sm font-medium text-primary"
              >
                Tools
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigate('docs')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Docs
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            SSL/TLS Validation Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Free diagnostic tools to help you understand and troubleshoot
            certificate validation challenges
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onNavigate(tool.page)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <Icon size={32} weight="duotone" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(tool.page);
                  }}
                >
                  {tool.cta}
                </Button>
              </Card>
            );
          })}
        </div>

        <Card className="p-8 bg-primary/5 border-primary/20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Tired of troubleshooting validation issues?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              DCVaaS eliminates the complexity of certificate validation. One
              CNAME record handles all ACME challenges automatically, with no
              manual intervention required.
            </p>
            <Button size="lg" onClick={() => onNavigate('home')}>
              Get Started with DCVaaS
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
