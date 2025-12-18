import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Certificate, 
  MagnifyingGlass, 
  CheckCircle, 
  XCircle, 
  Warning,
  Clock,
  ShieldCheck
} from '@phosphor-icons/react';
import { checkCNAME } from '@/lib/dns';

type DebuggerPageProps = {
  onNavigate: (page: string) => void;
};

type ValidationResult = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
};

type DiagnosticResults = {
  domain: string;
  timestamp: string;
  cnameCheck?: {
    success: boolean;
    found: boolean;
    target?: string;
    error?: string;
  };
  caaCheck?: {
    success: boolean;
    records: string[];
    blocksIssuance: boolean;
    recommendation?: string;
  };
  dnsPropagation?: {
    status: 'complete' | 'partial' | 'none';
    details: string;
  };
  overallStatus: 'valid' | 'issues_found' | 'blocked';
  recommendations: string[];
};

export function DebuggerPage({ onNavigate }: DebuggerPageProps) {
  const [domain, setDomain] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCAA = async (domain: string) => {
    try {
      const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
        domain
      )}&type=CAA`;
      
      const response = await fetch(dohUrl, {
        headers: {
          Accept: 'application/dns-json',
        },
      });
      
      if (!response.ok) {
        return {
          success: false,
          records: [],
          blocksIssuance: false,
          recommendation: 'Unable to check CAA records'
        };
      }
      
      const data = await response.json();
      const records: string[] = [];
      let blocksIssuance = false;
      
      if (data.Answer && data.Answer.length > 0) {
        for (const record of data.Answer) {
          if (record.type === 257) { // CAA record type
            const caaData = record.data;
            records.push(caaData);
            
            // Check if CAA record blocks Let's Encrypt or ZeroSSL
            if (caaData.includes('issue') || caaData.includes('issuewild')) {
              const allowsLE = caaData.includes('letsencrypt.org');
              const allowsZeroSSL = caaData.includes('sectigo.com') || caaData.includes('zerossl.com');
              
              if (!allowsLE && !allowsZeroSSL) {
                blocksIssuance = true;
              }
            }
          }
        }
      }
      
      return {
        success: true,
        records,
        blocksIssuance,
        recommendation: blocksIssuance 
          ? 'CAA records are blocking certificate issuance. Add "letsencrypt.org" or "sectigo.com" to your CAA records.'
          : records.length > 0 
            ? 'CAA records found and allow certificate issuance.' 
            : 'No CAA records found (issuance allowed).'
      };
    } catch (error) {
      return {
        success: false,
        records: [],
        blocksIssuance: false,
        recommendation: 'Unable to check CAA records'
      };
    }
  };

  const runDiagnostics = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResults(null);

    try {
      // Validate domain format
      const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
      if (!domainRegex.test(domain.trim())) {
        setError('Invalid domain format. Please enter a valid domain (e.g., example.com)');
        setIsChecking(false);
        return;
      }

      const cleanDomain = domain.trim().toLowerCase();
      
      // Perform CNAME check (using example target)
      const cnameTarget = 'acme-verify.dcvaas.com';
      const cnameResult = await checkCNAME(cleanDomain, cnameTarget);
      
      // Perform CAA check
      const caaResult = await checkCAA(cleanDomain);
      
      // Determine DNS propagation status
      let dnsPropagation: DiagnosticResults['dnsPropagation'] = {
        status: 'none',
        details: 'CNAME record not found'
      };
      
      if (cnameResult.found) {
        if (cnameResult.success) {
          dnsPropagation = {
            status: 'complete',
            details: 'CNAME record is properly configured and propagated'
          };
        } else {
          dnsPropagation = {
            status: 'partial',
            details: `CNAME record found but points to wrong target: ${cnameResult.target}`
          };
        }
      }
      
      // Compile recommendations
      const recommendations: string[] = [];
      
      if (!cnameResult.found) {
        recommendations.push('Add a CNAME record: _acme-challenge.' + cleanDomain + ' CNAME ' + cnameTarget);
        recommendations.push('Wait 5-15 minutes for DNS propagation after adding the record');
      } else if (!cnameResult.success) {
        recommendations.push('Update your CNAME record to point to: ' + cnameTarget);
        recommendations.push('Current target (' + cnameResult.target + ') is incorrect');
      }
      
      if (caaResult.blocksIssuance) {
        recommendations.push('Update CAA records to allow Let\'s Encrypt: add "0 issue \\"letsencrypt.org\\""');
        recommendations.push('Or allow Sectigo/ZeroSSL: add "0 issue \\"sectigo.com\\""');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('✓ Domain is properly configured for certificate validation');
        recommendations.push('If you\'re still experiencing issues, check your DNS provider\'s status page');
      }
      
      // Determine overall status
      let overallStatus: DiagnosticResults['overallStatus'] = 'valid';
      if (caaResult.blocksIssuance) {
        overallStatus = 'blocked';
      } else if (!cnameResult.success) {
        overallStatus = 'issues_found';
      }
      
      setResults({
        domain: cleanDomain,
        timestamp: new Date().toISOString(),
        cnameCheck: cnameResult,
        caaCheck: caaResult,
        dnsPropagation,
        overallStatus,
        recommendations
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during diagnostics');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResults['overallStatus']) => {
    switch (status) {
      case 'valid':
        return <CheckCircle size={48} weight="fill" className="text-success" />;
      case 'blocked':
        return <XCircle size={48} weight="fill" className="text-error" />;
      case 'issues_found':
        return <Warning size={48} weight="fill" className="text-warning" />;
    }
  };

  const getStatusTitle = (status: DiagnosticResults['overallStatus']) => {
    switch (status) {
      case 'valid':
        return 'Domain is properly configured';
      case 'blocked':
        return 'Certificate issuance blocked';
      case 'issues_found':
        return 'Configuration issues detected';
    }
  };

  const getStatusMessage = (status: DiagnosticResults['overallStatus']) => {
    switch (status) {
      case 'valid':
        return 'Your domain is correctly configured for SSL/TLS certificate validation.';
      case 'blocked':
        return 'Your CAA records are preventing certificate issuance. Follow the recommendations below.';
      case 'issues_found':
        return 'We found some issues with your DNS configuration. Follow the recommendations below to fix them.';
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
            <nav className="hidden md:flex items-center gap-6">
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
                onClick={() => onNavigate('debugger')}
                className="text-sm font-medium text-primary"
              >
                Debugger
              </button>
            </nav>
            <Button onClick={() => onNavigate('dashboard')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MagnifyingGlass size={32} weight="bold" className="text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Stuck Validation Debugger
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Find out why your domain isn't validating. We'll check your DNS records,
            CAA configuration, and propagation status to help you resolve issues quickly.
          </p>
        </div>

        {/* Main Diagnostic Tool */}
        <Card className="p-8 mb-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="domain" className="text-base font-semibold mb-2 block">
                Domain Name
              </Label>
              <div className="flex gap-3">
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      runDiagnostics();
                    }
                  }}
                  className="flex-1"
                  disabled={isChecking}
                />
                <Button
                  onClick={runDiagnostics}
                  disabled={isChecking}
                  size="lg"
                  className="px-8"
                >
                  {isChecking ? (
                    <>
                      <Clock size={20} className="mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlass size={20} className="mr-2" />
                      Run Diagnostics
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your domain without "www" (e.g., example.com, not www.example.com)
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle size={20} weight="fill" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card className="p-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {getStatusIcon(results.overallStatus)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {getStatusTitle(results.overallStatus)}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {getStatusMessage(results.overallStatus)}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Domain:</span> {results.domain}
                    <span className="mx-3">•</span>
                    <span className="font-medium">Checked:</span> {new Date(results.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>

            {/* Detailed Results */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* CNAME Check */}
              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <ShieldCheck 
                    size={24} 
                    weight="fill" 
                    className={results.cnameCheck?.success ? 'text-success' : 'text-error'} 
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">CNAME Record</h3>
                    <p className="text-sm text-muted-foreground">
                      {results.cnameCheck?.found ? 'Record found' : 'Record not found'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {results.cnameCheck?.found ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-mono text-foreground">{results.cnameCheck.target}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={results.cnameCheck.success ? 'text-success' : 'text-error'}>
                          {results.cnameCheck.success ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      {results.cnameCheck.error && (
                        <p className="text-error text-xs mt-2">{results.cnameCheck.error}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-error">
                      No CNAME record found for _acme-challenge.{results.domain}
                    </p>
                  )}
                </div>
              </Card>

              {/* CAA Check */}
              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <ShieldCheck 
                    size={24} 
                    weight="fill" 
                    className={results.caaCheck?.blocksIssuance ? 'text-error' : 'text-success'} 
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">CAA Records</h3>
                    <p className="text-sm text-muted-foreground">
                      {results.caaCheck?.records.length || 0} record(s) found
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {results.caaCheck?.records.length ? (
                    <>
                      <div className="space-y-1">
                        {results.caaCheck.records.map((record, idx) => (
                          <div key={idx} className="font-mono text-xs bg-muted p-2 rounded">
                            {record}
                          </div>
                        ))}
                      </div>
                      <p className={results.caaCheck.blocksIssuance ? 'text-error' : 'text-success'}>
                        {results.caaCheck.recommendation}
                      </p>
                    </>
                  ) : (
                    <p className="text-success">
                      No CAA records found. Certificate issuance is allowed.
                    </p>
                  )}
                </div>
              </Card>

              {/* DNS Propagation */}
              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Clock 
                    size={24} 
                    weight="fill" 
                    className={
                      results.dnsPropagation?.status === 'complete' 
                        ? 'text-success' 
                        : results.dnsPropagation?.status === 'partial' 
                          ? 'text-warning' 
                          : 'text-error'
                    } 
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">DNS Propagation</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {results.dnsPropagation?.status.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {results.dnsPropagation?.details}
                </p>
              </Card>
            </div>

            {/* Recommendations */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Recommendations
              </h2>
              <div className="space-y-3">
                {results.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {rec.startsWith('✓') ? (
                        <CheckCircle size={20} weight="fill" className="text-success" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-foreground flex-1">
                      {rec.replace('✓ ', '')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* CTA */}
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-bold text-foreground">
                  Ready to automate your certificate management?
                </h3>
                <p className="text-muted-foreground">
                  DCVaaS handles all the complexity for you with automated issuance and renewal.
                </p>
                <Button size="lg" onClick={() => onNavigate('dashboard')}>
                  Get Started Free
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Info Cards - Show when no results */}
        {!results && !isChecking && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 text-center">
              <ShieldCheck size={32} weight="fill" className="text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">CNAME Validation</h3>
              <p className="text-sm text-muted-foreground">
                Verify that your CNAME record is correctly configured and propagated
              </p>
            </Card>
            <Card className="p-6 text-center">
              <ShieldCheck size={32} weight="fill" className="text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">CAA Records</h3>
              <p className="text-sm text-muted-foreground">
                Check if your CAA records allow certificate issuance
              </p>
            </Card>
            <Card className="p-6 text-center">
              <Clock size={32} weight="fill" className="text-success mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Propagation Status</h3>
              <p className="text-sm text-muted-foreground">
                Monitor DNS propagation and get timing recommendations
              </p>
            </Card>
          </div>
        )}
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
