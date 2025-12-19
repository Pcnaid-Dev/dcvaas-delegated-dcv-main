import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/CopyButton';
import { 
  Certificate, 
  ArrowRight, 
  CheckCircle, 
  Warning, 
  XCircle,
  Lightning,
  Shield,
  Globe,
  Info
} from '@phosphor-icons/react';
import { testHTTP01, type HTTP01TestResult } from '@/lib/data';
import { toast } from 'sonner';

type HTTP01TesterPageProps = {
  onNavigate: (page: string) => void;
};

export function HTTP01TesterPage({ onNavigate }: HTTP01TesterPageProps) {
  const [domain, setDomain] = useState('');
  const [token, setToken] = useState('test');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HTTP01TestResult | null>(null);

  const handleTest = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const testResult = await testHTTP01(domain, token);
      setResult(testResult);
      
      if (testResult.success) {
        toast.success('HTTP-01 challenge path is accessible');
      } else {
        toast.warning('HTTP-01 challenge path has issues');
      }
    } catch (error: any) {
      console.error('HTTP-01 test failed:', error);
      toast.error(error.message || 'Failed to test HTTP-01 reachability');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadgeVariant = (status: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (status >= 200 && status < 300) return 'default';
    if (status >= 300 && status < 400) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                onClick={() => onNavigate('docs')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Docs
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Dashboard
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Lightning size={32} weight="bold" className="text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                HTTP-01 Reachability Tester
              </h1>
              <p className="text-muted-foreground mt-1">
                Test if your domain can serve ACME HTTP-01 challenges
              </p>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8">
          <Info size={20} weight="bold" className="text-primary" />
          <AlertDescription className="ml-2">
            This tool checks if the <code className="px-1.5 py-0.5 bg-muted rounded text-sm">/.well-known/acme-challenge/</code> path
            is accessible on your domain. It follows redirects, detects common issues, and helps diagnose HTTP-01 validation problems.
          </AlertDescription>
        </Alert>

        {/* Input Form */}
        <Card className="p-6 mb-8">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="domain" className="text-sm font-medium mb-2 block">
                  Domain Name
                </Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleTest();
                    }
                  }}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="token" className="text-sm font-medium mb-2 block">
                  Token / Filename
                </Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="test"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <Button 
              onClick={handleTest} 
              disabled={isLoading || !domain.trim()}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Testing...
                </>
              ) : (
                <>
                  <Lightning size={18} weight="bold" className="mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${result.success ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                  {result.success ? (
                    <CheckCircle size={32} weight="bold" className="text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle size={32} weight="bold" className="text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    {result.success ? 'HTTP-01 Challenge Path Accessible' : 'HTTP-01 Challenge Path Has Issues'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge variant={getStatusBadgeVariant(result.finalStatus)}>
                      Status: {result.finalStatus}
                    </Badge>
                    <span className="text-sm text-muted-foreground">•</span>
                    <code className="text-sm font-mono px-2 py-1 bg-muted rounded">
                      {result.finalUrl}
                    </code>
                  </div>
                  {result.error && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </Card>

            {/* Redirect Chain */}
            {result.redirectChain.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={24} weight="bold" className="text-primary" />
                  <h3 className="text-lg font-semibold">Request Chain</h3>
                  <Badge variant="outline">{result.redirectChain.length} step{result.redirectChain.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="space-y-3">
                  {result.redirectChain.map((step, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                            ${step.status >= 200 && step.status < 300 ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 
                              step.status >= 300 && step.status < 400 ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' :
                              'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'}`}>
                            {index + 1}
                          </div>
                          {index < result.redirectChain.length - 1 && (
                            <div className="w-0.5 h-8 bg-border my-1" />
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getStatusBadgeVariant(step.status)} className="font-mono">
                              {step.status}
                            </Badge>
                            <code className="text-sm font-mono text-muted-foreground break-all">
                              {step.url}
                            </code>
                          </div>
                          {step.headers.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <ArrowRight size={16} weight="bold" />
                              <span className="font-mono">{step.headers.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Diagnostic Flags */}
            {Object.values(result.flags).some(v => v) && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Warning size={24} weight="bold" className="text-orange-600 dark:text-orange-400" />
                  <h3 className="text-lg font-semibold">Detected Issues</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.flags.forcedHttps && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Shield size={20} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium">Forced HTTPS Redirect</span>
                    </div>
                  )}
                  {result.flags.is403 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <XCircle size={20} className="text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">403 Forbidden</span>
                    </div>
                  )}
                  {result.flags.is404 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <XCircle size={20} className="text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">404 Not Found</span>
                    </div>
                  )}
                  {result.flags.blockedPath && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Warning size={20} className="text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium">Path Blocked</span>
                    </div>
                  )}
                  {result.flags.wrongVhost && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Warning size={20} className="text-orange-600 dark:text-orange-400" />
                      <span className="text-sm font-medium">Wrong Virtual Host</span>
                    </div>
                  )}
                  {result.flags.hasCaching && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Info size={20} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium">Caching Detected</span>
                    </div>
                  )}
                  {result.flags.hasWafChallenge && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Shield size={20} className="text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">WAF/Security Challenge</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Response Body */}
            {result.bodyPreview && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Response Body Preview</h3>
                  <CopyButton text={result.bodyPreview} />
                </div>
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words">
                  {result.bodyPreview}
                </pre>
              </Card>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
                <ul className="space-y-3">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {suggestion.includes('💡') ? (
                          <Lightning size={20} weight="fill" className="text-primary" />
                        ) : (
                          <Info size={20} weight="bold" className="text-primary" />
                        )}
                      </div>
                      <span className="text-sm">{suggestion.replace('💡 ', '')}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-6" />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">Switch to DNS-01 Validation</h4>
                    <p className="text-sm text-muted-foreground">
                      DNS-01 validation is more reliable and doesn't require HTTP accessibility
                    </p>
                  </div>
                  <Button onClick={() => onNavigate('dashboard')} variant="default">
                    Get Started
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
