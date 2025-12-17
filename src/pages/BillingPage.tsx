import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle } from '@phosphor-icons/react';
import { PLAN_LIMITS } from '@/types';
import { createStripeCheckoutSession } from '@/lib/data';
import { useState } from 'react';

type BillingPageProps = {
  onNavigate: (page: string) => void;
};

export function BillingPage({ onNavigate }: BillingPageProps) {
  const { currentOrg } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!currentOrg) return null;

  const handleUpgrade = async (tier: string) => {
    setLoading(true);
    try {
      const priceId = tier === 'pro' ? 'price_pro_monthly' : 'price_agency_monthly';
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
      alert(`Failed to start checkout. ${errorMessage ? 'Error: ' + errorMessage : 'Please try again.'}`);
      setLoading(false);
    }
  };

  const plans = [
    { tier: 'free', name: 'Free', price: '$0/mo', priceId: '' },
    { tier: 'pro', name: 'Pro', price: '$29/mo', priceId: 'price_pro_monthly' },
    { tier: 'agency', name: 'Agency', price: '$99/mo', priceId: 'price_agency_monthly' },
  ];

  return (
    <AppShell onNavigate={onNavigate} currentPage="billing">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and payment details
          </p>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
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
            <Badge variant="outline" className="text-lg px-4 py-2">
              {plans.find(p => p.tier === currentOrg.subscriptionTier)?.name}
            </Badge>
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

        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-4">
            Payment Method
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a payment method to upgrade your plan
          </p>
          <Button variant="outline" size="sm">
            Add Payment Method
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
