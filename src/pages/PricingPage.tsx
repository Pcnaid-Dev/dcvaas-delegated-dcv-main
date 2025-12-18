import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Certificate, Key } from '@phosphor-icons/react';
import { createStripeCheckoutSession } from '@/lib/data';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-constants';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useBrand } from '@/components/ThemeProvider';

type PricingPageProps = {
  onNavigate: (page: string) => void;
};

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { brand } = useBrand();

  // Update document title based on brand
  useEffect(() => {
    document.title = `Pricing - ${brand.name}`;
  }, [brand]);

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
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Unknown error';
      toast.error('Failed to start checkout', {
        description: errorMessage,
      });
      setLoading(null);
    }
  };

  // Use brand-specific pricing
  const plans = [
    {
      name: brand.pricing.free.name,
      price: brand.pricing.free.price,
      period: 'forever',
      description: brand.id === 'keylessssl' 
        ? 'For developers and personal projects' 
        : 'Perfect for developers and small projects',
      features: brand.pricing.free.features,
      cta: 'Get Started',
      highlighted: false,
      priceId: '',
    },
    {
      name: brand.pricing.pro.name,
      price: brand.pricing.pro.price,
      period: 'per month',
      description: brand.id === 'keylessssl'
        ? 'For production workloads and APIs'
        : 'For growing businesses and teams',
      features: brand.pricing.pro.features,
      cta: brand.id === 'keylessssl' ? 'Get API Key' : 'Start Trial',
      highlighted: true,
      priceId: STRIPE_PRICE_IDS.pro,
    },
    // Agency plan (only for DCVaaS brand)
    ...(brand.id === 'dcvaas' ? [{
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
      priceId: STRIPE_PRICE_IDS.agency,
    }] : []),
  ];

  const HeaderIcon = brand.id === 'keylessssl' ? Key : Certificate;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2"
            >
              <HeaderIcon size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">{brand.name}</span>
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
            {brand.id === 'keylessssl' 
              ? 'Why Your DNS Keys Should Stay in Your Vault' 
              : 'Why Certificate Automation Matters Now'}
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-6">
            {brand.id === 'keylessssl'
              ? 'To automate wildcard SSL today, you expose AWS Route53 or Cloudflare Global API keys on web servers. One compromised server = entire DNS zone gone. KeylessSSL uses delegated CNAME validation: your root keys never leave your infrastructure.'
              : 'Certificate lifetimes are shrinking—from 90 days today to 47 days by 2029. Manual renewals become impossible at scale. DCVaaS automates the entire lifecycle with delegated DNS-01 validation, keeping your certificates valid without exposing root DNS credentials.'}
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={() => onNavigate('docs')}>
              {brand.id === 'keylessssl' ? 'Read the Quickstart' : 'Learn More About Delegated DCV'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
