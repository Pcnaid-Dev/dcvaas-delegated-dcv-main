import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle, Certificate, X, Star } from '@phosphor-icons/react';
import { createStripeCheckoutSession } from '@/lib/data';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-constants';
import { useState } from 'react';
import { toast } from 'sonner';

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
      priceId: STRIPE_PRICE_IDS.pro,
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
      priceId: STRIPE_PRICE_IDS.agency,
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

        {/* Feature Comparison */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Feature Comparison
          </h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-foreground">Feature</th>
                    <th className="text-center p-4 font-semibold text-foreground">Free</th>
                    <th className="text-center p-4 font-semibold text-foreground relative">
                      Pro
                      <Star size={16} weight="fill" className="text-yellow-500 absolute top-3 right-3" />
                    </th>
                    <th className="text-center p-4 font-semibold text-foreground">Agency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-4 text-foreground">Max Domains</td>
                    <td className="text-center p-4 text-muted-foreground">3</td>
                    <td className="text-center p-4 text-muted-foreground">15</td>
                    <td className="text-center p-4 text-muted-foreground">50</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="p-4 text-foreground">Automatic Renewals</td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-foreground">DNS-01 Validation</td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="p-4 text-foreground">API Access</td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-foreground">Team Management</td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="p-4 text-foreground">White-label Branding</td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-4 text-foreground">Single-click CNAME Setup</td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><X size={20} className="text-muted-foreground inline" /></td>
                    <td className="text-center p-4"><CheckCircle size={20} weight="fill" className="text-green-600 inline" /></td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="p-4 text-foreground">Support</td>
                    <td className="text-center p-4 text-muted-foreground">Community</td>
                    <td className="text-center p-4 text-muted-foreground">Email</td>
                    <td className="text-center p-4 text-muted-foreground">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Pricing FAQ
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                Can I change plans later?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan anytime from the Billing page. Upgrades take effect immediately, while downgrades apply at the end of your current billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                What payment methods do you accept?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor Stripe.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Is there a long-term contract?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                No. All plans are billed monthly with no long-term commitment. You can cancel anytime with no penalties.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What happens if I exceed my domain limit?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                You'll be notified when approaching your limit. To add more domains, simply upgrade to the next tier. Existing domains continue to work normally.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                Do you offer discounts for nonprofits or educational institutions?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Yes! Contact us at support@dcvaas.com with proof of nonprofit or educational status for special pricing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Card className="p-8 bg-primary/5 border-primary/20">
          <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
            Why Certificate Automation Matters Now
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-6">
            Certificate lifetimes are shrinking—from 90 days today to 47 days by
            2029. Manual renewals become impossible at scale. DCVaaS automates
            the entire lifecycle with delegated DNS-01 validation, keeping your
            certificates valid without exposing root DNS credentials.
          </p>
          <div className="text-center space-x-4">
            <Button onClick={() => onNavigate('dashboard')}>
              Get Started Free
            </Button>
            <Button variant="outline" onClick={() => onNavigate('docs')}>
              Learn More
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
