import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { MagnifyingGlass, ShieldCheck, ShieldWarning } from '@phosphor-icons/react';
import { toast } from 'sonner';

type TLSConfigScanPageProps = {
  onNavigate: (page: string) => void;
};

interface TLSScanResult {
  domain: string;
  tlsVersions: string[];
  alpnProtocols: string[];
  cipherSuites: string[];
  hasLegacyProtocol: boolean;
  hasWeakCiphers: boolean;
  score: 'excellent' | 'good' | 'warning' | 'poor';
}

export function TLSConfigScanPage({ onNavigate }: TLSConfigScanPageProps) {
  const [domain, setDomain] = useState('');
  const [port, setPort] = useState('443');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<TLSScanResult | null>(null);

  const handleScan = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsScanning(true);
    
    // Simulate TLS scan (in production, this would call a backend API)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock results
    const mockResult: TLSScanResult = {
      domain: `${domain}:${port}`,
      tlsVersions: ['TLSv1.2', 'TLSv1.3'],
      alpnProtocols: ['h2', 'http/1.1'],
      cipherSuites: [
        'TLS_AES_128_GCM_SHA256',
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
      ],
      hasLegacyProtocol: Math.random() > 0.5,
      hasWeakCiphers: Math.random() > 0.7,
      score: Math.random() > 0.3 ? 'excellent' : 'warning',
    };

    setResult(mockResult);
    setIsScanning(false);
    toast.success('TLS scan completed');
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ShieldCheck size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              TLS Config Quick Scan
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Analyze TLS protocols, ciphers, and ALPN configuration. Get instant insights 
            on your SSL/TLS security posture.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleScan} disabled={isScanning} className="w-full">
              {isScanning ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Scan TLS Configuration
                </>
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            {/* Diagnosis Block */}
            <DiagnosisBlock
              status={result.hasLegacyProtocol || result.hasWeakCiphers ? 'warning' : 'success'}
              title={result.hasLegacyProtocol || result.hasWeakCiphers ? 'Issues Detected' : 'Configuration Looks Good'}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground">TLS Score:</span>
                    <span className={`text-lg font-bold ${getScoreColor(result.score)}`}>
                      {result.score.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-2">Supported TLS Versions:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.tlsVersions.map((version) => (
                      <Badge key={version} variant={version === 'TLSv1.3' ? 'default' : 'secondary'}>
                        {version}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-2">ALPN Protocols:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.alpnProtocols.map((protocol) => (
                      <Badge key={protocol} variant={protocol === 'h2' ? 'default' : 'secondary'}>
                        {protocol}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-2">Cipher Suites:</p>
                  <div className="bg-muted rounded p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                    {result.cipherSuites.map((cipher) => (
                      <div key={cipher}>{cipher}</div>
                    ))}
                  </div>
                </div>

                {result.hasLegacyProtocol && (
                  <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-500">
                    <ShieldWarning size={20} weight="fill" className="mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Legacy Protocol Warning:</strong> TLSv1.0 or TLSv1.1 detected. 
                      These are deprecated and should be disabled.
                    </p>
                  </div>
                )}

                {result.hasWeakCiphers && (
                  <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-500">
                    <ShieldWarning size={20} weight="fill" className="mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>Weak Cipher Warning:</strong> Some weak or outdated cipher suites detected.
                      Consider updating your TLS configuration.
                    </p>
                  </div>
                )}
              </div>
            </DiagnosisBlock>

            {/* Fix Steps Block */}
            <FixStepsBlock title="Hardening Recommendations">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">1. Disable Legacy Protocols</h4>
                  <p className="text-muted-foreground mb-3">
                    Only enable TLSv1.2 and TLSv1.3. Disable TLSv1.0 and TLSv1.1 which have known vulnerabilities.
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <p className="text-muted-foreground"># Nginx configuration</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">ssl_protocols TLSv1.2 TLSv1.3;</code>
                      <CopyButton text="ssl_protocols TLSv1.2 TLSv1.3;" />
                    </div>
                    <p className="text-muted-foreground mt-4"># Apache configuration</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">SSLProtocol -all +TLSv1.2 +TLSv1.3</code>
                      <CopyButton text="SSLProtocol -all +TLSv1.2 +TLSv1.3" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2. Use Strong Cipher Suites</h4>
                  <p className="text-muted-foreground mb-3">
                    Prioritize modern AEAD ciphers like AES-GCM and ChaCha20-Poly1305.
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm">
                    <p className="text-muted-foreground mb-2"># Recommended cipher suite</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground text-xs break-all">
                        TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
                      </code>
                      <CopyButton text="TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">3. Enable HTTP/2 (ALPN)</h4>
                  <p className="text-muted-foreground mb-3">
                    HTTP/2 improves performance and is supported by all modern browsers.
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                    <p className="text-muted-foreground"># Nginx</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">listen 443 ssl http2;</code>
                      <CopyButton text="listen 443 ssl http2;" />
                    </div>
                    <p className="text-muted-foreground mt-4"># Apache</p>
                    <div className="flex items-center justify-between">
                      <code className="text-foreground">Protocols h2 http/1.1</code>
                      <CopyButton text="Protocols h2 http/1.1" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4. Test Your Configuration</h4>
                  <p className="text-muted-foreground mb-3">
                    After making changes, verify your TLS configuration with online tools:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>SSL Labs SSL Test (ssllabs.com/ssltest)</li>
                    <li>testssl.sh command-line tool</li>
                    <li>Mozilla SSL Configuration Generator</li>
                  </ul>
                </div>
              </div>
            </FixStepsBlock>

            {/* CTA Block */}
            <CTABlock onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
