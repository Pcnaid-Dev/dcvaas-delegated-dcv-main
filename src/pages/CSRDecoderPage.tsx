// src/pages/CSRDecoderPage.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Certificate, Warning, CheckCircle, Copy, Sparkle } from '@phosphor-icons/react';
import { parsePEM, isValidPEM, type PEMInfo } from '@/lib/pem-parser';
import { CopyButton } from '@/components/CopyButton';
import { toast } from 'sonner';

type CSRDecoderPageProps = {
  onNavigate: (page: string) => void;
};

export function CSRDecoderPage({ onNavigate }: CSRDecoderPageProps) {
  const [pemInput, setPemInput] = useState('');
  const [parsedInfo, setParsedInfo] = useState<PEMInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleParse = () => {
    setError(null);
    setParsedInfo(null);
    
    if (!pemInput.trim()) {
      setError('Please enter a PEM-encoded certificate or CSR');
      return;
    }

    if (!isValidPEM(pemInput)) {
      setError('Invalid PEM format. Please paste a valid certificate or CSR.');
      return;
    }

    setIsLoading(true);
    
    try {
      const info = parsePEM(pemInput);
      setParsedInfo(info);
      toast.success(info.type === 'certificate' ? 'Certificate parsed successfully' : 'CSR parsed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse PEM');
      toast.error('Failed to parse PEM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPemInput('');
    setParsedInfo(null);
    setError(null);
  };

  const hasSANsMissing = parsedInfo && parsedInfo.sans.length === 0;

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
              <button
                onClick={() => onNavigate('csr-decoder')}
                className="text-sm font-medium text-primary"
              >
                CSR Decoder
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Certificate size={32} weight="bold" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              CSR / Certificate Decoder
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Paste your PEM-encoded certificate or CSR to analyze its contents, 
            verify SAN configuration, and identify common issues.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Paste PEM Content
              </h2>
              <div className="space-y-4">
                <Textarea
                  value={pemInput}
                  onChange={(e) => setPemInput(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0UG...
...
-----END CERTIFICATE-----

or

-----BEGIN CERTIFICATE REQUEST-----
MIICvjCCAaYCAQAweTELMAkGA1...
...
-----END CERTIFICATE REQUEST-----"
                  className="min-h-80 font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleParse} 
                    disabled={isLoading || !pemInput.trim()}
                    className="flex-1"
                  >
                    {isLoading ? 'Parsing...' : 'Decode PEM'}
                  </Button>
                  <Button 
                    onClick={handleClear} 
                    variant="outline"
                    disabled={!pemInput && !parsedInfo}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Card>

            {/* Sample Data */}
            <Card className="p-6 bg-muted/50">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Need a sample?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Click below to load a sample certificate for testing
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  // Sample self-signed certificate for demo
                  setPemInput(`-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0UGYwu9e8MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTE1MDAwMDAwWhcNMjUwMTE1MDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onL
RnrxL0c5vN8J5R5XoHRvY1xjDqU5cHq9q84nZc3Ot7r5wBgJvq+ivoEVnw6k8tNc
lpEYLfU9p6zW4pC3C5d0pLKM4JxKLxZiV8VvJVQJqNhR2kUXJM5v8VqV8sV7zg7P
oJNwFHbBqKqPmNQQDFHq0gxP6nYJfqGZRPHqnl0kWDQBGcS8NpQqVgYLxJrZq8bV
qSPXkPz8XxFXvvMNqVQTxQEWa0EqXpGnJPqVn5tjTfKsXqEIgA4eSdvVMNOFDVPH
GexPtAM6wPsWH7vYGExKqhzfGNkP7wIDAQABo1AwTjAdBgNVHQ4EFgQU8Z0h7Y8v
qLQvpqIjV5I3hX2YbEEwHwYDVR0jBBgwFoAU8Z0h7Y8vqLQvpqIjV5I3hX2YbEEw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAiKZqV3f1JQPT9d6r2Jvz
lHxPCgXmgwMnXKGwFqWPqV4mBcGKrEJHGAqUQNxH4jVkOqVjBqM8hFnLqX7MeRpK
vPqCfQ2dCjKYnKPpqVPmLqVXcFgLpYNxZWdvYVkKSPHGKqVHqVYqVPXvZGKlVqV=
-----END CERTIFICATE-----`);
                  toast.info('Sample certificate loaded');
                }}
              >
                Load Sample Certificate
              </Button>
            </Card>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <Warning size={20} weight="fill" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {parsedInfo && (
              <>
                {/* SAN Missing Warning */}
                {hasSANsMissing && (
                  <Alert variant="destructive" className="border-yellow-500 bg-yellow-500/10">
                    <Warning size={20} weight="fill" className="text-yellow-500" />
                    <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                      <strong>Warning: SAN Missing!</strong>
                      <p className="mt-1">
                        This {parsedInfo.type === 'certificate' ? 'certificate' : 'CSR'} does not include 
                        Subject Alternative Names (SANs). Modern browsers and certificate authorities require 
                        SANs for domain validation. This may cause the classic re-issue loop.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Type Badge */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      Decoded Information
                    </h2>
                    <Badge variant={parsedInfo.type === 'certificate' ? 'default' : 'secondary'}>
                      {parsedInfo.type === 'certificate' ? 'Certificate' : 'Certificate Request (CSR)'}
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    {/* Subject */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        Subject
                      </h3>
                      <div className="bg-muted rounded-lg p-4 space-y-2">
                        {Object.keys(parsedInfo.subject).length > 0 ? (
                          Object.entries(parsedInfo.subject).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-sm">
                              <span className="font-mono text-muted-foreground min-w-12">{key}:</span>
                              <span className="font-mono text-foreground flex-1">{value}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No subject information found</p>
                        )}
                      </div>
                    </div>

                    {/* SANs */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        Subject Alternative Names (SANs)
                        {parsedInfo.sans.length > 0 && (
                          <CheckCircle size={16} weight="fill" className="text-green-500" />
                        )}
                      </h3>
                      <div className="bg-muted rounded-lg p-4">
                        {parsedInfo.sans.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {parsedInfo.sans.map((san, idx) => (
                              <Badge key={idx} variant="outline" className="font-mono">
                                {san}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
                            <Warning size={16} weight="fill" />
                            <span>No SANs found</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Key Type
                        </h3>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="font-mono text-sm text-foreground">
                            {parsedInfo.keyType}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Key Size
                        </h3>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="font-mono text-sm text-foreground">
                            {parsedInfo.keySize ? `${parsedInfo.keySize} bits` : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Signature Algorithm */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Signature Algorithm
                      </h3>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="font-mono text-sm text-foreground">
                          {parsedInfo.signatureAlgorithm}
                        </p>
                      </div>
                    </div>

                    {/* Certificate-specific fields */}
                    {parsedInfo.type === 'certificate' && (
                      <>
                        {/* Issuer */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-2">
                            Issuer
                          </h3>
                          <div className="bg-muted rounded-lg p-4 space-y-2">
                            {Object.keys(parsedInfo.issuer).length > 0 ? (
                              Object.entries(parsedInfo.issuer).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-2 text-sm">
                                  <span className="font-mono text-muted-foreground min-w-12">{key}:</span>
                                  <span className="font-mono text-foreground flex-1">{value}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No issuer information found</p>
                            )}
                          </div>
                        </div>

                        {/* Validity */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-2">
                            Validity Period
                          </h3>
                          <div className="bg-muted rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground min-w-24">Not Before:</span>
                              <span className="font-mono text-foreground">
                                {parsedInfo.validity.notBefore.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground min-w-24">Not After:</span>
                              <span className="font-mono text-foreground">
                                {parsedInfo.validity.notAfter.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground min-w-24">Valid for:</span>
                              <span className="font-mono text-foreground">
                                {Math.ceil(
                                  (parsedInfo.validity.notAfter.getTime() - 
                                   parsedInfo.validity.notBefore.getTime()) / 
                                  (1000 * 60 * 60 * 24)
                                )} days
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Serial Number */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-2">
                            Serial Number
                          </h3>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="font-mono text-sm text-foreground">
                              {parsedInfo.serialNumber}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* CTA Section */}
                <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Sparkle size={24} weight="fill" className="text-primary mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Need a proper CSR with SANs?
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          DCVaaS can help you generate the correct CSR with proper SANs 
                          and handle one-click domain validation via delegated DCV.
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="lg" 
                      className="w-full"
                      onClick={() => onNavigate('dashboard')}
                    >
                      Generate CSR + One-Click DV
                    </Button>
                  </div>
                </Card>
              </>
            )}

            {!parsedInfo && !error && (
              <Card className="p-12 text-center">
                <Certificate size={48} weight="thin" className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Paste a PEM certificate or CSR to see decoded information
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              About This Tool
            </h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                This CSR/Certificate decoder helps you quickly analyze PEM-encoded certificates 
                and certificate signing requests (CSRs) to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Verify the subject and issuer information</li>
                <li>Check for proper Subject Alternative Names (SANs) configuration</li>
                <li>Inspect key type, size, and signature algorithms</li>
                <li>Review certificate validity periods</li>
                <li>Identify common misconfigurations that cause issuance failures</li>
              </ul>
              <p>
                <strong className="text-foreground">Why are SANs important?</strong> Modern browsers 
                and CAs require Subject Alternative Names in certificates. The Common Name (CN) 
                field alone is no longer sufficient. Missing SANs can cause certificate validation 
                failures and the classic "re-issue loop" where certificates repeatedly fail validation.
              </p>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-card/30 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Certificate size={24} weight="bold" className="text-primary" />
              <span className="font-semibold text-foreground">DCVaaS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DCVaaS. Secure certificate automation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
