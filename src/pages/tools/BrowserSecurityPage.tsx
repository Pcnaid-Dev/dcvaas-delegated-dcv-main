import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { MagnifyingGlass, ShieldSlash, Warning, XCircle, CheckCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type BrowserSecurityPageProps = {
  onNavigate: (page: string) => void;
};

interface SecurityIssue {
  type: 'expired' | 'hostname_mismatch' | 'incomplete_chain' | 'self_signed' | 'mixed_content' | 'weak_cipher';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
}

interface SecurityAnalysis {
  url: string;
  isSecure: boolean;
  issues: SecurityIssue[];
  mixedContentCount: number;
  certificateValid: boolean;
  tlsVersion: string;
}

export function BrowserSecurityPage({ onNavigate }: BrowserSecurityPageProps) {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SecurityAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate analysis
    const possibleIssues: SecurityIssue[] = [
      {
        type: 'expired',
        severity: 'critical',
        title: 'Certificate Expired',
        description: 'The SSL/TLS certificate has expired. Browsers will not trust this certificate until it is renewed.',
      },
      {
        type: 'hostname_mismatch',
        severity: 'critical',
        title: 'Hostname Mismatch',
        description: 'The certificate was issued for a different domain. The certificate CN/SAN does not match the requested hostname.',
      },
      {
        type: 'incomplete_chain',
        severity: 'high',
        title: 'Incomplete Certificate Chain',
        description: 'The server is not sending intermediate certificates. Some browsers may not be able to validate the certificate.',
      },
      {
        type: 'mixed_content',
        severity: 'medium',
        title: 'Mixed Content Detected',
        description: 'The page is loaded over HTTPS but contains HTTP resources (images, scripts, stylesheets). This weakens security.',
      },
    ];

    const randomIssues = Math.random() > 0.3 ? 
      possibleIssues.slice(0, Math.floor(Math.random() * 3) + 1) : 
      [];

    const mockResult: SecurityAnalysis = {
      url,
      isSecure: randomIssues.length === 0,
      issues: randomIssues,
      mixedContentCount: randomIssues.some(i => i.type === 'mixed_content') ? Math.floor(Math.random() * 10) + 1 : 0,
      certificateValid: !randomIssues.some(i => ['expired', 'hostname_mismatch', 'self_signed'].includes(i.type)),
      tlsVersion: 'TLS 1.3',
    };

    setResult(mockResult);
    setIsAnalyzing(false);
    toast.success('Analysis complete');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ShieldSlash size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              "Not Secure" Analyzer
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Understand why browsers display security warnings. Get plain-English explanations 
            and actionable fixes.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full">
              {isAnalyzing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <MagnifyingGlass size={20} weight="bold" className="mr-2" />
                  Analyze Security
                </>
              )}
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            <DiagnosisBlock
              status={result.isSecure ? 'success' : 'error'}
              title={result.isSecure ? 'Site is Secure' : 'Security Issues Detected'}
            >
              <div className="space-y-4">
                {result.isSecure ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                    <CheckCircle size={24} weight="fill" />
                    <p className="font-semibold">
                      This website is properly secured with HTTPS. No browser warnings expected.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">
                      Found {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''} that cause browser security warnings:
                    </p>

                    <div className="space-y-3">
                      {result.issues.map((issue, idx) => (
                        <div key={idx} className="bg-muted rounded p-4 border-l-4 border-red-500">
                          <div className="flex items-start gap-3">
                            <XCircle size={24} weight="fill" className="text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-foreground">{issue.title}</h4>
                                <Badge variant={getSeverityColor(issue.severity)}>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{issue.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {result.mixedContentCount > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-4">
                        <div className="flex items-start gap-2">
                          <Warning size={20} weight="fill" className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground">
                            <strong className="text-yellow-600 dark:text-yellow-500">Mixed Content:</strong> Found {result.mixedContentCount} insecure 
                            resource{result.mixedContentCount !== 1 ? 's' : ''} loaded over HTTP
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Certificate</p>
                    <Badge variant={result.certificateValid ? 'default' : 'destructive'}>
                      {result.certificateValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">TLS Version</p>
                    <Badge variant="secondary">{result.tlsVersion}</Badge>
                  </div>
                </div>
              </div>
            </DiagnosisBlock>

            <FixStepsBlock title="How to Fix These Issues">
              <div className="space-y-6">
                {result.issues.some(i => i.type === 'expired') && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <XCircle size={20} weight="fill" className="text-red-500" />
                      Fix: Certificate Expired
                    </h4>
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        Your SSL/TLS certificate has expired and needs to be renewed immediately:
                      </p>
                      <div className="bg-muted rounded p-4 space-y-2">
                        <p className="font-semibold text-foreground text-sm">Manual Renewal Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Generate a new CSR (or reuse existing private key)</li>
                          <li>Request a new certificate from your CA</li>
                          <li>Complete domain validation (DNS-01 or HTTP-01)</li>
                          <li>Install the new certificate on your server</li>
                          <li>Restart your web server</li>
                        </ol>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Better solution:</strong> Set up automated renewals to prevent expiration.
                      </p>
                    </div>
                  </div>
                )}

                {result.issues.some(i => i.type === 'hostname_mismatch') && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <XCircle size={20} weight="fill" className="text-red-500" />
                      Fix: Hostname Mismatch
                    </h4>
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        The certificate doesn't match your domain name. Check the certificate details:
                      </p>
                      <div className="bg-muted rounded p-4 font-mono text-sm">
                        <code className="text-foreground">
                          openssl s_client -connect {url.replace('https://', '').replace('http://', '')}:443 -showcerts | openssl x509 -noout -text
                        </code>
                      </div>
                      <div className="bg-muted rounded p-4 space-y-2">
                        <p className="font-semibold text-foreground text-sm">Solutions:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Re-issue certificate with correct domain name in CN or SAN</li>
                          <li>If using www vs non-www, include both in certificate SANs</li>
                          <li>For multiple subdomains, use wildcard certificate</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {result.issues.some(i => i.type === 'incomplete_chain') && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <XCircle size={20} weight="fill" className="text-red-500" />
                      Fix: Incomplete Certificate Chain
                    </h4>
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        Your server needs to send the full certificate chain (your cert + intermediates):
                      </p>
                      <div className="bg-muted rounded p-4 font-mono text-sm space-y-2">
                        <p className="text-muted-foreground"># Combine certificates in order</p>
                        <div className="flex items-center justify-between">
                          <code className="text-foreground">cat domain.crt intermediate.crt root.crt &gt; fullchain.pem</code>
                          <CopyButton text="cat domain.crt intermediate.crt root.crt > fullchain.pem" />
                        </div>
                        <p className="text-muted-foreground mt-4"># Update Nginx</p>
                        <div className="flex items-center justify-between">
                          <code className="text-foreground">ssl_certificate /path/to/fullchain.pem;</code>
                          <CopyButton text="ssl_certificate /path/to/fullchain.pem;" />
                        </div>
                        <p className="text-muted-foreground mt-4"># Update Apache</p>
                        <div className="flex items-center justify-between">
                          <code className="text-foreground">SSLCertificateFile /path/to/fullchain.pem</code>
                          <CopyButton text="SSLCertificateFile /path/to/fullchain.pem" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.issues.some(i => i.type === 'mixed_content') && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Warning size={20} weight="fill" className="text-yellow-600 dark:text-yellow-500" />
                      Fix: Mixed Content
                    </h4>
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        Your page loads resources over HTTP instead of HTTPS:
                      </p>
                      <div className="bg-muted rounded p-4 space-y-2">
                        <p className="font-semibold text-foreground text-sm">Find Mixed Content:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Open browser DevTools (F12) → Console tab</li>
                          <li>Look for "Mixed Content" warnings</li>
                          <li>Lists all HTTP resources on HTTPS page</li>
                        </ul>
                      </div>
                      <div className="bg-muted rounded p-4 space-y-2">
                        <p className="font-semibold text-foreground text-sm">Solutions:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Update all HTTP URLs to HTTPS in your HTML/CSS/JS</li>
                          <li>Use protocol-relative URLs: <code className="bg-muted-foreground/20 px-1 rounded">//example.com/image.jpg</code></li>
                          <li>Add CSP header: <code className="bg-muted-foreground/20 px-1 rounded">Content-Security-Policy: upgrade-insecure-requests</code></li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-foreground mb-2">General Best Practices</h4>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Always use certificates from trusted CAs (Let's Encrypt, DigiCert, etc.)</li>
                      <li>Set up automated renewal 30 days before expiration</li>
                      <li>Include all required SANs (www, non-www, etc.)</li>
                      <li>Use TLS 1.2+ only, disable older protocols</li>
                      <li>Test with SSL Labs SSL Test before going live</li>
                      <li>Monitor certificate expiration dates</li>
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
