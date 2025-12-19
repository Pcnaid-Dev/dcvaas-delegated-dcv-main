// src/pages/LandingPage.tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAuth0 } from '@auth0/auth0-react';
import { Stepper } from '@/components/common';
import { TerminalWindow } from '@/components/TerminalWindow';
// import { useAuth } from '@/contexts/AuthContext'; // <--- You can likely remove this
import {
  Certificate,
  Shield,
  ArrowsClockwise,
  CheckCircle,
  Globe,
  Sparkle,
  Lock,
  Lightning,
} from '@phosphor-icons/react';

type LandingPageProps = {
  onNavigate: (page: string) => void;
};

const FAQ_ITEMS = [
  {
    question: 'What is delegated DCV?',
    answer: 'Delegated Domain Control Validation uses a CNAME record to prove domain ownership. You add _acme-challenge.yourdomain.com → keylessssl.dev once. KeylessSSL handles all future ACME DNS-01 challenges without your DNS provider credentials. Zero root access required.',
  },
  {
    question: 'Do I need DNS API keys?',
    answer: 'No. That is the security model. One CNAME delegates only the _acme-challenge subdomain. Cloudflare Custom Hostname API provisions certificates. Your DNS provider API tokens never touch our infrastructure.',
  },
  {
    question: 'How does 47-day renewal readiness work?',
    answer: 'Certificate lifetimes are shrinking from 90 days (today) to 47 days (2029). KeylessSSL edge-based orchestration handles automatic renewals 30 days before expiration. Workers + Queues + retry logic ensure certificates never lapse.',
  },
  {
    question: 'Which DNS providers work?',
    answer: 'All providers. CNAME records are universal. Cloudflare, Route 53, Google Cloud DNS, registrar DNS—any provider that supports CNAME delegation works with KeylessSSL.',
  },
  {
    question: 'What is the free tier?',
    answer: 'Free tier: 3 domains, full automation, API access. Pro tier ($15/mo): unlimited domains. Hacker tier targets developers building multi-tenant SaaS platforms with custom domain features.',
  },
  {
    question: 'Wildcard certificate support?',
    answer: 'Yes. Wildcard certificates (*.yourdomain.com) require DNS-01 validation. KeylessSSL delegated DCV model is purpose-built for DNS-01 challenges without credential exposure.',
  },
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { loginWithRedirect, isAuthenticated } = useAuth0(); // <--- USE THE HOOK

  // If already logged in, go to dashboard
  if (isAuthenticated) {
     onNavigate('dashboard');
     return null;
  }


    return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground font-mono">KeylessSSL</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#architecture" className="text-sm font-medium text-foreground hover:text-secondary transition-colors">Architecture</a>
              <a href="#integration" className="text-sm font-medium text-foreground hover:text-secondary transition-colors">Integration</a>
              <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-foreground hover:text-secondary transition-colors">Pricing</button>
              <button onClick={() => onNavigate('docs')} className="text-sm font-medium text-foreground hover:text-secondary transition-colors">Docs</button>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => loginWithRedirect()} className="text-muted-foreground">
                Sign In
              </Button>
              <Button onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className="btn-primary">
                Get API Key — Free for 3 Domains
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield size={20} weight="fill" className="text-primary" />
              <span className="kicker text-primary">
                Air-Gapped Validation
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
              Delegated DCV, not{' '}
              <span className="text-primary">delegated trust</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
              DNS-01 ACME challenges without root DNS credentials. Add one CNAME, get certificates forever. 
              Built for SaaS platforms facing 47-day renewal cycles.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className="btn-primary">
                <Lock size={20} weight="fill" className="mr-2" />
                Get API Key — Free for 3 Domains
              </Button>
              <Button size="lg" variant="ghost" onClick={() => onNavigate('docs')} className="btn-ghost">
                See Integration
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="font-mono">Cloudflare-Powered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="font-mono">47-Day Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="font-mono">Zero Root Keys</span>
              </div>
            </div>

{/* Terminal Window Animation */}
            <div className="mt-16 relative">
              <div className="mx-auto max-w-4xl transform scale-100 hover:scale-105 transition-transform duration-500 shadow-2xl rounded-lg overflow-hidden">
                <TerminalWindow />
              </div>
            </div>
          </div>
        </section>

        {/* Root Key Vulnerability Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-y border-border">
          <div className="alert-danger">
            <div className="flex items-start gap-4">
              <Warning size={24} weight="fill" className="text-danger mt-1 flex-shrink-0" />
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  Root Key Vulnerability
                </h2>
                <p className="text-foreground leading-relaxed">
                  Traditional certbot + DNS API workflows store provider credentials on application servers. 
                  Compromise = full DNS takeover. Rate limits block your entire zone. Token rotation breaks pipelines.
                </p>
                <p className="text-muted-foreground text-sm font-mono">
                  CNAME delegation scopes validation to <code className="text-secondary">_acme-challenge</code> only. 
                  Zero lateral movement. Zero blast radius.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <span className="kicker text-secondary mb-4 block">Architecture</span>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Three Pillars of Air-Gapped DCV
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cloudflare edge execution. DNS-01 without DNS API keys. Predictable 47-day renewal readiness.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card p-6 space-y-4 transition-all duration-300 hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield size={28} weight="fill" className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Air-Gapped Validation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                DNS-01 challenges without DNS provider credentials. One CNAME delegates only 
                <code className="text-secondary font-mono text-sm"> _acme-challenge.*</code> 
                subdomain. Zero root access.
              </p>
            </Card>

            <Card className="card p-6 space-y-4 transition-all duration-300 hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <ArrowsClockwise
                  size={28}
                  weight="fill"
                  className="text-warning"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                47-Day Renewal Readiness
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Automated renewal orchestration. Edge-scheduled workers + queue-based retries. 
                Built for certificate lifetimes shrinking to 47 days by 2029.
              </p>
            </Card>

            <Card className="card p-6 space-y-4 transition-all duration-300 hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Globe size={28} weight="fill" className="text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Cloudflare-Powered Reliability
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Edge network execution. D1 database for audit trail. Workers + Queues for async processing. 
                Predictable validation paths.
              </p>
            </Card>
          </div>
        </section>

        {/* Integration Section */}
        <section id="integration" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border">
          <div className="text-center mb-12">
            <span className="kicker text-secondary mb-4 block">Integration</span>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Four Steps to Automated Certificates
            </h2>
            <p className="text-lg text-muted-foreground">
              Add domain → Delegate CNAME → Verify → Issue. Renewals stay boring.
            </p>
          </div>

          <Card className="card p-8">
            <Stepper
              steps={[
                {
                  label: 'Generate API Key',
                  description: 'Create account. Generate API key (scoped, hashed, shown once). Free for 3 domains.',
                  status: 'complete',
                },
                {
                  label: 'Add CNAME Delegation',
                  description: 'Add one CNAME: _acme-challenge.yourdomain.com → keylessssl.dev',
                  status: 'complete',
                },
                {
                  label: 'Domain Goes Verified',
                  description: 'Edge worker validates CNAME propagation. Status: pending_cname → active.',
                  status: 'complete',
                },
                {
                  label: 'First Cert Issued',
                  description: 'Cloudflare Custom Hostname API provisions certificate. Renewals automated forever.',
                  status: 'complete',
                },
              ]}
              orientation="vertical"
            />
          </Card>
          
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => onNavigate('docs')} className="btn-ghost">
              View Full Integration Guide
            </Button>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border">
          <div className="text-center mb-12">
            <span className="kicker text-secondary mb-4 block">FAQ</span>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Technical specifics on delegated DCV
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={`item-${index + 1}`}
                value={`item-${index + 1}`}
                className="border rounded-lg px-6"
              >
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-y border-border py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              Stop managing DNS credentials.
            </h2>
            <p className="text-xl text-muted-foreground">
              One CNAME. Infinite renewals. Zero root keys.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className="btn-primary">
                <Lock size={20} weight="fill" className="mr-2" />
                Get API Key — Free for 3 Domains
              </Button>
              <Button size="lg" variant="ghost" onClick={() => onNavigate('pricing')} className="btn-ghost">
                View Pricing
              </Button>
            </div>
            <div className="pt-6 flex items-center justify-center gap-8 text-sm font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="text-muted-foreground">API-First</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="text-muted-foreground">3 Free Domains</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-primary" />
                <span className="text-muted-foreground">Edge Execution</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock size={24} weight="bold" className="text-primary" />
                <span className="font-bold text-foreground font-mono">KeylessSSL</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Delegated DCV for SaaS platforms. Built on Cloudflare's edge network.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Product</h4>
              <nav className="flex flex-col gap-2">
                <button onClick={() => onNavigate('pricing')} className="text-sm text-muted-foreground hover:text-secondary transition-colors text-left">Pricing</button>
                <button onClick={() => onNavigate('docs')} className="text-sm text-muted-foreground hover:text-secondary transition-colors text-left">Docs</button>
                <a href="#architecture" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Architecture</a>
              </nav>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Resources</h4>
              <nav className="flex flex-col gap-2">
                <a href="/api-reference" className="text-sm text-muted-foreground hover:text-secondary transition-colors">API Reference</a>
                <a href="/security" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Security</a>
                <a href="/status" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Status</a>
              </nav>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Legal</h4>
              <nav className="flex flex-col gap-2">
                <a href="/terms" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Terms</a>
                <a href="/privacy" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Privacy</a>
                <a href="/contact" className="text-sm text-muted-foreground hover:text-secondary transition-colors">Contact</a>
              </nav>
            </div>
          </div>
          
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground text-center font-mono">
              © 2024 keylessssl.dev — Delegated DCV, not delegated trust.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
