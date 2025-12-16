import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Certificate } from '@phosphor-icons/react';
import { createStripeCheckoutSession } from '@/lib/data';
import { useState } from 'react';

type PricingPageProps = {
  onNavigate: (page: string) => void;
};

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (planName === 'Free') {
      onNavigate('dashboard');
      return;
    }

    setLoading(planName);
    try {
      const { url } = await createStripeCheckoutSession(priceId);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for developers and small projects',
      features: [
        'Up to 3 domains',
        'Automatic renewals',
        'DNS-01 validation',
        'Community support',
        'Basic audit logs',
      ],
      cta: 'Get Started',
      highlighted: false,
      priceId: '',
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For growing businesses and teams',
      features: [
        'Up to 15 domains',
        'All Free features',
        'API access',
        'Email support',
        'Priority renewals',
        'Custom CA support',
      ],
      cta: 'Start Trial',
      highlighted: true,
      priceId: 'price_pro_monthly',
    },
    {
      name: 'Agency',
      price: '$99',
      period: 'per month',
      description: 'For agencies and enterprises',
      features: [
        'Up to 50 domains',
        'All Pro features',
        'Team management & RBAC',
        'Single-click CNAME setup (OAuth)',
        'White-label branding',
        'Full audit logs',
        'Priority support',
        'Custom domain',
      ],
      cta: 'Contact Sales',
      highlighted: false,
      priceId: 'price_agency_monthly',
    },
  ];

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
                className="text-sm font-medium text-primary"
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
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-8 relative ${
                plan.highlighted
                  ? 'ring-2 ring-primary shadow-xl'
                  : ''
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mb-6"
                variant={plan.highlighted ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan.name, plan.priceId)}
                disabled={loading === plan.name}
              >
                {loading === plan.name ? 'Loading...' : plan.cta}
              </Button>

              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckCircle
                      size={20}
                      weight="fill"
                      className="text-success flex-shrink-0 mt-0.5"
                    />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-8 bg-muted/30">
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            Why Certificate Automation Matters Now
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-6">
            Certificate lifetimes are shrinking—from 90 days today to 47 days by
            2029. Manual renewals become impossible at scale. DCVaaS automates
            the entire lifecycle with delegated DNS-01 validation, keeping your
            certificates valid without exposing root DNS credentials.
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={() => onNavigate('docs')}>
              Learn More About Delegated DCV
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
