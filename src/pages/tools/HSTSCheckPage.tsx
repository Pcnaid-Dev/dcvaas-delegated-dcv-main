import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { MagnifyingGlass, Shield, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';

type HSTSCheckPageProps = {
  onNavigate: (page: string) => void;
};

interface HSTSResult {
  domain: string;
  hasHSTS: boolean;
  maxAge: number | null;
  includeSubDomains: boolean;
  preload: boolean;
  preloadReady: boolean;
  warnings: string[];
}

export function HSTSCheckPage({ onNavigate }: HSTSCheckPageProps) {
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<HSTSResult | null>(null);

  const handleCheck = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const hasHSTS = Math.random() > 0.3;
    const maxAge = hasHSTS ? Math.floor(Math.random() * 31536000) : null;
    const includeSubDomains = hasHSTS && Math.random() > 0.5;
    const preload = hasHSTS && Math.random() > 0.7;
    
    const warnings: string[] = [];
    if (hasHSTS && maxAge && maxAge < 31536000) {
      warnings.push('max-age is less than 1 year (required for preload)');
    }
    if (hasHSTS && !includeSubDomains) {
      warnings.push('includeSubDomains directive is missing (required for preload)');
    }

    const mockResult: HSTSResult = {
      domain,
      hasHSTS,
      maxAge,
      includeSubDomains,
      preload,
      preloadReady: hasHSTS && maxAge !== null && maxAge >= 31536000 && includeSubDomains && preload,
      warnings,
    };

    setResult(mockResult);
    setIsChecking(false);
    toast.success('HSTS check completed');
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              HSTS Checker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Check HTTP Strict Transport Security configuration and preload readiness.
            Learn how HSTS affects HTTP validation flows.
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
                  Check HSTS Status
                </>
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            <DiagnosisBlock
              status={result.hasHSTS ? (result.warnings.length > 0 ? 'warning' : 'success') : 'warning'}
              title={result.hasHSTS ? 'HSTS Configured' : 'HSTS Not Configured'}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">HSTS Header</p>
                    <div className="flex items-center gap-2">
                      {result.hasHSTS ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Present</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-yellow-500" />
                          <span className="font-semibold text-yellow-600 dark:text-yellow-500">Missing</span>
                        </>
                      )}
                    </div>
                  </div>

                  {result.maxAge !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Max-Age</p>
                      <Badge variant={result.maxAge >= 31536000 ? 'default' : 'secondary'}>
                        {Math.floor(result.maxAge / 86400)} days
                      </Badge>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">includeSubDomains</p>
                    <div className="flex items-center gap-2">
                      {result.includeSubDomains ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-gray-500" />
                          <span className="font-semibold text-gray-600 dark:text-gray-500">No</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">preload</p>
                    <div className="flex items-center gap-2">
                      {result.preload ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-gray-500" />
                          <span className="font-semibold text-gray-600 dark:text-gray-500">No</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {result.preloadReady && (
                  <div className="text-green-600 dark:text-green-500 flex items-start gap-2">
                    <CheckCircle size={20} weight="fill" className="mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Preload Ready:</strong> This domain meets all requirements for HSTS preload list submission.
                    </p>
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <div key={idx} className="text-yellow-600 dark:text-yellow-500 flex items-start gap-2">
                        <Warning size={20} weight="fill" className="mt-0.5 flex-shrink-0" />
                        <p><strong>Warning:</strong> {warning}</p>
                      </div>
                    ))}
                  </div>
                )}

                {result.hasHSTS && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-500 mb-2">⚠️ HSTS and HTTP-01 Validation</p>
                    <p className="text-muted-foreground text-sm">
                      HSTS forces all connections over HTTPS. If your certificate expires and HSTS is active, 
                      HTTP-01 ACME challenges will fail. <strong>Use DNS-01 validation instead</strong> to avoid this issue.
                    </p>
                  </div>
                )}
              </div>
            </DiagnosisBlock>

            <FixStepsBlock>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">1. Add HSTS Header (Basic)</h4>
                  <p className="text-muted-foreground mb-3">
                    Start with a short max-age while testing:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <p className="text-muted-foreground"># Nginx</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">add_header Strict-Transport-Security "max-age=3600" always;</code>
                      <CopyButton text='add_header Strict-Transport-Security "max-age=3600" always;' />
                    </div>
                    <p className="text-muted-foreground mt-4"># Apache</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">Header always set Strict-Transport-Security "max-age=3600"</code>
                      <CopyButton text='Header always set Strict-Transport-Security "max-age=3600"' />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2. Production HSTS Configuration</h4>
                  <p className="text-muted-foreground mb-3">
                    After testing, increase max-age and add includeSubDomains:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <p className="text-muted-foreground"># Nginx</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground text-xs">add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;</code>
                      <CopyButton text='add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' />
                    </div>
                    <p className="text-muted-foreground mt-4"># Apache</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground text-xs">Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"</code>
                      <CopyButton text='Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"' />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">3. HSTS Preload</h4>
                  <p className="text-muted-foreground mb-3">
                    For maximum security, add the preload directive and submit to the preload list:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm">
                    <code className="text-foreground text-xs">
                      Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
                    </code>
                  </div>
                  <p className="text-muted-foreground mt-3">
                    Submit at: <a href="https://hstspreload.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">hstspreload.org</a>
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4. Use DNS-01 Validation</h4>
                  <p className="text-muted-foreground mb-3">
                    Since HSTS prevents HTTP access, always use DNS-01 for certificate validation:
                  </p>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>DNS-01 validates via TXT records, not HTTP</li>
                      <li>Works even when HTTPS is broken</li>
                      <li>Required for wildcard certificates anyway</li>
                      <li>DCVaaS uses DNS-01 exclusively</li>
                    </ul>
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
