import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle, Shield } from '@phosphor-icons/react';
import { toast } from 'sonner';

type DnssecHealthCheckPageProps = {
  onNavigate: (page: string) => void;
};

type HealthCheckResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
  dnssecEnabled?: boolean;
};

export function DnssecHealthCheckPage({
  onNavigate,
}: DnssecHealthCheckPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HealthCheckResult | null>(null);

  const checkDnssec = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const details: string[] = [];
      let dnssecEnabled = false;
      let hasIssues = false;

      // Check for DNSKEY records (indicates DNSSEC is enabled)
      const dnskeyUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=DNSKEY`;

      const dnskeyResponse = await fetch(dnskeyUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (dnskeyResponse.ok) {
        const dnskeyData = await dnskeyResponse.json();
        if (dnskeyData.Answer && dnskeyData.Answer.length > 0) {
          dnssecEnabled = true;
          details.push('✓ DNSSEC is enabled (DNSKEY records found)');
          details.push(
            `✓ Found ${dnskeyData.Answer.length} DNSKEY record(s)`
          );
        }
      }

      // Check for RRSIG records (DNSSEC signatures)
      const rrsigUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=RRSIG`;

      const rrsigResponse = await fetch(rrsigUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (rrsigResponse.ok) {
        const rrsigData = await rrsigResponse.json();
        if (rrsigData.Answer && rrsigData.Answer.length > 0) {
          details.push('✓ RRSIG records found (signatures present)');
        } else if (dnssecEnabled) {
          details.push('⚠ DNSSEC enabled but no RRSIG records found');
          hasIssues = true;
        }
      }

      // Check for DS records at parent zone (validates chain of trust)
      const dsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=DS`;

      const dsResponse = await fetch(dsUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (dsResponse.ok) {
        const dsData = await dsResponse.json();
        if (dsData.Answer && dsData.Answer.length > 0) {
          details.push('✓ DS records found at parent zone (chain of trust)');
        } else if (dnssecEnabled) {
          details.push(
            '⚠ No DS records at parent zone (broken chain of trust)'
          );
          details.push('⚠ DNSSEC validation will fail for this domain');
          hasIssues = true;
        }
      }

      if (!dnssecEnabled) {
        details.push('✓ DNSSEC is not enabled for this domain');
        details.push('✓ No DNSSEC-related validation issues');
        details.push('');
        details.push('Note: DNSSEC is not required for certificate issuance');
        details.push(
          'However, if enabled incorrectly, it can block DNS-01 validation'
        );

        setResult({
          status: 'success',
          message: 'DNSSEC not enabled',
          details,
          dnssecEnabled: false,
        });
      } else if (hasIssues) {
        details.push('');
        details.push('Common DNSSEC issues that break validation:');
        details.push('  • Missing or incorrect DS records at parent zone');
        details.push('  • Expired RRSIG signatures');
        details.push('  • Key rollover not completed properly');
        details.push('  • Inconsistent records between nameservers');
        details.push('');
        details.push('Why resolvers disagree:');
        details.push('  • Some resolvers validate DNSSEC, others do not');
        details.push('  • Validation failures cause SERVFAIL responses');
        details.push('  • TXT record lookups fail when DNSSEC is broken');
        details.push('');
        details.push('Solutions:');
        details.push('  1. Fix DNSSEC configuration (recommended)');
        details.push('  2. Temporarily disable DNSSEC during validation');
        details.push('  3. Use a different validation method');

        setResult({
          status: 'error',
          message: 'DNSSEC configuration issues detected',
          details,
          dnssecEnabled: true,
        });
      } else {
        details.push('✓ DNSSEC appears to be configured correctly');
        details.push('✓ No obvious validation issues detected');
        details.push('');
        details.push('Note: This is a basic check');
        details.push(
          'For comprehensive DNSSEC validation, use tools like dnsviz.net'
        );

        setResult({
          status: 'success',
          message: 'DNSSEC is properly configured',
          details,
          dnssecEnabled: true,
        });
      }
    } catch (error) {
      console.error('DNSSEC check error:', error);
      setResult({
        status: 'error',
        message: 'Error checking DNSSEC configuration',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={24} weight="fill" className="text-green-500" />;
      case 'warning':
        return <Warning size={24} weight="fill" className="text-yellow-500" />;
      case 'error':
        return <XCircle size={24} weight="fill" className="text-red-500" />;
    }
  };

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
                onClick={() => onNavigate('tools')}
                className="text-sm font-medium text-primary"
              >
                Tools
              </button>
              <button
                onClick={() => onNavigate('pricing')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigate('docs')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Docs
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              DNSSEC Health Check
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Detect DNSSEC misconfigurations that break DNS-01 validation
          </p>
        </div>

        <Card className="p-6 mb-8">
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    checkDnssec();
                  }
                }}
              />
            </div>
            <Button
              onClick={checkDnssec}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check DNSSEC Health'}
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {result.message}
                </h3>
                {result.details && result.details.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground font-mono">
                    {result.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            DNSSEC shouldn't break your certificates
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>
              Fix DNSSEC or use a method that avoids the failure mode.
            </strong>
          </p>
          <p className="text-muted-foreground mb-6">
            DCVaaS handles DNS-01 validation with proper DNSSEC support. Our
            infrastructure ensures your certificates issue successfully even with
            DNSSEC enabled, eliminating the frustration of cryptic validation
            failures.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
