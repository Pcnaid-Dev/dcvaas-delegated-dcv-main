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
  const { brand, microcopy } = useBrand();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (planName === 'Free') {
      window.location.href = `https://${brand.appHost}`;
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

  // Brand-specific pricing plans
  const getPlansForBrand = () => {
    if (brand.brandId === 'autocertify.net') {
      return [
        {
          name: 'Business Pro',
          price: '$15',
          period: 'per month',
          description: microcopy.plan_name || 'Secure up to 50 custom domains',
          features: (microcopy.plan_includes as string || '')
            .split('·')
            .map(f => f.trim())
            .filter(f => f),
          cta: microcopy.pricing_cta || 'Secure My Site Now',
          highlighted: true,
          priceId: STRIPE_PRICE_IDS.pro,
        },
      ];
    } else if (brand.brandId === 'delegatedssl.com') {
      return [
        {
          name: 'Agency',
          price: '$79',
          period: 'per month',
          description: 'Up to 250 client domains with flat-rate pricing',
          features: [
            'Up to 250 domains',
            'White-label branding',
            'Client management dashboard',
            'Automated renewals',
            'Email support',
            'Bulk import',
          ],
          cta: 'Start Agency Trial',
          highlighted: true,
          priceId: STRIPE_PRICE_IDS.agency,
        },
        {
          name: 'Enterprise',
          price: '$299',
          period: 'per month',
          description: '2000+ domains with SLA guarantees',
          features: [
            'Unlimited domains',
            'All Agency features',
            '99.9% uptime SLA',
            'Priority support',
            'Custom integrations',
            'Dedicated account manager',
          ],
          cta: 'Contact Sales',
          highlighted: false,
          priceId: '',
        },
      ];
    } else {
      // KeylessSSL
      return [
        {
          name: 'Free',
          price: '$0',
          period: 'forever',
          description: 'For developers and small projects',
          features: [
            'Up to 3 domains',
            'API access',
            'Basic rate limits',
            'Community support',
            'Webhook notifications',
          ],
          cta: 'Get Started',
          highlighted: false,
          priceId: '',
        },
        {
          name: 'Pro',
          price: '$29',
          period: 'per month',
          description: 'For production applications',
          features: [
            'Up to 50 domains',
            'All Free features',
            'Higher rate limits',
            'Priority API access',
            'Email support',
            'Advanced webhooks',
          ],
          cta: 'Start Trial',
          highlighted: true,
          priceId: STRIPE_PRICE_IDS.pro,
        },
      ];
    }
  };

  const plans = getPlansForBrand();

  // Get brand-specific link text for docs/guides
  const docsLinkText = brand.brandId === 'autocertify.net' ? 'Guides' : 'Docs';
  const docsRoute = brand.brandId === 'autocertify.net' ? 'guides' : 'docs';

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
              <span className="text-xl font-bold text-foreground">{brand.brandName}</span>
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
                onClick={() => onNavigate(docsRoute)}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {docsLinkText}
              </button>
              <Button onClick={() => window.location.href = `https://${brand.appHost}`}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {brand.brandId === 'autocertify.net' 
              ? 'Simple, Affordable SSL Protection'
              : brand.brandId === 'delegatedssl.com'
              ? 'Flat-Rate Pricing for Agencies'
              : 'Developer-Friendly Pricing'}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {microcopy.pricing_line || 'Start free and scale as you grow. No hidden fees, cancel anytime.'}
          </p>
        </div>

        <div className={`grid ${plans.length === 1 ? 'max-w-lg mx-auto' : plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'} gap-8 mb-16`}>
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
