import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Certificate } from '@phosphor-icons/react';
import { createStripeCheckoutSession } from '@/lib/data';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-constants';
import { useState } from 'react';
import { toast } from 'sonner';
import { useBrand } from '@/contexts/BrandContext';

type PricingPageProps = {
  onNavigate: (page: string) => void;
};

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { brand } = useBrand();

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (planName === 'Free' || planName === 'Agency Plan') {
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

  // Use brand-specific pricing plans
  const plans = brand.pricing.plans;

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
            {brand.name === 'DelegatedSSL' ? 'Agency-Focused Pricing' : 'Simple, Transparent Pricing'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {brand.name === 'DelegatedSSL' 
              ? 'Flat-rate plans that protect your margins as you scale.'
              : 'Start free and scale as you grow. No hidden fees, cancel anytime.'}
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
            {brand.name === 'DelegatedSSL' 
              ? 'Built for Agencies & MSPs'
              : 'Why Certificate Automation Matters Now'}
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-6">
            {brand.name === 'DelegatedSSL'
              ? 'Stop absorbing SSL costs. Our flat-rate pricing lets you bundle "Premium Security Monitoring" into your maintenance packages. You pay pennies per domain; charge clients $10/mo for peace of mind. Turn SSL from a cost center into a profit center.'
              : 'Certificate lifetimes are shrinking—from 90 days today to 47 days by 2029. Manual renewals become impossible at scale. DCVaaS automates the entire lifecycle with delegated DNS-01 validation, keeping your certificates valid without exposing root DNS credentials.'}
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={() => onNavigate('docs')}>
              {brand.name === 'DelegatedSSL' ? 'See Agency Playbook' : 'Learn More About Delegated DCV'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
