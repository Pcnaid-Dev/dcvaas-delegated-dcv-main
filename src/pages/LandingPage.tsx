// src/pages/LandingPage.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Certificate,
  Shield,
  ArrowsClockwise,
  CheckCircle,
  Globe,
  EnvelopeSimple,
  GithubLogo,
  TwitterLogo,
} from '@phosphor-icons/react';

type LandingPageProps = {
  onNavigate: (page: string) => void;
};

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
              <Certificate size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">DCVaaS</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => onNavigate('home')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</button>
              <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Pricing</button>
              <button onClick={() => onNavigate('docs')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Docs</button>
            </nav>
            {/* Login Button */}
            <Button onClick={() => loginWithRedirect()}>
              Log In
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl font-bold text-foreground tracking-tight">
              Secure SSL/TLS Automation via{' '}
              <span className="text-primary">Delegated DCV</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Delegate once with CNAME. We'll handle every ACME DNS-01 challenge
              securely—no root DNS API keys on your servers. Zero-touch renewals
              for the era of 47-day certificates.
            </p>
            <div className="flex items-center justify-center gap-4">
              {/* Sign Up Button */}
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('docs')}>
                Read Documentation
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Delegated DCV?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Certificate lifetimes are shrinking—from 90 days today to 47 days
              by 2029. Manual renewals are unsustainable. DCVaaS provides the
              automation you need without compromising security.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield size={24} weight="fill" className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Enhanced Security
              </h3>
              <p className="text-muted-foreground">
                No root DNS API keys on your servers. CNAME delegation isolates
                ACME challenges to a controlled subdomain, minimizing attack
                surface.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <ArrowsClockwise
                  size={24}
                  weight="fill"
                  className="text-accent"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Zero-Touch Renewals
              </h3>
              <p className="text-muted-foreground">
                Set it and forget it. Our orchestrator monitors expiration and
                triggers renewals automatically, with retry logic and dead-letter
                queue for reliability.
              </p>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Globe size={24} weight="fill" className="text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Works with Any DNS Provider
              </h3>
              <p className="text-muted-foreground">
                Simply create a CNAME record in your existing DNS setup. No
                migrations, no nameserver changes. Premium tier offers single-click
                setup via OAuth.
              </p>
            </Card>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '1',
                title: 'Add Your Domain',
                description:
                  'Enter your domain in the DCVaaS dashboard. We generate a unique CNAME target.',
              },
              {
                step: '2',
                title: 'Create CNAME Record',
                description:
                  'Add "_acme-challenge.yourdomain.com CNAME {target}" to your DNS. Takes 5-15 minutes to propagate.',
              },
              {
                step: '3',
                title: 'Verify & Issue',
                description:
                  'We verify the CNAME, publish TXT challenges to our zone, and complete ACME with your preferred CA.',
              },
              {
                step: '4',
                title: 'Automatic Renewal',
                description:
                  'Certificates renew automatically 30 days before expiration. You never touch DNS again.',
              },
            ].map((item) => (
              <Card key={item.step} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-foreground">
                      {item.step}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about delegated DCV
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                What is delegated DNS-01 validation?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Delegated DNS-01 validation allows you to prove domain ownership by creating a single CNAME record that points to our service. We then handle all future DNS-01 challenges on your behalf, without requiring your root DNS API keys.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How is this more secure than giving you my DNS credentials?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                With delegation, we can only respond to ACME challenges under the _acme-challenge subdomain. We cannot modify your production DNS records, reducing your attack surface significantly compared to sharing full DNS API access.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                What happens if DCVaaS goes down?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Your existing certificates continue to work. If our service experiences downtime during a renewal window, we have retry logic and alerts to ensure renewals complete. You can also remove the CNAME and handle validation manually at any time.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                Can I use this with my existing ACME client?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! DCVaaS works alongside your existing ACME setup. We provide both a web dashboard and REST API for integration. You can continue using certbot, acme.sh, or any other ACME client.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                What certificate authorities do you support?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We currently use Cloudflare's SSL for SaaS infrastructure, which issues certificates from trusted CAs. Support for custom CA selection is on our roadmap for Pro and Agency tiers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                How do I upgrade or downgrade my plan?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You can upgrade or downgrade anytime from the Billing page. Upgrades take effect immediately, while downgrades apply at the end of your current billing period.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="bg-primary/5 border-y border-border py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl font-bold text-foreground">
              Ready to automate your certificate lifecycle?
            </h2>
            <p className="text-lg text-muted-foreground">
              Start with 3 free domains. No credit card required.
            </p>
            <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
              Get Started Free
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Certificate size={28} weight="bold" className="text-primary" />
                <span className="text-lg font-bold text-foreground">DCVaaS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Secure SSL/TLS certificate automation via delegated DNS-01 validation.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button onClick={() => onNavigate('home')} className="hover:text-primary transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('pricing')} className="hover:text-primary transition-colors">
                    Pricing
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('docs')} className="hover:text-primary transition-colors">
                    Documentation
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:support@dcvaas.com" className="hover:text-primary transition-colors flex items-center gap-2">
                    <EnvelopeSimple size={16} />
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © 2024 DCVaaS. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <TwitterLogo size={20} weight="fill" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <GithubLogo size={20} weight="fill" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
