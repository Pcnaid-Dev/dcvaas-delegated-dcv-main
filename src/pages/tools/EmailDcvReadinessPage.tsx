import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Certificate, CheckCircle, Warning, XCircle, EnvelopeSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';

type EmailDcvReadinessPageProps = {
  onNavigate: (page: string) => void;
};

type ReadinessResult = {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
  validationAddresses?: string[];
};

export function EmailDcvReadinessPage({
  onNavigate,
}: EmailDcvReadinessPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadinessResult | null>(null);

  const checkEmailReadiness = async () => {
    if (!domain) {
      toast.error('Please enter a domain name');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const details: string[] = [];
      const validationAddresses: string[] = [];

      // Standard validation email addresses (per CA/Browser Forum Baseline Requirements)
      const standardAddresses = [
        `admin@${domain}`,
        `administrator@${domain}`,
        `webmaster@${domain}`,
        `hostmaster@${domain}`,
        `postmaster@${domain}`,
      ];

      // Check for MX records
      const mxUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=MX`;

      const mxResponse = await fetch(mxUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });

      if (!mxResponse.ok) {
        details.push('✗ Unable to query MX records');
        setResult({
          status: 'error',
          message: 'DNS query failed',
          details: [
            ...details,
            'Cannot determine email configuration for this domain',
          ],
        });
        return;
      }

      const mxData = await mxResponse.json();

      if (!mxData.Answer || mxData.Answer.length === 0) {
        details.push('✗ No MX records found');
        details.push('✗ Domain cannot receive email');
        details.push('');
        details.push('Email-based DCV will not work without MX records');
        details.push('You must configure email or use DNS-01 validation');

        setResult({
          status: 'error',
          message: 'No MX records configured',
          details,
          validationAddresses: [],
        });
        return;
      }

      // Parse MX records
      const mxRecords = mxData.Answer.filter((r: any) => r.type === 15);
      details.push(`✓ Found ${mxRecords.length} MX record(s)`);

      for (const mx of mxRecords.slice(0, 3)) {
        // Show first 3
        const parts = mx.data.split(' ');
        const priority = parts[0];
        const server = parts[1].replace(/\.$/, '');
        details.push(`  Priority ${priority}: ${server}`);
      }

      // Check if MX servers resolve
      let allServersResolve = true;
      for (const mx of mxRecords) {
        const parts = mx.data.split(' ');
        const server = parts[1].replace(/\.$/, '');

        const serverUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
          server
        )}&type=A`;

        const serverResponse = await fetch(serverUrl, {
          headers: {
            Accept: 'application/dns-json',
          },
        });

        if (serverResponse.ok) {
          const serverData = await serverResponse.json();
          if (!serverData.Answer || serverData.Answer.length === 0) {
            details.push(`⚠ MX server ${server} does not resolve to an IP`);
            allServersResolve = false;
          }
        }
      }

      if (allServersResolve) {
        details.push('✓ All MX servers resolve correctly');
      }

      // List validation email addresses
      details.push('');
      details.push('Standard validation email addresses:');
      for (const addr of standardAddresses) {
        validationAddresses.push(addr);
        details.push(`  • ${addr}`);
      }

      details.push('');
      details.push('Note: CAs will send validation emails to these addresses');
      details.push(
        'You must be able to receive and respond to email at one of them'
      );

      // Check for email-related issues
      details.push('');
      details.push('Common email DCV issues:');
      details.push('  • Validation emails end up in spam folder');
      details.push('  • Email forwarding delays or breaks the validation link');
      details.push('  • Catch-all addresses may not receive validation emails');
      details.push('  • Email server downtime causes validation failure');
      details.push('  • Response time: Can take minutes to hours');

      setResult({
        status: allServersResolve ? 'success' : 'warning',
        message: allServersResolve
          ? 'Email configuration appears valid'
          : 'Email configuration has issues',
        details,
        validationAddresses,
      });
    } catch (error) {
      console.error('Email readiness check error:', error);
      setResult({
        status: 'error',
        message: 'Error checking email configuration',
        details: [
          error instanceof Error ? error.message : 'Unknown error occurred',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ReadinessResult['status']) => {
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
            <EnvelopeSimple size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              Email DCV Readiness Check
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Verify MX records and email routing for validation email delivery
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
                    checkEmailReadiness();
                  }
                }}
              />
            </div>
            <Button
              onClick={checkEmailReadiness}
              disabled={loading || !domain}
              className="w-full"
            >
              {loading ? 'Checking...' : 'Check Email DCV Readiness'}
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

        <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 mb-8">
          <div className="flex items-start gap-3">
            <Warning
              size={24}
              weight="fill"
              className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-1"
            />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Important: This tool does not send email
              </h3>
              <p className="text-sm text-muted-foreground">
                This tool only checks DNS configuration. It does not send
                validation emails or test email delivery. Actual email
                validation requires coordination with your Certificate Authority.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Skip email delays—use DCVaaS
          </h3>
          <p className="text-muted-foreground mb-4">
            <strong>DNS-01 validation is instant, reliable, and automated.</strong>
          </p>
          <p className="text-muted-foreground mb-6">
            Email-based validation is slow, unreliable, and requires manual
            intervention. DCVaaS uses DNS-01 validation that completes in
            seconds, works automatically, and never ends up in your spam folder.
            Stop waiting for validation emails and start issuing certificates
            instantly.
          </p>
          <Button onClick={() => onNavigate('home')}>
            Get Started with DCVaaS
          </Button>
        </Card>
      </main>
    </div>
  );
}
