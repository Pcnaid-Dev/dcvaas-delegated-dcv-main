import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, CreditCard, Receipt, Star } from '@phosphor-icons/react';
import { PLAN_LIMITS } from '@/types';
import { createStripeCheckoutSession } from '@/lib/data';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-constants';
import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getOrgDomains } from '@/lib/data';

type BillingPageProps = {
  onNavigate: (page: string) => void;
};

export function BillingPage({ onNavigate }: BillingPageProps) {
  const { currentOrg } = useAuth();
  const [loading, setLoading] = useState(false);

  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 10000,
  });

  if (!currentOrg) return null;

  const handleUpgrade = async (tier: 'pro' | 'agency') => {
    setLoading(true);
    try {
      const priceId = STRIPE_PRICE_IDS[tier];
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
      setLoading(false);
    }
  };

  const planLimits = PLAN_LIMITS[currentOrg.subscriptionTier];
  const usagePercentage = (domains.length / planLimits.maxDomains) * 100;

  const plans = [
    {
      tier: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      priceId: '',
      features: ['Up to 3 domains', 'Automatic renewals', 'DNS-01 validation', 'Community support'],
    },
    {
      tier: 'pro',
      name: 'Pro',
      price: '$29',
      period: 'per month',
      priceId: STRIPE_PRICE_IDS.pro,
      popular: true,
      features: ['Up to 15 domains', 'API access', 'Priority renewals', 'Email support'],
    },
    {
      tier: 'agency',
      name: 'Agency',
      price: '$99',
      period: 'per month',
      priceId: STRIPE_PRICE_IDS.agency,
      features: [
        'Up to 50 domains',
        'Team management & RBAC',
        'White-label branding',
        'Single-click CNAME setup',
        'Full audit logs',
        'Priority support',
      ],
    },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="billing">
      <div className="space-y-8">
        <PageHeader
          title="Billing & Subscription"
          description="Manage your subscription, usage, and payment details"
        />

        {/* Current Plan Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Current Plan
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-lg px-3 py-1 capitalize">
                  {currentOrg.subscriptionTier}
                </Badge>
                {currentOrg.subscriptionTier === 'pro' && (
                  <Star size={16} weight="fill" className="text-yellow-500" />
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">
                {plans.find((p) => p.tier === currentOrg.subscriptionTier)?.price}
              </p>
              <p className="text-sm text-muted-foreground">
                {plans.find((p) => p.tier === currentOrg.subscriptionTier)?.period}
              </p>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Domain Usage
                </span>
                <span className="text-sm text-muted-foreground">
                  {domains.length} of {planLimits.maxDomains} domains
                </span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
          </div>

          {/* Plan Features */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Included Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {plans
                .find((p) => p.tier === currentOrg.subscriptionTier)
                ?.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle
                      size={16}
                      weight="fill"
                      className="text-green-600 flex-shrink-0"
                    />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Upgrade Actions */}
          {currentOrg.subscriptionTier !== 'agency' && (
            <div className="pt-4 border-t border-border">
              <div className="flex gap-2">
                {currentOrg.subscriptionTier === 'free' && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleUpgrade('pro')}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Upgrade to Pro'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpgrade('agency')}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Upgrade to Agency'}
                    </Button>
                  </>
                )}
                {currentOrg.subscriptionTier === 'pro' && (
                  <Button
                    variant="default"
                    onClick={() => handleUpgrade('agency')}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Upgrade to Agency'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Pricing Comparison */}
        {currentOrg.subscriptionTier !== 'agency' && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Available Plans
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.tier}
                  className={`p-6 relative ${
                    plan.popular
                      ? 'border-primary shadow-lg'
                      : plan.tier === currentOrg.subscriptionTier
                      ? 'border-green-500'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {plan.tier === currentOrg.subscriptionTier && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="outline" className="bg-green-100 border-green-500 text-green-700">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-foreground mb-2">
                      {plan.name}
                    </h4>
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-foreground">
                        {plan.price}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.period}</p>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="text-green-600 flex-shrink-0 mt-0.5"
                        />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.tier !== currentOrg.subscriptionTier && plan.tier !== 'free' && (
                    <Button
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() =>
                        handleUpgrade(plan.tier as 'pro' | 'agency')
                      }
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Payment Method */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Payment Method
          </h3>
          <EmptyState
            icon={<CreditCard size={32} />}
            title="No payment method on file"
            description="Add a payment method to upgrade your subscription and ensure uninterrupted service."
            action={{
              label: 'Add Payment Method',
              onClick: () => toast.info('Payment method management coming soon'),
            }}
          />
        </Card>

        {/* Invoices */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Billing History
          </h3>
          <EmptyState
            icon={<Receipt size={32} />}
            title="No invoices yet"
            description="Your billing history and invoices will appear here once you upgrade to a paid plan."
          />
        </Card>
      </div>
    </AppShell>
  );
}
