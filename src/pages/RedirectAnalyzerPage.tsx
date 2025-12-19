import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Certificate, ArrowRight, Warning, CheckCircle, Globe, ShieldCheck } from '@phosphor-icons/react';
import { analyzeRedirects, type RedirectAnalysis, type RedirectHop } from '@/lib/data';
import { toast } from 'sonner';

type RedirectAnalyzerPageProps = {
  onNavigate: (page: string) => void;
};

export function RedirectAnalyzerPage({ onNavigate }: RedirectAnalyzerPageProps) {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<RedirectAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) {
      toast.error('Please enter a domain or URL');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeRedirects(input);
      setAnalysis(result);
      
      if (result.validationBreaks.length > 0) {
        toast.error('Validation breaks detected!');
      } else if (result.warnings.length > 0) {
        toast.warning('Some warnings found');
      } else {
        toast.success('Analysis complete');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze redirects');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze();
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
                onClick={() => onNavigate('redirect-analyzer')}
                className="text-sm font-medium text-primary"
              >
                Redirect Analyzer
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
            <Globe size={32} weight="bold" className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Redirect Chain Analyzer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Detect redirect chains that break HTTP-01 validation. Discover if your site's redirects 
            will cause certificate validation failures.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-8 mb-8 max-w-3xl mx-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="domain-input" className="block text-sm font-medium text-foreground mb-2">
                Enter Domain or URL
              </label>
              <div className="flex gap-3">
                <Input
                  id="domain-input"
                  type="text"
                  placeholder="example.com or https://www.example.com"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 text-lg"
                  disabled={isAnalyzing}
                />
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing}
                  size="lg"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a domain name (e.g., example.com) or full URL (e.g., https://example.com) to analyze its redirect chain.
            </p>
          </div>
        </Card>

        {/* Results Section */}
        {analysis && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Summary Card */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  analysis.validationBreaks.length > 0 
                    ? 'bg-destructive/10 text-destructive' 
                    : analysis.warnings.length > 0
                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    : 'bg-green-500/10 text-green-600 dark:text-green-400'
                }`}>
                  {analysis.validationBreaks.length > 0 ? (
                    <Warning size={32} weight="fill" />
                  ) : (
                    <CheckCircle size={32} weight="fill" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Analysis Results
                  </h2>
                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      <strong>Input:</strong> {analysis.inputUrl}
                    </p>
                    <p>
                      <strong>Final URL:</strong> {analysis.finalUrl}
                    </p>
                    <p>
                      <strong>Total Redirects:</strong> {analysis.totalHops - 1}
                    </p>
                    <p>
                      <strong>Host Changes:</strong> {analysis.hasHostChange ? 'Yes ⚠️' : 'No ✓'}
                    </p>
                    <p>
                      <strong>Protocol Changes:</strong> {analysis.hasProtocolChange ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Redirect Chain Visualization */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Redirect Chain
              </h3>
              <div className="space-y-4">
                {analysis.hops.map((hop, index) => (
                  <div key={index}>
                    <RedirectHopCard 
                      hop={hop} 
                      isFirst={index === 0}
                      isLast={index === analysis.hops.length - 1}
                      hopNumber={index + 1}
                    />
                    {index < analysis.hops.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowRight size={24} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Validation Breaks */}
            {analysis.validationBreaks.length > 0 && (
              <Card className="p-6 border-destructive/50 bg-destructive/5">
                <div className="flex items-start gap-3 mb-4">
                  <Warning size={24} weight="fill" className="text-destructive mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Validation Breaks Detected
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      The following issues will cause HTTP-01 validation to fail:
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {analysis.validationBreaks.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-destructive font-bold">•</span>
                      <span className="text-foreground">{issue}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
                <div className="flex items-start gap-3 mb-4">
                  <Warning size={24} weight="fill" className="text-yellow-600 dark:text-yellow-400 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Warnings
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      These redirect patterns may cause issues:
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {analysis.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                      <span className="text-foreground">{warning}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Recommendation CTA */}
            <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <ShieldCheck size={32} weight="fill" className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Recommendation
                  </h3>
                  <p className="text-foreground mb-6 leading-relaxed whitespace-pre-line">
                    {analysis.recommendation}
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      size="lg" 
                      onClick={() => onNavigate('dashboard')}
                    >
                      Try DCVaaS Free
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => onNavigate('docs')}
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* How It Works Section */}
        {!analysis && (
          <div className="max-w-5xl mx-auto mt-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Enter URL
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  Enter any domain or URL you want to check for redirect issues.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Follow Chain
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  We follow all redirects and detect any changes in host or protocol.
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Get Results
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  See exactly where validation breaks occur and how to fix them.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Why DNS-01 Section */}
        <div className="max-w-5xl mx-auto mt-16 mb-8">
          <Card className="p-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
              Why DNS-01 Validation is Better
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Warning size={24} className="text-destructive" />
                  HTTP-01 Limitations
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Breaks on host changes (apex → www)</li>
                  <li>• Fails with cross-domain redirects</li>
                  <li>• Cannot validate wildcard certificates</li>
                  <li>• Requires port 80 open</li>
                  <li>• Vulnerable to redirect loops</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                  DNS-01 Advantages
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Immune to redirect issues</li>
                  <li>• Works with any redirect configuration</li>
                  <li>• Supports wildcard certificates</li>
                  <li>• No firewall/port requirements</li>
                  <li>• More secure (delegated validation)</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

// Component to display individual redirect hop
function RedirectHopCard({ 
  hop, 
  isFirst, 
  isLast, 
  hopNumber 
}: { 
  hop: RedirectHop; 
  isFirst: boolean; 
  isLast: boolean; 
  hopNumber: number;
}) {
  const hasError = Boolean(hop.error);
  const isRedirect = hop.statusCode >= 300 && hop.statusCode < 400;

  return (
    <div className={`p-4 rounded-lg border ${
      hasError 
        ? 'border-destructive/50 bg-destructive/5' 
        : isLast 
        ? 'border-green-500/50 bg-green-500/5' 
        : 'border-border bg-card'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-muted-foreground">
              Hop {hopNumber}
              {isFirst && ' (Start)'}
              {isLast && ' (Final)'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono ${
              hasError
                ? 'bg-destructive/20 text-destructive'
                : isRedirect
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-green-500/20 text-green-600 dark:text-green-400'
            }`}>
              {hop.statusCode || 'ERROR'}
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-mono text-foreground break-all">
              {hop.url}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Protocol: <strong className="text-foreground">{hop.protocol}</strong></span>
              <span>Host: <strong className="text-foreground">{hop.host}</strong></span>
            </div>
            {hop.location && (
              <p className="text-xs text-muted-foreground">
                → Redirects to: <span className="text-foreground font-mono">{hop.location}</span>
              </p>
            )}
            {hop.error && (
              <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                <Warning size={16} weight="fill" />
                {hop.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
