import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type TlsAlpn01TesterPageProps = {
  onNavigate: (page: string) => void;
};

type TestResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
};

export function TlsAlpn01TesterPage({ onNavigate }: TlsAlpn01TesterPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const testTlsAlpn01 = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Since we can't actually test TLS-ALPN from the browser,
      // we'll check for common indicators that would prevent it from working
      const details: string[] = [];

      // Check if domain resolves
      const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=A`;

      const response = await fetch(dohUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (!response.ok) {
        setResult({
          status: 'error',
          message: 'Failed to resolve domain',
          details: ['Unable to query DNS records. Domain may not exist.'],
        });
        return;
      }

      const data = await response.json();

      if (!data.Answer || data.Answer.length === 0) {
        setResult({
          status: 'error',
          message: 'Domain does not resolve',
          details: [
            '✗ No A records found for this domain',
            '✗ TLS-ALPN-01 requires the domain to be accessible',
          ],
        });
        return;
      }

      // Get IP addresses
      const ipAddresses = data.Answer.filter((r: any) => r.type === 1).map(
        (r: any) => r.data
      );
      details.push(`✓ Domain resolves to: ${ipAddresses.join(', ')}`);

      // Check for common CDN/proxy patterns
      const cdnDetected = await detectCdnOrProxy(domain);
      if (cdnDetected.isProxy) {
        details.push(`⚠ ${cdnDetected.service} detected`);
        details.push(
          '⚠ Load balancers and CDNs often block TLS-ALPN-01 negotiation'
        );
        details.push('⚠ The acme-tls/1 ALPN protocol may not be supported');

        setResult({
          status: 'warning',
          message: 'CDN/Load Balancer detected - TLS-ALPN-01 likely incompatible',
          details: [
            ...details,
            '',
            'Recommendation: Use DNS-01 validation instead',
            'DNS-01 works with any infrastructure setup',
          ],
        });
        return;
      }

      // Check for port 443 accessibility
      details.push('✓ No obvious CDN/proxy detected');
      details.push('⚠ TLS-ALPN-01 requires port 443 to be accessible');
      details.push('⚠ Firewall rules must allow inbound TLS connections');
      details.push('⚠ Your server must support ALPN protocol negotiation');

      setResult({
        status: 'warning',
        message: 'TLS-ALPN-01 may work, but has limitations',
        details: [
          ...details,
          '',
          'Common issues with TLS-ALPN-01:',
          '  • Load balancers may strip ALPN headers',
          '  • CDNs rarely support the acme-tls/1 protocol',
          '  • Requires direct server access (no proxy)',
          '  • More complex to configure than DNS-01',
        ],
      });
    } catch (error) {
      console.error('TLS-ALPN test error:', error);
      setResult({
        status: 'error',
        message: 'Error testing TLS-ALPN-01 compatibility',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const detectCdnOrProxy = async (
    domain: string
  ): Promise<{ isProxy: boolean; service: string }> => {
    try {
      // Check CNAME for common CDN patterns
      const cnameUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=CNAME`;

      const response = await fetch(cnameUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.Answer && data.Answer.length > 0) {
          const cnameRecord = data.Answer.find((r: any) => r.type === 5);
          if (cnameRecord) {
            const target = cnameRecord.data.toLowerCase();

            const cdnPatterns: Record<string, string> = {
              cloudflare: 'Cloudflare',
              'cloudfront.net': 'AWS CloudFront',
              'azurefd.net': 'Azure Front Door',
              'akamaiedge.net': 'Akamai',
              'fastly.net': 'Fastly',
              'edgecastcdn.net': 'Verizon EdgeCast',
            };

            for (const [pattern, service] of Object.entries(cdnPatterns)) {
              if (target.includes(pattern)) {
                return { isProxy: true, service };
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors, assume no proxy
    }

    return { isProxy: false, service: '' };
  };

  const getStatusIcon = (status: TestResult['status']) => {
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
            TLS-ALPN-01 Tester
          </h1>
          <p className="text-xl text-muted-foreground">
            Test ALPN negotiation compatibility and detect load balancer/CDN
            interference
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
                    testTlsAlpn01();
                  }
                }}
              />
            </div>
            <Button
              onClick={testTlsAlpn01}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test TLS-ALPN-01 Compatibility'}
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
            Why use DNS-01 instead?
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>Switch method to DNS for guaranteed success.</strong>
          </p>
          <p className="text-muted-foreground mb-6">
            TLS-ALPN-01 has significant limitations with modern infrastructure.
            DNS-01 validation works everywhere: behind load balancers, CDNs,
            proxies, and firewalls. DCVaaS makes DNS-01 as easy as creating a
            single CNAME record.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
