import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type CnameChainValidatorPageProps = {
  onNavigate: (page: string) => void;
};

type ValidationResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
  chain?: string[];
};

export function CnameChainValidatorPage({
  onNavigate,
}: CnameChainValidatorPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validateCnameChain = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const chain: string[] = [domain];
      const details: string[] = [];
      const visited = new Set<string>([domain.toLowerCase()]);
      let currentDomain = domain;
      let depth = 0;
      const maxDepth = 10;
      let hasLoop = false;
      let hasNxdomain = false;

      // Follow CNAME chain
      while (depth < maxDepth) {
        const cnameUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
          currentDomain
        )}&type=CNAME`;

        const response = await fetch(cnameUrl, {
          headers: {
            Accept: 'application/dns-json',
          },
        });

        if (!response.ok) {
          details.push(`✗ DNS query failed for ${currentDomain}`);
          hasNxdomain = true;
          break;
        }

        const data = await response.json();

        // Check for NXDOMAIN
        if (data.Status === 3) {
          details.push(`✗ NXDOMAIN: ${currentDomain} does not exist`);
          hasNxdomain = true;
          break;
        }

        // Check for CNAME record
        if (data.Answer && data.Answer.length > 0) {
          const cnameRecord = data.Answer.find((r: any) => r.type === 5);

          if (cnameRecord) {
            const target = cnameRecord.data.replace(/\.$/, '');
            chain.push(target);
            depth++;

            // Check for loop
            if (visited.has(target.toLowerCase())) {
              details.push(`✗ CNAME loop detected: ${target} was already visited`);
              hasLoop = true;
              break;
            }

            visited.add(target.toLowerCase());
            currentDomain = target;

            // Check for DNS provider that might flatten CNAMEs
            if (depth > 0) {
              const provider = detectFlatteningProvider(target);
              if (provider) {
                details.push(
                  `⚠ ${provider} may flatten or rewrite CNAME records`
                );
              }
            }
          } else {
            // No CNAME, reached the end
            details.push(`✓ Chain resolves to A/AAAA record at ${currentDomain}`);
            break;
          }
        } else {
          // No records found
          details.push(`✓ Chain terminates at ${currentDomain}`);
          break;
        }
      }

      if (depth >= maxDepth) {
        details.push(
          `✗ Excessive chain depth: ${depth} CNAMEs (max recommended: 5)`
        );
        details.push(
          '✗ Some resolvers may fail with chains this deep'
        );

        setResult({
          status: 'error',
          message: 'CNAME chain too deep',
          details: [...details, '', 'Recommendation: Reduce CNAME chain depth'],
          chain,
        });
      } else if (hasLoop) {
        setResult({
          status: 'error',
          message: 'CNAME loop detected',
          details: [
            ...details,
            '',
            'A CNAME loop prevents DNS resolution',
            'Fix: Remove the circular reference in your DNS configuration',
          ],
          chain,
        });
      } else if (hasNxdomain) {
        setResult({
          status: 'error',
          message: 'CNAME chain contains non-existent domain',
          details: [
            ...details,
            '',
            'One or more domains in the CNAME chain do not exist',
            'Fix: Verify all CNAME targets are valid and resolvable',
          ],
          chain,
        });
      } else if (depth === 0) {
        details.push('✓ No CNAME chain (domain resolves directly)');
        details.push('✓ DNS resolution is optimal');

        setResult({
          status: 'success',
          message: 'No CNAME chain found',
          details,
          chain,
        });
      } else if (depth <= 3) {
        details.push(`✓ CNAME chain depth: ${depth} (acceptable)`);
        details.push('✓ Chain resolves without issues');

        setResult({
          status: 'success',
          message: 'CNAME chain is valid',
          details,
          chain,
        });
      } else {
        details.push(
          `⚠ CNAME chain depth: ${depth} (higher than recommended)`
        );
        details.push('⚠ Consider reducing chain depth for better performance');

        setResult({
          status: 'warning',
          message: 'CNAME chain is long but valid',
          details,
          chain,
        });
      }
    } catch (error) {
      console.error('CNAME validation error:', error);
      setResult({
        status: 'error',
        message: 'Error validating CNAME chain',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const detectFlatteningProvider = (target: string): string | null => {
    const flatteningProviders: Record<string, string> = {
      'cloudflare': 'Cloudflare',
      'netlify': 'Netlify',
      'vercel': 'Vercel',
    };

    const lowerTarget = target.toLowerCase();
    for (const [key, name] of Object.entries(flatteningProviders)) {
      if (lowerTarget.includes(key)) {
        return name;
      }
    }

    return null;
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
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
            DNS CNAME Chain Validator
          </h1>
          <p className="text-xl text-muted-foreground">
            Detect CNAME loops, excessive depth, and resolution issues in DNS
            chains
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
                    validateCnameChain();
                  }
                }}
              />
            </div>
            <Button
              onClick={validateCnameChain}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Validating...' : 'Validate CNAME Chain'}
            </Button>
          </div>
        </Card>

        {result && (
          <>
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

            {result.chain && result.chain.length > 1 && (
              <Card className="p-6 mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  CNAME Chain
                </h3>
                <div className="space-y-2 font-mono text-sm">
                  {result.chain.map((domain, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground">{index}.</span>
                      <span className="text-foreground">{domain}</span>
                      {index < result.chain!.length - 1 && (
                        <span className="text-primary">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Use our delegated validation target
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>Simple, reliable CNAME delegation with DCVaaS.</strong>
          </p>
          <p className="text-muted-foreground mb-6">
            Instead of complex CNAME chains that can break, use DCVaaS's single
            delegation target. Our infrastructure is optimized for DNS-01
            validation with minimal chain depth and guaranteed reliability.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
