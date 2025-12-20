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
import { getBrand } from '@/hooks/useBrandTheme';
import { getBrandCopy } from '@/lib/brand-copy';
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

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { loginWithRedirect, isAuthenticated } = useAuth0(); // <--- USE THE HOOK
  const brand = getBrand();
  const copy = getBrandCopy(brand);

  // If already logged in, go to dashboard
  if (isAuthenticated) {
     onNavigate('dashboard');
     return null;
  }


    return (
    <div className="min-h-screen bg-background">
      {/* Trust Bar for AutoCertify */}
      {brand === 'autocertify' && (
        <div className="bg-primary text-on-primary py-2 px-4 text-center text-sm">
          <span>{copy.trustBarText}</span>
          {copy.trustBarSecure && (
            <>
              <span className="mx-2">·</span>
              <span>{copy.trustBarSecure}</span>
            </>
          )}
        </div>
      )}
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Certificate size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">{copy.brandName}</span>
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
        {/* Hero Section */}
        <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 ${brand === 'autocertify' ? 'section-mint' : ''}`}>
          <div className="text-center">
            {brand === 'dcvaas' && (
              <div className="flex items-center justify-center gap-2 mb-6">
                <Sparkle size={24} weight="fill" className="text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Automated Certificate Management
                </span>
              </div>
            )}
            <h1 className={`font-bold text-foreground tracking-tight mb-6 ${brand === 'autocertify' ? 'marketing-h1' : 'text-5xl md:text-6xl'}`}>
              {brand === 'autocertify' ? (
                copy.heroHeadline
              ) : (
                <>
                  Secure SSL/TLS Automation via{' '}
                  <span className="text-primary">Delegated DCV</span>
                </>
              )}
            </h1>
            <p className={`text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-4 ${brand === 'autocertify' ? 'marketing-body' : 'text-xl'}`}>
              {copy.heroSubheadPrimary}
            </p>
            {copy.heroSubheadSecondary && (
              <p className={`text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-6 ${brand === 'autocertify' ? 'marketing-body' : 'text-xl'}`}>
                {copy.heroSubheadSecondary}
              </p>
            )}
            
            {/* Reassurance chips for AutoCertify */}
            {brand === 'autocertify' && copy.reassuranceChips.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {copy.reassuranceChips.map((chip, idx) => (
                  <span key={idx} className="reassurance-chip">
                    {chip}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className={brand === 'autocertify' ? 'min-h-[44px] bg-primary hover:bg-primary-hover text-on-primary' : ''}>
                {copy.heroPrimaryCTA}
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate(brand === 'autocertify' ? 'pricing' : 'docs')}>
                {copy.heroSecondaryCTA}
              </Button>
            </div>
            
            {copy.heroCTAMicrocopy && (
              <p className="text-sm text-muted-foreground mb-12">
                {copy.heroCTAMicrocopy}
              </p>
            )}

{/* Terminal Window Animation */}
            {brand === 'dcvaas' && (
              <div className="mt-16 relative">
                <div className="mx-auto max-w-4xl transform scale-100 hover:scale-105 transition-transform duration-500 shadow-2xl rounded-lg overflow-hidden">
                  <TerminalWindow />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Trusted By Section - Only for DCVaaS */}
        {brand === 'dcvaas' && (
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
        )}

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {brand === 'autocertify' ? 'Why AutoCertify?' : 'Why Delegated DCV?'}
            </h2>
            {brand === 'dcvaas' && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Certificate lifetimes are shrinking—from 90 days today to 47 days
                by 2029. Manual renewals are unsustainable. DCVaaS provides the
                automation you need without compromising security.
              </p>
            )}
          </div>

          <div className={`grid gap-8 ${copy.benefits.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {copy.benefits.map((benefit, idx) => (
              <Card key={idx} className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  {idx === 0 && <Shield size={24} weight="fill" className="text-primary" />}
                  {idx === 1 && <ArrowsClockwise size={24} weight="fill" className="text-primary" />}
                  {idx === 2 && <Globe size={24} weight="fill" className="text-primary" />}
                  {idx === 3 && <Lock size={24} weight="fill" className="text-primary" />}
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {copy.howItWorksTitle}
            </h2>
            {brand === 'dcvaas' && (
              <p className="text-lg text-muted-foreground">
                Four simple steps to automated SSL/TLS certificates
              </p>
            )}
          </div>

          <Card className="p-8">
            <Stepper
              steps={copy.steps.map(step => ({
                label: step.label,
                description: step.description,
                status: 'complete',
              }))}
              orientation={brand === 'autocertify' ? 'horizontal' : 'vertical'}
            />
          </Card>
          
          {copy.howItWorksSupportMicrocopy && (
            <p className="text-center text-muted-foreground mt-6">
              {copy.howItWorksSupportMicrocopy}
            </p>
          )}
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {copy.faqTitle}
            </h2>
            <p className="text-lg text-muted-foreground">
              {copy.faqSubtitle}
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {copy.faqItems.map((item, index) => (
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
        <section className={`border-y border-border py-20 ${brand === 'autocertify' ? 'bg-surface' : 'bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10'}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-4xl font-bold text-foreground">
              {brand === 'autocertify' ? 'Ready to secure your site?' : 'Ready to automate your certificate lifecycle?'}
            </h2>
            <p className="text-xl text-muted-foreground">
              {brand === 'autocertify' ? copy.pricingLine : 'Start with 3 free domains. No credit card required.'}
            </p>
            {brand === 'autocertify' && copy.pricingFeatures.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                {copy.pricingFeatures.map((feature, idx) => (
                  <span key={idx} className="text-muted-foreground">{feature}</span>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className={brand === 'autocertify' ? 'min-h-[44px] bg-primary hover:bg-primary-hover text-on-primary' : ''}>
                {brand === 'autocertify' && <Lightning size={20} weight="fill" className="mr-2" />}
                {copy.pricingCTA || 'Get Started Free'}
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('pricing')}>
                View Pricing
              </Button>
            </div>
            {brand === 'dcvaas' && (
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
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/30 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Certificate size={24} weight="bold" className="text-primary" />
              <span className="font-semibold text-foreground">{copy.brandName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 {copy.brandName}. {brand === 'autocertify' ? 'Your site, secured.' : 'Secure certificate automation.'}
            </p>
            {brand === 'autocertify' && (
              <div className="flex gap-4 text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary">Privacy</a>
                <a href="#" className="hover:text-primary">Terms</a>
                <a href="mailto:support@autocertify.com" className="hover:text-primary">Support</a>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
