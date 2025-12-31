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
import { useBrand } from '@/contexts/BrandContext';
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

// FAQ_ITEMS removed - now loaded from brand microcopy dynamically

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const { brand, microcopy } = useBrand();

  // If already logged in, go to dashboard
  if (isAuthenticated) {
     onNavigate('dashboard');
     return null;
  }

  // Get brand-specific link text for docs/guides
  const docsLinkText = brand.brandId === 'autocertify.net' ? 'Guides' : 'Docs';
  const docsRoute = brand.brandId === 'autocertify.net' ? 'guides' : 'docs';

  // Build FAQ items from brand microcopy
  const faqItems: Array<{ question: string; answer: string }> = [];
  for (let i = 1; i <= 5; i++) {
    const questionKey = `faq_${i}_q` as keyof typeof microcopy;
    const answerKey = `faq_${i}_a` as keyof typeof microcopy;
    if (microcopy[questionKey] && microcopy[answerKey]) {
      faqItems.push({
        question: microcopy[questionKey] as string,
        answer: microcopy[answerKey] as string,
      });
    }
  }

  // Build How It Works steps from brand microcopy
  const howToSteps: { label: string; description: string; status: "complete" | "current" | "upcoming" }[] = [];
  for (let i = 1; i <= 3; i++) {
    const stepKey = `howto_step${i}` as keyof typeof microcopy;
    if (microcopy[stepKey]) {
      howToSteps.push({
        label: `Step ${i}`,
        description: microcopy[stepKey] as string,
        status: 'complete' as const,
      });
    }
  }


    return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Certificate size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">{brand.brandName}</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => onNavigate('home')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</button>
              <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Pricing</button>
              <button onClick={() => onNavigate(docsRoute)} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{docsLinkText}</button>
            </nav>
            {/* Login Button */}
            <Button onClick={() => loginWithRedirect()}>
              Log In
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkle size={24} weight="fill" className="text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                Automated Certificate Management
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
              {microcopy.hero_headline || 'Secure SSL/TLS Automation via Delegated DCV'}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
              {microcopy.hero_subhead_line1 || 'Delegate once with CNAME. We\'ll handle every ACME DNS-01 challenge securely—no root DNS API keys on your servers.'}
              {microcopy.hero_subhead_line2 && <><br />{microcopy.hero_subhead_line2}</>}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                {microcopy.hero_primary_cta || 'Get Started Free'}
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate(docsRoute)}>
                {microcopy.hero_secondary_cta || 'Read Documentation'}
              </Button>
            </div>

            {/* Reassurance chips - brand-specific */}
            {microcopy.reassurance_chips && microcopy.reassurance_chips.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                {microcopy.reassurance_chips.map((chip, idx) => (
                  <span key={idx} className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {chip}
                  </span>
                ))}
              </div>
            )}
            
            {microcopy.hero_cta_note && (
              <p className="text-sm text-muted-foreground">{microcopy.hero_cta_note}</p>
            )}

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
            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield size={24} weight="fill" className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {brand.brandId === 'autocertify.net' ? 'Instant Security Fix' : 'Enhanced Security'}
              </h3>
              <p className="text-muted-foreground">
                {microcopy.benefit_instant || 'No root DNS API keys on your servers. CNAME delegation isolates ACME challenges to a controlled subdomain, minimizing attack surface.'}
              </p>
            </Card>

            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <ArrowsClockwise
                  size={24}
                  weight="fill"
                  className="text-accent"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {brand.brandId === 'autocertify.net' ? 'Zero Downtime' : 'Zero-Touch Renewals'}
              </h3>
              <p className="text-muted-foreground">
                {microcopy.benefit_downtime || 'Set it and forget it. Our orchestrator monitors expiration and triggers renewals automatically, with retry logic and dead-letter queue for reliability.'}
              </p>
            </Card>

            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <Globe size={24} weight="fill" className="text-success" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                {brand.brandId === 'autocertify.net' ? 'Works with Everything' : 'Works with Any DNS Provider'}
              </h3>
              <p className="text-muted-foreground">
                {microcopy.benefit_compatibility || 'Simply create a CNAME record in your existing DNS setup. No migrations, no nameserver changes. Premium tier offers single-click setup via OAuth.'}
              </p>
            </Card>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {microcopy.howto_title || 'How It Works'}
            </h2>
            <p className="text-lg text-muted-foreground">
              {brand.brandId === 'autocertify.net' 
                ? 'Get secure in minutes with our simple setup'
                : brand.brandId === 'delegatedssl.com'
                ? 'Streamlined workflow for agency teams'
                : 'API-first SSL automation'}
            </p>
          </div>

          <Card className="p-8">
            {howToSteps.length > 0 ? (
              <Stepper
                steps={howToSteps}
                orientation="vertical"
              />
            ) : (
              <Stepper
                steps={[
                  {
                    label: 'Add Your Domain',
                    description: 'Enter your domain in the dashboard',
                    status: 'complete',
                  },
                  {
                    label: 'Create CNAME Record',
                    description: 'Add the CNAME record to your DNS provider',
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
            )}
          </Card>
          {microcopy.howto_support_note && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              {microcopy.howto_support_note}
            </p>
          )}
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              {brand.brandId === 'autocertify.net' 
                ? 'Quick answers to common questions'
                : brand.brandId === 'delegatedssl.com'
                ? 'Everything agencies need to know'
                : 'Developer FAQ'}
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqItems.map((item, index) => (
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
              <span className="font-semibold text-foreground">{brand.brandName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {brand.brandName}. Secure certificate automation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
