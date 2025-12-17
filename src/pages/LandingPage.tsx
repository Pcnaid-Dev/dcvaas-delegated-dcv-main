// src/pages/LandingPage.tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// import { useAuth } from '@/contexts/AuthContext'; // <--- You can likely remove this
import { useAuth0 } from '@auth0/auth0-react'; // <--- Ensure this is imported
import {
  Certificate,
  Shield,
  ArrowsClockwise,
  CheckCircle,
  Globe,
} from '@phosphor-icons/react';
import { TerminalWindow } from '@/components/TerminalWindow';

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
        {/* Hero Section with Split Layout */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Value Proposition */}
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight">
                Secure SSL/TLS Automation via{' '}
                <span className="text-primary">Delegated DCV</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Delegate once with CNAME. We'll handle every ACME DNS-01 challenge
                securely—no root DNS API keys on your servers. Zero-touch renewals
                for the era of 47-day certificates.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Sign Up Button */}
                <Button size="lg" onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })} className="w-full sm:w-auto">
                  Get Started Free
                </Button>
                <Button size="lg" variant="outline" onClick={() => onNavigate('docs')} className="w-full sm:w-auto">
                  Read Documentation
                </Button>
              </div>
            </div>

            {/* Right Side: Terminal Window */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur-2xl opacity-50"></div>
              <div className="relative">
                <TerminalWindow />
              </div>
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
            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
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

            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
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

            <Card className="p-6 space-y-4 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary/50">
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

        {/* Trust Signals Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Compatible With
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60 grayscale">
            <div className="text-2xl font-bold text-foreground">Cloudflare</div>
            <div className="text-2xl font-bold text-foreground">AWS Route53</div>
            <div className="text-2xl font-bold text-foreground">GoDaddy</div>
            <div className="text-2xl font-bold text-foreground">Namecheap</div>
          </div>
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
