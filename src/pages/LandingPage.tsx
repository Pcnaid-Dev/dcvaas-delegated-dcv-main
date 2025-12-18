// src/pages/LandingPage.tsx
import { useEffect } from 'react';
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
import { useBrand } from '@/components/ThemeProvider';
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
  Vault,
} from '@phosphor-icons/react';

type LandingPageProps = {
  onNavigate: (page: string) => void;
};

// Brand-specific FAQ items
const getFAQItems = (brandId: string) => {
  if (brandId === 'keylessssl') {
    return [
      {
        question: 'Why is certbot technical debt?',
        answer: 'Managing stateful ACME clients on stateless containers (Kubernetes/Serverless) is a nightmare of persistent volume claims and race conditions. KeylessSSL acts as your stateless sidecar. You define the domain in your DB; we handle the crypto at the Edge.',
      },
      {
        question: 'What happens to my DNS root keys?',
        answer: 'Your root DNS API keys never leave your vault. You delegate only the _acme-challenge subdomain via CNAME. We handle ACME challenges in an air-gapped environment. If a server is compromised, your DNS zone stays secure.',
      },
      {
        question: 'How does the 47-day future affect me?',
        answer: 'Browser vendors are pushing for 47-day certificate lifespans by 2029. Manual cron jobs and stateful clients will break under 8x renewal velocity. Our infrastructure is designed for this future.',
      },
      {
        question: 'Is this cheaper than other solutions?',
        answer: 'Yes. Our Pro plan is $15/mo for 50 domains vs BrandSSL\'s $29/mo starter. We leverage Cloudflare\'s Edge for Enterprise-grade reliability without the Enterprise price tag.',
      },
      {
        question: 'Can I use this for wildcard certificates?',
        answer: 'Absolutely. Wildcard certificates require DNS-01 validation, which is exactly what delegated CNAME validation provides. One CNAME record handles all subdomains.',
      },
      {
        question: 'Do I need to integrate with my CI/CD pipeline?',
        answer: 'Our API-first design makes integration simple. Define domains in your database, call our API, and we handle the rest. No need to manage ACME client state in your containers.',
      },
    ];
  }
  
  // Default DCVaaS FAQ
  return [
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
      answer: 'All DNS providers are supported! Since you only need to create a CNAME record, DCVaaS works with any DNS provider including Cloudflare, Route 53, Google Cloud DNS, and traditional registrar DNS services.',
    },
    {
      question: 'Is there a free tier?',
      answer: 'Yes! Our free tier includes 3 domains with automated certificate issuance and renewal. Perfect for personal projects or trying out the service before upgrading to Pro or Agency plans.',
    },
    {
      question: 'Can I use this for wildcard certificates?',
      answer: "Yes! DCVaaS supports both single-domain and wildcard certificates. Wildcard certificates require DNS-01 validation, which is exactly what our delegated validation system is designed for.",
    },
  ];
};

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const { brand } = useBrand();
  const faqItems = getFAQItems(brand.id);

  // Update document title and meta description based on brand
  useEffect(() => {
    document.title = brand.seo.title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', brand.seo.description);
  }, [brand]);

  // If already logged in, go to dashboard
  if (isAuthenticated) {
     onNavigate('dashboard');
     return null;
  }

  // Brand-specific icon for header
  const HeaderIcon = brand.id === 'keylessssl' ? Key : Certificate;
  const heroIcon = brand.id === 'keylessssl' ? Lock : Sparkle;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeaderIcon size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">{brand.name}</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => onNavigate('home')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Home</button>
              <button onClick={() => onNavigate('pricing')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Pricing</button>
              <button onClick={() => onNavigate('docs')} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Docs</button>
            </nav>
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
              {heroIcon === Lock ? <Lock size={24} weight="fill" className="text-primary" /> : <Sparkle size={24} weight="fill" className="text-primary" />}
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                {brand.id === 'keylessssl' ? 'Security-First SSL Automation' : 'Automated Certificate Management'}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight mb-6">
              {brand.hero.title.includes('Leaking') ? (
                <>
                  {brand.hero.title.split('Root Keys')[0]}
                  <span className="text-primary">Root Keys</span>
                  {brand.hero.title.split('Root Keys')[1]}
                </>
              ) : (
                <>
                  {brand.hero.title.split('Delegated DCV')[0]}
                  <span className="text-primary">Delegated DCV</span>
                </>
              )}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
              {brand.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                {brand.hero.cta}
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('docs')}>
                {brand.id === 'keylessssl' ? 'Read the Quickstart' : 'Read Documentation'}
              </Button>
            </div>

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

        {/* Problem/Solution Section */}
        {brand.id === 'keylessssl' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {brand.problem.title}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {brand.problem.description}
              </p>
            </div>
          </section>
        )}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {brand.solution.title}
            </h2>
            {brand.id !== 'keylessssl' && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {brand.problem.description}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {brand.solution.pillars.map((pillar, index) => {
              const icons = [
                brand.id === 'keylessssl' ? Vault : Shield,
                ArrowsClockwise,
                brand.id === 'keylessssl' ? Lightning : Globe
              ];
              const Icon = icons[index];
              const colors = ['primary', 'accent', 'success'];
              const color = colors[index];
              
              return (
                <Card key={index} className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
                  <div className={`w-12 h-12 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                    <Icon size={24} weight="fill" className={`text-${color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {pillar.description}
                  </p>
                </Card>
              );
            })}
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

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about {brand.name}
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
              {brand.id === 'keylessssl' 
                ? 'Ready to secure your infrastructure?' 
                : 'Ready to automate your certificate lifecycle?'}
            </h2>
            <p className="text-xl text-muted-foreground">
              {brand.id === 'keylessssl'
                ? 'Start with the Hacker plan. 3 free domains. No credit card required.'
                : 'Start with 3 free domains. No credit card required.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}>
                <Lightning size={20} weight="fill" className="mr-2" />
                {brand.hero.cta}
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
                <span>{brand.pricing.free.domains} free domains</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>{brand.id === 'keylessssl' ? 'API-first' : '5 min setup'}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HeaderIcon size={24} weight="bold" className="text-primary" />
              <span className="font-semibold text-foreground">{brand.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {brand.name}. {brand.id === 'keylessssl' ? 'Air-gapped SSL automation.' : 'Secure certificate automation.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
