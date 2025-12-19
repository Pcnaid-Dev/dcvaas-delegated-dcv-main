import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Certificate, Warning, CheckCircle, XCircle, Info, ArrowRight } from '@phosphor-icons/react';
import { checkCertChain, type CertCheckResult } from '@/lib/data';
import { toast } from 'sonner';

type CertCheckerPageProps = {
  onNavigate: (page: string) => void;
};

export function CertCheckerPage({ onNavigate }: CertCheckerPageProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertCheckResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const checkResult = await checkCertChain(domain.trim());
      setResult(checkResult);
      
      if (!checkResult.success) {
        toast.error('Certificate check found issues');
      } else {
        toast.success('Certificate check completed');
      }
    } catch (error) {
      console.error('Certificate check failed:', error);
      toast.error('Failed to check certificate', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle size={20} weight="fill" className="text-red-500" />;
      case 'warning':
        return <Warning size={20} weight="fill" className="text-yellow-500" />;
      case 'info':
        return <CheckCircle size={20} weight="fill" className="text-green-500" />;
      default:
        return <Info size={20} weight="fill" className="text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
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
                onClick={() => onNavigate('cert-checker')}
                className="text-sm font-medium text-primary"
              >
                Cert Checker
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
            <Button onClick={() => onNavigate('dashboard')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Certificate Chain Checker
          </h1>
          <p className="text-xl text-muted-foreground">
            Analyze SSL/TLS certificates and identify common issues
          </p>
        </div>

        {/* Input Form */}
        <Card className="p-6 mb-8">
          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-foreground mb-2">
                Domain and Port
              </label>
              <div className="flex gap-3">
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com:443"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Checking...' : 'Check Certificate'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enter a domain with optional port (defaults to 443). Example: example.com:443
              </p>
            </div>
          </form>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${result.success ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                  {result.success ? (
                    <CheckCircle size={32} weight="fill" className="text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle size={32} weight="fill" className="text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {result.success ? 'Certificate Valid' : 'Certificate Issues Found'}
                  </h2>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><strong>Domain:</strong> {result.domain}:{result.port}</p>
                    <p><strong>Checked at:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Certificate Info */}
            {result.certificateInfo && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Certificate size={20} weight="bold" />
                  Certificate Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subject:</span>
                    <p className="font-mono text-foreground">{result.certificateInfo.subject}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issuer:</span>
                    <p className="font-mono text-foreground">{result.certificateInfo.issuer}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valid From:</span>
                    <p className="font-mono text-foreground">{result.certificateInfo.validFrom}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valid To:</span>
                    <p className="font-mono text-foreground">{result.certificateInfo.validTo}</p>
                  </div>
                  {result.certificateInfo.subjectAltNames.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-muted-foreground">Subject Alternative Names:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {result.certificateInfo.subjectAltNames.map((san, i) => (
                          <span key={i} className="px-2 py-1 bg-muted rounded text-xs font-mono">
                            {san}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Issues */}
            {result.issues.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Analysis Results
                </h3>
                <div className="space-y-3">
                  {result.issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <p className={`font-medium ${getSeverityColor(issue.severity)}`}>
                          {issue.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ArrowRight size={20} weight="bold" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* CTA */}
            {!result.success && (
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    Need Help with Certificate Management?
                  </h3>
                  <p className="text-muted-foreground">
                    DCVaaS automates certificate issuance and renewal with delegated DCV.
                    Never worry about expired certificates again.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button size="lg" onClick={() => onNavigate('dashboard')}>
                      Get Started Free
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => onNavigate('docs')}>
                      Learn More
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Example Domains */}
        {!result && !loading && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Try these examples:
            </h3>
            <div className="flex flex-wrap gap-2">
              {['google.com:443', 'github.com:443', 'cloudflare.com:443', 'example.com:443'].map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => setDomain(example)}
                >
                  {example}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
