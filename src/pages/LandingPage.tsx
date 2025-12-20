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
import { getBrandConfig } from '@/lib/brand';
import {
  Certificate,
  Shield,
  ArrowsClockwise,
  CheckCircle,
  Globe,
  Sparkle,
  Lock,
  Lightning,
  Key,
} from '@phosphor-icons/react';

type LandingPageProps = {
  onNavigate: (page: string) => void;
};

const FAQ_ITEMS = [
  {
    question: 'What is delegated DNS-01 validation?',
    answer: 'Delegated DNS-01 validation allows you to prove domain ownership by creating a single CNAME record that points to our service. We then handle all ACME challenges without requiring your root DNS API keys, significantly improving security.',
  },
  {
    question: 'Do I need to provide DNS API credentials?',
    answer: "No! That's the beauty of delegated validation. You only need to create a single CNAME record in your DNS. Our service handles all ACME challenges without accessing your DNS provider's API.",
  },
  {
    question: 'How often are certificates renewed?',
    answer: "Certificates are automatically renewed 30 days before expiration. With the upcoming shift to 47-day certificate lifetimes, our automated renewal system ensures you'll never have an expired certificate.",
  },
  {
    question: 'What DNS providers are supported?',
    answer: 'All DNS providers are supported! Since you only need to create a CNAME record, the service works with any DNS provider including Cloudflare, Route 53, Google Cloud DNS, and traditional registrar DNS services.',
  },
  {
    question: 'Is there a free tier?',
    answer: 'Yes! Our free tier includes 3 domains with automated certificate issuance and renewal. Perfect for personal projects or trying out the service before upgrading.',
  },
  {
    question: 'Can I use this for wildcard certificates?',
    answer: "Yes! The service supports both single-domain and wildcard certificates. Wildcard certificates require DNS-01 validation, which is exactly what our delegated validation system is designed for.",
  },
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const brand = getBrandConfig();

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
              <Shield size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">{brand.displayName}</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#architecture" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Architecture</a>
              <a href="#integration" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Integration</a>
              <a href="#pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Pricing</a>
              <button onClick={() => onNavigate('docs')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Docs</button>
            </nav>
            {/* Login Button */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => loginWithRedirect()}>
                Sign In
              </Button>
              <Button onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                {brand.features.pricingCta}
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
              <Lock size={20} weight="fill" className="text-primary" />
              <span className="text-sm font-mono font-semibold text-primary uppercase tracking-wider">
                No DNS API Keys in CI/CD • Built for 47-Day Renewal Cycles • Cloudflare Edge Execution
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              {brand.features.heroCopy}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
              {brand.displayName} automates wildcard TLS via Delegated DCV. Delegate <code className="font-mono text-secondary">_acme-challenge</code> once (CNAME). 
              Your high-privilege DNS credentials stay air-gapped in your vault. <strong>Add one CNAME. Ship renewals forever.</strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                {brand.features.pricingCta}
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('docs')}>
                View Integration
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card. Key shown once. Tokens are hashed server-side. Rotate any time.
            </p>

{/* Terminal Window Animation */}
            <div className="mt-16 relative">
              <div className="mx-auto max-w-4xl transform scale-100 hover:scale-105 transition-transform duration-500 shadow-2xl rounded-lg overflow-hidden">
                <TerminalWindow />
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-y border-border bg-muted/20">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider">
              Trusted by Teams Worldwide
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
              {/* Placeholder logos - replace with actual logos */}
              {['Company A', 'Company B', 'Company C', 'Company D'].map((name) => (
                <div key={name} className="text-muted-foreground font-semibold text-lg">
                  {name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {brand.features.problemTitle}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Root DNS API keys on build agents/app servers/k8s secrets is a zone takeover waiting to happen. 
              <strong className="text-danger"> If one server is compromised, your entire DNS zone is gone.</strong>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4 border-primary/20 bg-primary-weak-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield size={28} weight="fill" className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Air-Gapped Validation
              </h3>
              <p className="text-muted-foreground">
                Delegate only <code className="font-mono text-secondary">_acme-challenge</code>. 
                Root keys never touch {brand.displayName}, your servers, or CI. Zero DNS API credentials in production.
              </p>
            </Card>

            <Card className="p-6 space-y-4 border-warning/20 bg-warning-weak">
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
              <p className="text-muted-foreground">
                Designed for high-frequency renewals. No cron glue. Cloudflare handles certificate rotation at the edge. 
                You get predictable, boring renewals.
              </p>
            </Card>

            <Card className="p-6 space-y-4 border-secondary/20 bg-secondary-weak">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Lightning size={28} weight="fill" className="text-secondary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Cloudflare-Powered Reliability
              </h3>
              <p className="text-muted-foreground">
                Validation runs at the edge. Predictable execution. Enterprise-grade uptime without the enterprise price tag. 
                Built on Cloudflare's global network.
              </p>
            </Card>
          </div>
        </section>

        {/* Architecture/Integration Section */}
        <section id="integration" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-muted/20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {brand.features.architectureTitle}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three steps. One CNAME. Forever automated.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Four simple steps to automated SSL/TLS certificates
            </p>
          </div>

          <Card className="p-8">
            <Stepper
              steps={[
                {
                  label: 'Add Your Domain',
                  description: 'Enter your domain in the DCVaaS dashboard',
                  status: 'complete',
                },
                {
                  label: 'Create CNAME Record',
                  description: 'Add the CNAME record to your DNS provider',
                  status: 'complete',
                },
                {
                  label: 'Verify & Issue',
                  description: 'We verify and issue your certificate',
                  status: 'complete',
                },
                {
                  label: 'Auto-Renewal',
                  description: 'Certificates renew automatically',
                  status: 'complete',
                },
              ]}
              orientation="vertical"
            />
          </Card>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-muted/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pricing that doesn't punish automation
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, transparent pricing. No hidden fees. No surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Hacker Plan */}
            <Card className="p-8 space-y-6 border-2 border-border hover:border-primary/50 transition-all">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Hacker</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Up to 3 domains</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Wildcards included</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Delegated DCV</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Community queue</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Standard rate limits</span>
                </li>
              </ul>
              <Button className="w-full" size="lg" variant="outline" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                Get API Key — Free
              </Button>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 space-y-6 border-2 border-primary bg-primary/5 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Popular
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Pro</h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-bold text-foreground">$15</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Up to 50 domains</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Wildcards included</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Priority queue</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Higher rate limits</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle size={20} weight="fill" className="text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">Team access + audit events</span>
                </li>
              </ul>
              <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                Start Pro
              </Button>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Cheaper than BrandSSL's $29/mo starter</span> — without shipping your root keys.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about DCVaaS
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
        <section className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              Ready to automate your certificate lifecycle?
            </h2>
            <p className="text-xl text-muted-foreground">
              Start with 3 free domains. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                <Lightning size={20} weight="fill" className="mr-2" />
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('pricing')}>
                View Pricing
              </Button>
            </div>
            <div className="pt-6 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>3 free domains</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>5 min setup</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Certificate size={24} weight="bold" className="text-primary" />
              <span className="font-semibold text-foreground">DCVaaS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DCVaaS. Secure certificate automation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
