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
        {/* Hero Section with Background Pattern */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center overflow-hidden">
          {/* Subtle dot grid background */}
          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <h1 className="text-5xl font-bold tracking-tight">
              Secure SSL/TLS Automation via{' '}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Delegated DCV
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Delegate once with CNAME. We'll handle every ACME DNS-01 challenge
              securely—no root DNS API keys on your servers. Zero-touch renewals
              for the era of 47-day certificates.
            </p>
            <div className="flex items-center justify-center gap-4">
              {/* Sign Up Button with tactile effect */}
              <Button 
                size="lg" 
                className="active:scale-95 transition-transform"
                onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
              >
                Get Started Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="active:scale-95 transition-transform"
                onClick={() => onNavigate('docs')}
              >
                Read Documentation
              </Button>
            </div>

            {/* Product Mockup Card */}
            <div className="mt-16 perspective-1000">
              <div className="transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <Card className="p-8 shadow-2xl border-2 bg-gradient-to-br from-card to-muted/30">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive"></div>
                        <div className="w-3 h-3 rounded-full bg-warning"></div>
                        <div className="w-3 h-3 rounded-full bg-success"></div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">DCVaaS Dashboard</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-success">42</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-primary">3</div>
                        <div className="text-xs text-muted-foreground">Issuing</div>
                      </div>
                      <div className="bg-muted border border-border rounded-lg p-4">
                        <div className="text-2xl font-bold text-foreground">2</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Strip */}
        <section className="border-y border-border bg-muted/30 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Trusted by teams around the world
            </p>
            <div className="flex items-center justify-center gap-12 opacity-40 grayscale">
              <div className="font-bold text-2xl">Acme Corp</div>
              <div className="font-bold text-2xl">GlobalBank</div>
              <div className="font-bold text-2xl">TechStart</div>
              <div className="font-bold text-2xl">SecureOps</div>
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

        {/* How It Works - Timeline/Stepper Style */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Four simple steps to automated certificate management
            </p>
          </div>

          <div className="relative">
            {/* Vertical timeline connector */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary via-accent to-success hidden md:block"></div>

            <div className="space-y-8">
              {[
                {
                  step: '1',
                  title: 'Add Your Domain',
                  description:
                    'Enter your domain in the DCVaaS dashboard. We generate a unique CNAME target.',
                  color: 'bg-primary',
                },
                {
                  step: '2',
                  title: 'Create CNAME Record',
                  description:
                    'Add "_acme-challenge.yourdomain.com CNAME {target}" to your DNS. Takes 5-15 minutes to propagate.',
                  color: 'bg-accent',
                },
                {
                  step: '3',
                  title: 'Verify & Issue',
                  description:
                    'We verify the CNAME, publish TXT challenges to our zone, and complete ACME with your preferred CA.',
                  color: 'bg-accent',
                },
                {
                  step: '4',
                  title: 'Automatic Renewal',
                  description:
                    'Certificates renew automatically 30 days before expiration. You never touch DNS again.',
                  color: 'bg-success',
                },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  <Card className="p-6 md:ml-20 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      {/* Step number badge */}
                      <div className={`absolute -left-4 md:-left-[4.5rem] w-12 h-12 rounded-full ${item.color} flex items-center justify-center shadow-lg z-10`}>
                        <span className="text-xl font-bold text-white">
                          {item.step}
                        </span>
                      </div>
                      <div className="flex-1 md:pl-4">
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {item.title}
                        </h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                      {/* Connector arrow for larger screens */}
                      {index < 3 && (
                        <div className="hidden md:block absolute -bottom-4 left-8 w-0.5 h-4 bg-gradient-to-b from-current to-transparent opacity-30"></div>
                      )}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
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
            <Button size="lg" onClick={() => onNavigate('dashboard')}>
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
