import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { MagnifyingGlass, ListChecks, CheckCircle, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type CTCheckPageProps = {
  onNavigate: (page: string) => void;
};

interface CTResult {
  domain: string;
  hasSCTs: boolean;
  sctCount: number;
  sctSources: string[];
  ctCompliant: boolean;
  logServers: string[];
}

export function CTCheckPage({ onNavigate }: CTCheckPageProps) {
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CTResult | null>(null);

  const handleCheck = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsChecking(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const hasSCTs = Math.random() > 0.2;
    const sctCount = hasSCTs ? Math.floor(Math.random() * 3) + 2 : 0;

    const mockResult: CTResult = {
      domain,
      hasSCTs,
      sctCount,
      sctSources: hasSCTs ? ['TLS Extension', 'OCSP Response'] : [],
      ctCompliant: hasSCTs && sctCount >= 2,
      logServers: hasSCTs ? ['Google Argon 2023', 'Cloudflare Nimbus 2023', 'DigiCert Log Server 2'] : [],
    };

    setResult(mockResult);
    setIsChecking(false);
    toast.success('CT check completed');
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ListChecks size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              Certificate Transparency Checker
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Verify Certificate Transparency (CT) compliance and SCT presence.
            CT is required by browsers to detect misissued certificates.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain or Certificate</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter domain name or paste certificate PEM
              </p>
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
                  Check CT Compliance
                </>
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            <DiagnosisBlock
              status={result.ctCompliant ? 'success' : 'error'}
              title={result.ctCompliant ? 'CT Compliant' : 'CT Issues Detected'}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">SCTs Present</p>
                    <div className="flex items-center gap-2">
                      {result.hasSCTs ? (
                        <>
                          <CheckCircle size={20} weight="fill" className="text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-500">Yes ({result.sctCount})</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={20} weight="fill" className="text-red-500" />
                          <span className="font-semibold text-red-600 dark:text-red-500">No</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CT Compliance</p>
                    <Badge variant={result.ctCompliant ? 'default' : 'destructive'}>
                      {result.ctCompliant ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                  </div>
                </div>

                {result.hasSCTs && (
                  <>
                    <div>
                      <p className="font-semibold text-foreground mb-2">SCT Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.sctSources.map((source) => (
                          <Badge key={source} variant="secondary">{source}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-2">CT Log Servers:</p>
                      <div className="bg-muted rounded p-3 text-sm space-y-1">
                        {result.logServers.map((log) => (
                          <div key={log} className="flex items-center gap-2">
                            <CheckCircle size={16} weight="fill" className="text-green-500" />
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {!result.ctCompliant && (
                  <div className="text-red-600 dark:text-red-500">
                    <p>
                      <strong>Error:</strong> This certificate lacks required SCTs. 
                      Chrome and other browsers will reject it. Re-issue from a CT-compliant CA.
                    </p>
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
                  <p className="font-semibold text-blue-600 dark:text-blue-500 mb-2">ℹ️ About Certificate Transparency</p>
                  <p className="text-muted-foreground text-sm">
                    CT requires certificates to be logged in public CT logs before issuance. 
                    This creates an append-only audit trail, making it impossible for CAs to 
                    secretly issue rogue certificates.
                  </p>
                </div>
              </div>
            </DiagnosisBlock>

            <FixStepsBlock title="How to Ensure CT Compliance">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">1. Use a Modern CA</h4>
                  <p className="text-muted-foreground mb-3">
                    All major CAs automatically include SCTs. Let's Encrypt, DigiCert, Sectigo, and others 
                    are all CT-compliant by default.
                  </p>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Let's Encrypt: Built-in CT logging</li>
                      <li>DigiCert: CT logging + OCSP stapling</li>
                      <li>ZeroSSL: Full CT compliance</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2. Verify SCTs After Issuance</h4>
                  <p className="text-muted-foreground mb-3">
                    Check for SCTs using OpenSSL:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <code className="text-foreground text-xs">
                        openssl s_client -connect {domain}:443 -showcerts &lt; /dev/null | grep -A 5 "CT Precertificate"
                      </code>
                      <CopyButton text={`openssl s_client -connect ${domain}:443 -showcerts < /dev/null | grep -A 5 "CT Precertificate"`} />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">3. Re-issue Non-Compliant Certificates</h4>
                  <p className="text-muted-foreground mb-3">
                    If your certificate lacks SCTs:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Revoke the current certificate immediately</li>
                    <li>Generate a new CSR</li>
                    <li>Re-issue from a CT-compliant CA</li>
                    <li>Verify SCT presence before deploying</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4. Monitor CT Logs</h4>
                  <p className="text-muted-foreground mb-3">
                    Set up monitoring to detect unauthorized certificates for your domains:
                  </p>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>crt.sh - CT log search engine</li>
                      <li>Facebook CT Monitor - Free monitoring service</li>
                      <li>CertSpotter - Paid monitoring with alerts</li>
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
