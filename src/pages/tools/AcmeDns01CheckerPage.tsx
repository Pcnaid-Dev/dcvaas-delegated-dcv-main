import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type AcmeDns01CheckerPageProps = {
  onNavigate: (page: string) => void;
};

type CheckResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
};

export function AcmeDns01CheckerPage({ onNavigate }: AcmeDns01CheckerPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const checkDns01Readiness = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Check for _acme-challenge CNAME record
      const recordName = `_acme-challenge.${domain}`;
      const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        recordName
      )}&type=CNAME`;

      const response = await fetch(dohUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (!response.ok) {
        setResult({
          status: 'error',
          message: 'DNS query failed',
          details: ['Unable to query DNS records. Please try again.'],
        });
        return;
      }

      const data = await response.json();
      const details: string[] = [];

      // Check for CNAME record
      if (data.Answer && data.Answer.length > 0) {
        const cnameRecord = data.Answer.find((r: any) => r.type === 5);

        if (cnameRecord) {
          const target = cnameRecord.data.replace(/\.$/, '');
          details.push(`✓ CNAME record found: ${recordName} → ${target}`);

          // Check for delegation patterns
          if (target.includes('acme') || target.includes('validation')) {
            details.push('✓ Delegation pattern detected (acme/validation in target)');
          }

          // Check for common DNS providers
          const provider = detectDnsProvider(target);
          if (provider) {
            details.push(`✓ DNS Provider: ${provider}`);
          }

          setResult({
            status: 'success',
            message: '_acme-challenge CNAME is properly configured',
            details,
          });
        } else {
          details.push('⚠ CNAME record not found at _acme-challenge');
          details.push('⚠ TXT records found, but CNAME is required for DNS-01');
          setResult({
            status: 'warning',
            message: 'No CNAME delegation found',
            details: [
              ...details,
              'Create a CNAME record: _acme-challenge.${domain} → your-validation-target',
            ],
          });
        }
      } else {
        // No records found
        details.push('✗ No _acme-challenge record found');
        details.push('✗ DNS-01 validation cannot proceed without delegation');

        // Check for common DNS provider limitations
        const warnings = [
          'Some DNS providers have limitations:',
          '  • Cloudflare: Ensure proxy is disabled for validation records',
          '  • Route 53: Check zone delegation and NS records',
          '  • Google Cloud DNS: Verify CNAME flattening is not interfering',
        ];

        setResult({
          status: 'error',
          message: 'DNS-01 delegation not configured',
          details: [...details, ...warnings],
        });
      }
    } catch (error) {
      console.error('DNS check error:', error);
      setResult({
        status: 'error',
        message: 'Error checking DNS records',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const detectDnsProvider = (target: string): string | null => {
    const providers: Record<string, string> = {
      'cloudflare': 'Cloudflare',
      'amazonaws.com': 'AWS Route 53',
      'azure': 'Azure DNS',
      'googleusercontent.com': 'Google Cloud DNS',
      'dnsimple': 'DNSimple',
      'ns1': 'NS1',
    };

    for (const [key, name] of Object.entries(providers)) {
      if (target.toLowerCase().includes(key)) {
        return name;
      }
    }

    return null;
  };

  const getStatusIcon = (status: CheckResult['status']) => {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">
            ACME DNS-01 Readiness Check
          </h1>
          <p className="text-xl text-muted-foreground">
            Verify your _acme-challenge delegation and detect common DNS
            configuration issues
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
                    checkDns01Readiness();
                  }
                }}
              />
            </div>
            <Button
              onClick={checkDns01Readiness}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check DNS-01 Readiness'}
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
            Why use DCVaaS?
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>Delegate once → unlimited renewals.</strong>
          </p>
          <p className="text-muted-foreground mb-6">
            With DCVaaS, you create a single CNAME record that handles all
            future ACME challenges automatically. No more manual DNS updates,
            no more API key management, no more certificate expiration worries.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
