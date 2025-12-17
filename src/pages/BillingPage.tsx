import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, CreditCard } from '@phosphor-icons/react';
import { PLAN_LIMITS } from '@/types';
import { createStripeCheckoutSession } from '@/lib/data';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-constants';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common';
import { useQuery } from '@tanstack/react-query';
import { getOrgDomains } from '@/lib/data';

type BillingPageProps = {
  onNavigate: (page: string) => void;
};

export function BillingPage({ onNavigate }: BillingPageProps) {
  const { currentOrg } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch domains for usage stats
  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    enabled: !!currentOrg,
  });

  if (!currentOrg) return null;

  const currentLimit = PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains;
  const usagePercentage = currentLimit > 0 ? (domains.length / currentLimit) * 100 : 0;


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

  const plans = [
    { tier: 'free', name: 'Free', price: '$0/mo', priceId: '' },
    { tier: 'pro', name: 'Pro', price: '$29/mo', priceId: STRIPE_PRICE_IDS.pro },
    { tier: 'agency', name: 'Agency', price: '$99/mo', priceId: STRIPE_PRICE_IDS.agency },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="billing">
      <PageHeader
        title="Billing"
        description="Manage your subscription and payment details"
      />

      {/* Current Plan Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Current Plan
            </h3>
            <p className="text-sm text-muted-foreground">
              You are on the{' '}
              <span className="font-semibold capitalize">
                {currentOrg.subscriptionTier}
              </span>{' '}
              plan
            </p>
          </div>
          <Badge
            variant={currentOrg.subscriptionTier === 'free' ? 'outline' : 'default'}
            className="text-lg px-4 py-2"
          >
            {plans.find(p => p.tier === currentOrg.subscriptionTier)?.name}
          </Badge>
        </div>

        {/* Usage Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Domain Usage</span>
            <span className="text-sm text-muted-foreground">
              {domains.length} / {currentLimit} domains
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          {usagePercentage >= 80 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-2">
              You're approaching your domain limit. Consider upgrading your plan.
            </p>
          )}
        </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">Plan Features</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} weight="fill" className="text-success" />
                  <span className="text-foreground">
                    {PLAN_LIMITS[currentOrg.subscriptionTier].maxDomains} domains
                  </span>
                </div>
                {PLAN_LIMITS[currentOrg.subscriptionTier].apiAccess && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} weight="fill" className="text-success" />
                    <span className="text-foreground">API access</span>
                  </div>
                )}
                {PLAN_LIMITS[currentOrg.subscriptionTier].teamAccess && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} weight="fill" className="text-success" />
                    <span className="text-foreground">Team management</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              {currentOrg.subscriptionTier === 'free' && (
                <div className="space-x-2">
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
                </div>
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
              {currentOrg.subscriptionTier === 'agency' && (
                <Button variant="outline" disabled>
                  Current Plan
                </Button>
              )}
            </div>
          </div>
        </Card>

      {/* Payment Method Card */}
      <Card className="p-6 bg-muted/30">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={24} className="text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Payment Method</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Add a payment method to upgrade your plan
        </p>
        <Button variant="outline" size="sm">
          Add Payment Method
        </Button>
      </Card>
    </AppShell>
  );
}
