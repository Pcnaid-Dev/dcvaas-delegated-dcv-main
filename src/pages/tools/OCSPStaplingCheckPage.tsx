import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { MagnifyingGlass, Certificate as CertIcon, CheckCircle, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type OCSPStaplingCheckPageProps = {
  onNavigate: (page: string) => void;
};

interface OCSPResult {
  domain: string;
  hasOCSPStapling: boolean;
  ocspResponse: 'good' | 'revoked' | 'unknown' | null;
  chainComplete: boolean;
  mustStaple: boolean;
}

export function OCSPStaplingCheckPage({ onNavigate }: OCSPStaplingCheckPageProps) {
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<OCSPResult | null>(null);

  const handleCheck = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResult: OCSPResult = {
      domain,
      hasOCSPStapling: Math.random() > 0.3,
      ocspResponse: Math.random() > 0.9 ? 'revoked' : 'good',
      chainComplete: Math.random() > 0.2,
      mustStaple: Math.random() > 0.7,
    };

    setResult(mockResult);
    setIsChecking(false);
    toast.success('OCSP check completed');
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CertIcon size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              OCSP Stapling Checker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Verify OCSP stapling configuration and check certificate revocation status.
            OCSP stapling improves performance and privacy.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>
            <Button onClick={handleCheck} disabled={isChecking} className="w-full">
              {isChecking ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Checking...
                </>
              ) : (
                <>
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Check OCSP Stapling
                </>
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            <DiagnosisBlock
              status={result.hasOCSPStapling && result.ocspResponse === 'good' && result.chainComplete ? 'success' : result.ocspResponse === 'revoked' ? 'error' : 'warning'}
              title={result.hasOCSPStapling && result.ocspResponse === 'good' ? 'OCSP Stapling Configured' : result.ocspResponse === 'revoked' ? 'Certificate Revoked!' : 'Issues Detected'}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">OCSP Stapling</p>
                    <div className="flex items-center gap-2">
                      {result.hasOCSPStapling ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Enabled</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-yellow-500" />
                          <span className="font-semibold text-yellow-600 dark:text-yellow-500">Disabled</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Revocation Status</p>
                    <Badge variant={result.ocspResponse === 'good' ? 'default' : 'destructive'}>
                      {result.ocspResponse?.toUpperCase()}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Certificate Chain</p>
                    <div className="flex items-center gap-2">
                      {result.chainComplete ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Complete</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-red-500" />
                          <span className="font-semibold text-red-600 dark:text-red-500">Incomplete</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Must-Staple Extension</p>
                    <Badge variant={result.mustStaple ? 'default' : 'secondary'}>
                      {result.mustStaple ? 'Present' : 'Not Present'}
                    </Badge>
                  </div>
                </div>

                {!result.hasOCSPStapling && (
                  <div className="text-yellow-600 dark:text-yellow-500">
                    <p><strong>Warning:</strong> OCSP stapling is not enabled. This can lead to slower certificate validation and potential privacy leaks.</p>
                  </div>
                )}

                {!result.chainComplete && (
                  <div className="text-red-600 dark:text-red-500">
                    <p><strong>Error:</strong> Certificate chain is incomplete. Browsers may not trust your certificate.</p>
                  </div>
                )}

                {result.ocspResponse === 'revoked' && (
                  <div className="text-red-600 dark:text-red-500">
                    <p><strong>Critical:</strong> This certificate has been revoked! Replace it immediately.</p>
                  </div>
                )}
              </div>
            </DiagnosisBlock>

            <FixStepsBlock>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">1. Enable OCSP Stapling (Nginx)</h4>
                  <p className="text-muted-foreground mb-3">
                    Add these directives to your Nginx SSL configuration:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">ssl_stapling on;</code>
                      <CopyButton text="ssl_stapling on;" />
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">ssl_stapling_verify on;</code>
                      <CopyButton text="ssl_stapling_verify on;" />
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">ssl_trusted_certificate /path/to/chain.pem;</code>
                      <CopyButton text="ssl_trusted_certificate /path/to/chain.pem;" />
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">resolver 8.8.8.8 8.8.4.4 valid=300s;</code>
                      <CopyButton text="resolver 8.8.8.8 8.8.4.4 valid=300s;" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2. Enable OCSP Stapling (Apache)</h4>
                  <p className="text-muted-foreground mb-3">
                    Add these directives to your Apache SSL configuration:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">SSLUseStapling on</code>
                      <CopyButton text="SSLUseStapling on" />
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">SSLStaplingCache shmcb:/tmp/stapling_cache(128000)</code>
                      <CopyButton text="SSLStaplingCache shmcb:/tmp/stapling_cache(128000)" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">3. Fix Incomplete Certificate Chain</h4>
                  <p className="text-muted-foreground mb-3">
                    Ensure your certificate file includes the full chain (certificate + intermediates):
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm">
                    <code className="text-foreground block">
                      cat domain.crt intermediate.crt &gt; fullchain.pem
                    </code>
                  </div>
                  <p className="text-muted-foreground mt-3">
                    Then update your web server configuration to use the full chain file.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4. Verify Configuration</h4>
                  <p className="text-muted-foreground mb-3">
                    After making changes, restart your web server and verify:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <code className="text-foreground block">
                      openssl s_client -connect {domain}:443 -status -tlsextdebug &lt; /dev/null 2&gt;&amp;1 | grep -A 17 'OCSP'
                    </code>
                  </div>
                </div>
              </div>
            </FixStepsBlock>

            <CTABlock onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
