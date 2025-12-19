import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type CdnInterferenceDetectorPageProps = {
  onNavigate: (page: string) => void;
};

type DetectionResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
};

export function CdnInterferenceDetectorPage({
  onNavigate,
}: CdnInterferenceDetectorPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const detectInterference = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const details: string[] = [];
      let proxyDetected = false;
      let cdnService = '';

      // Check DNS for proxy indicators
      const dnsCheck = await checkDnsForProxy(domain);
      if (dnsCheck.isProxy) {
        proxyDetected = true;
        cdnService = dnsCheck.service;
        details.push(`⚠ ${dnsCheck.service} detected via DNS`);
      } else {
        details.push('✓ No obvious proxy detected in DNS records');
      }

      // Check for Cloudflare-specific indicators
      const cfCheck = await checkCloudflareProxy(domain);
      if (cfCheck.isCloudflare) {
        proxyDetected = true;
        cdnService = 'Cloudflare (Orange Cloud)';
        details.push('⚠ Cloudflare proxy (orange cloud) detected');
        details.push(
          '⚠ Proxying will block HTTP-01 validation (no /.well-known/ passthrough)'
        );
        details.push('⚠ WAF and caching rules may interfere with ACME challenges');
      }

      // Check HTTP response headers for CDN indicators
      try {
        const corsProxy = `https://cors-anywhere.herokuapp.com/https://${domain}`;
        const httpResponse = await fetch(corsProxy, {
          method: 'HEAD',
        }).catch(() => null);

        if (httpResponse) {
          const cfRay = httpResponse.headers.get('cf-ray');
          const server = httpResponse.headers.get('server');
          const xCdn = httpResponse.headers.get('x-cdn');

          if (cfRay) {
            proxyDetected = true;
            cdnService = 'Cloudflare';
            details.push('⚠ Cloudflare headers detected (cf-ray)');
          }

          if (server?.toLowerCase().includes('cloudflare')) {
            proxyDetected = true;
            cdnService = 'Cloudflare';
          }

          if (xCdn) {
            proxyDetected = true;
            cdnService = xCdn;
            details.push(`⚠ CDN header detected: ${xCdn}`);
          }
        }
      } catch (error) {
        // CORS will likely block this, but we try anyway
        details.push(
          '⚠ Unable to check HTTP headers (CORS restriction)'
        );
      }

      if (proxyDetected) {
        details.push('');
        details.push('Common proxy/CDN issues with HTTP-01:');
        details.push('  • ACME challenge requests get cached');
        details.push('  • WAF rules block /.well-known/acme-challenge/');
        details.push('  • Challenge tokens return 403/404 errors');
        details.push('  • Proxy modifies or blocks validation responses');
        details.push('');
        details.push('Workarounds (not recommended):');
        details.push('  • Temporarily disable proxy ("gray cloud" in Cloudflare)');
        details.push('  • Create WAF exceptions for /.well-known/*');
        details.push('  • Set cache rules to bypass ACME paths');
        details.push('');
        details.push('Better solution: Use DNS-01 validation');

        setResult({
          status: 'warning',
          message: `${cdnService} proxy detected - HTTP-01 will likely fail`,
          details,
        });
      } else {
        details.push('');
        details.push('✓ No obvious proxy interference detected');
        details.push(
          '✓ HTTP-01 validation may work (if port 80 is accessible)'
        );
        details.push('');
        details.push('Note: This tool cannot detect all proxying scenarios');
        details.push(
          'DNS-01 validation is still recommended for reliability'
        );

        setResult({
          status: 'success',
          message: 'No proxy interference detected',
          details,
        });
      }
    } catch (error) {
      console.error('CDN detection error:', error);
      setResult({
        status: 'error',
        message: 'Error detecting CDN/proxy configuration',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDnsForProxy = async (
    domain: string
  ): Promise<{ isProxy: boolean; service: string }> => {
    try {
      // Check CNAME records
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
              'cloudfront.net': 'AWS CloudFront',
              'azurefd.net': 'Azure Front Door',
              'akamaiedge.net': 'Akamai',
              'fastly.net': 'Fastly',
              'edgecastcdn.net': 'Verizon EdgeCast',
              'cdn77.org': 'CDN77',
            };

            for (const [pattern, service] of Object.entries(cdnPatterns)) {
              if (target.includes(pattern)) {
                return { isProxy: true, service };
              }
            }
          }
        }
      }

      // Check A records for Cloudflare IPs (common proxy indicator)
      const aUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=A`;

      const aResponse = await fetch(aUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (aResponse.ok) {
        const data = await aResponse.json();
        if (data.Answer && data.Answer.length > 0) {
          const ipAddresses = data.Answer.filter((r: any) => r.type === 1).map(
            (r: any) => r.data
          );

          // Cloudflare IP ranges (simplified check)
          const cfRanges = ['104.', '172.', '173.'];
          for (const ip of ipAddresses) {
            if (cfRanges.some((range) => ip.startsWith(range))) {
              return { isProxy: true, service: 'Cloudflare' };
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return { isProxy: false, service: '' };
  };

  const checkCloudflareProxy = async (
    domain: string
  ): Promise<{ isCloudflare: boolean }> => {
    try {
      // Check for Cloudflare NS records (indicator of Cloudflare DNS)
      const nsUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=NS`;

      const response = await fetch(nsUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.Answer && data.Answer.length > 0) {
          const nsRecords = data.Answer.filter((r: any) => r.type === 2);
          for (const ns of nsRecords) {
            if (ns.data.toLowerCase().includes('cloudflare')) {
              return { isCloudflare: true };
            }
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return { isCloudflare: false };
  };

  const getStatusIcon = (status: DetectionResult['status']) => {
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
            CDN/Proxy Interference Detector
          </h1>
          <p className="text-xl text-muted-foreground">
            Detect Cloudflare, CDN, and proxy configurations that block HTTP-01
            validation
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
                    detectInterference();
                  }
                }}
              />
            </div>
            <Button
              onClick={detectInterference}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Detecting...' : 'Detect CDN/Proxy Interference'}
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
            Stop toggling settings—use DCVaaS
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>
              Never disable your CDN or modify WAF rules for certificate
              validation again.
            </strong>
          </p>
          <p className="text-muted-foreground mb-6">
            DCVaaS uses DNS-01 validation, which works seamlessly with any CDN,
            proxy, or WAF configuration. Your security settings stay active, and
            certificates renew automatically without any infrastructure changes.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
