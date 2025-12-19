import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Certificate, MagnifyingGlass, ShieldCheck, ShieldWarning, Copy, Check, Info } from '@phosphor-icons/react';
import { lookupCAA } from '@/lib/dns';
import {
  parseCAARecord,
  buildCAAPolicy,
  extractAllowedCAs,
  analyzeCAAPolicy,
  getCAName,
  generateCloudflareCAA,
  type CAAInspectionResult,
  type CAARecord,
} from '@/lib/caa';
import { toast } from 'sonner';

type CAAInspectorPageProps = {
  onNavigate: (page: string) => void;
};

export function CAAInspectorPage({ onNavigate }: CAAInspectorPageProps) {
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CAAInspectionResult | null>(null);
  const [copiedPolicy, setCopiedPolicy] = useState(false);

  const handleInspect = async () => {
    if (!domain || domain.trim() === '') {
      toast.error('Please enter a domain name');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Clean domain input
      const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      // Lookup CAA records
      const lookup = await lookupCAA(cleanDomain);

      if (!lookup.success) {
        toast.error(lookup.error || 'Failed to lookup CAA records');
        setIsLoading(false);
        return;
      }

      // Parse CAA records
      const records: CAARecord[] = [];
      const errors: string[] = [];

      for (const rawRecord of lookup.records) {
        const parsed = parseCAARecord(rawRecord);
        if (parsed) {
          records.push(parsed);
        } else {
          errors.push(`Failed to parse CAA record: ${rawRecord}`);
        }
      }

      // Build policy
      const policy = buildCAAPolicy(records);
      const allowedCAs = extractAllowedCAs(policy);
      const warnings = analyzeCAAPolicy(cleanDomain, records, policy);

      const inspectionResult: CAAInspectionResult = {
        domain: cleanDomain,
        hasCAA: lookup.found,
        records,
        policy,
        allowedCAs,
        warnings,
        errors,
        isValid: errors.length === 0 && warnings.filter(w => w.severity === 'error').length === 0,
      };

      setResult(inspectionResult);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPolicy = async () => {
    if (!result) return;

    const policy = generateCloudflareCAA(result.domain);
    const policyText = policy.join('\n');

    try {
      await navigator.clipboard.writeText(policyText);
      setCopiedPolicy(true);
      toast.success('Copied CAA policy to clipboard');
      setTimeout(() => setCopiedPolicy(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
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
                onClick={() => onNavigate('caa-inspector')}
                className="text-sm font-medium text-primary"
              >
                CAA Inspector
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <ShieldCheck size={32} weight="bold" className="text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            CAA Record Inspector
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Inspect and validate your Certification Authority Authorization (CAA) records. 
            Ensure your domain can issue SSL/TLS certificates with Cloudflare.
          </p>
        </div>

        {/* Inspector Tool */}
        <Card className="p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Domain Name
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                  className="flex-1"
                />
                <Button
                  onClick={handleInspect}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                      Inspecting...
                    </>
                  ) : (
                    <>
                      <MagnifyingGlass size={20} weight="bold" />
                      Inspect CAA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <Alert>
              <Info size={16} weight="bold" />
              <AlertDescription>
                <strong>What are CAA records?</strong> CAA (Certification Authority Authorization) 
                records allow domain owners to specify which Certificate Authorities (CAs) are 
                authorized to issue certificates for their domains. This adds an extra layer of 
                security and control.
              </AlertDescription>
            </Alert>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {result.domain}
                  </h2>
                  {result.hasCAA ? (
                    <Badge variant="default" className="gap-1">
                      <ShieldCheck size={14} weight="bold" />
                      CAA Records Found
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Info size={14} weight="bold" />
                      No CAA Records
                    </Badge>
                  )}
                </div>
                {!result.isValid && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldWarning size={14} weight="bold" />
                    Issues Detected
                  </Badge>
                )}
              </div>

              {!result.hasCAA && (
                <Alert>
                  <Info size={16} weight="bold" />
                  <AlertDescription>
                    <strong>No CAA records found.</strong> This means any Certificate Authority 
                    can issue certificates for this domain. While this is common, adding CAA 
                    records provides better security by explicitly specifying authorized CAs.
                  </AlertDescription>
                </Alert>
              )}
            </Card>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  ⚠️ Warnings & Issues
                </h3>
                <div className="space-y-3">
                  {result.warnings.map((warning, index) => (
                    <Alert
                      key={index}
                      variant={warning.severity === 'error' ? 'destructive' : 'default'}
                      className="border-l-4"
                    >
                      <ShieldWarning size={16} weight="bold" />
                      <AlertDescription>
                        <strong>
                          {warning.severity === 'error' ? 'Error' : 'Warning'}:
                        </strong>{' '}
                        {warning.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </Card>
            )}

            {/* Allowed CAs */}
            {result.hasCAA && result.allowedCAs.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  ✅ Authorized Certificate Authorities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.allowedCAs.map((ca, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck size={16} weight="bold" className="text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {getCAName(ca)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {ca}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* CAA Policy Details */}
            {result.hasCAA && result.records.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📋 CAA Policy Details
                </h3>
                <div className="space-y-3">
                  {result.records.map((record, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-950 dark:bg-black rounded-lg border border-slate-800 dark:border-slate-900"
                    >
                      <div className="font-mono text-sm space-y-1">
                        <div className="text-slate-500">
                          # Record {index + 1}
                        </div>
                        <div>
                          <span className="text-blue-400">Flags: </span>
                          <span className="text-slate-300">{record.flags}</span>
                        </div>
                        <div>
                          <span className="text-blue-400">Tag: </span>
                          <span className="text-amber-300">{record.tag}</span>
                        </div>
                        <div>
                          <span className="text-blue-400">Value: </span>
                          <span className="text-green-400">{record.value}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* CTA Section */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Generate a Safe CAA Policy
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Use our recommended CAA policy for Cloudflare for SaaS. This policy allows 
                    the Certificate Authorities used by Cloudflare to issue certificates for your domain.
                  </p>
                </div>

                {/* Recommended Policy */}
                <div className="bg-slate-950 dark:bg-black p-6 rounded-lg border border-slate-800 dark:border-slate-900 text-left max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-400">
                      Recommended CAA Records
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPolicy}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      {copiedPolicy ? (
                        <>
                          <Check size={16} weight="bold" className="mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="mr-2" />
                          Copy All
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-xs space-y-1">
                    {generateCloudflareCAA(result.domain).map((line, index) => (
                      <div key={index} className="text-green-400">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => onNavigate('dashboard')}
                    className="gap-2"
                  >
                    <Certificate size={20} weight="bold" />
                    Let DCVaaS Handle This
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => onNavigate('docs')}
                    className="gap-2"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* How It Works */}
        {!result && (
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              How CAA Records Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Authorization
                </h3>
                <p className="text-sm text-muted-foreground">
                  CAA records specify which Certificate Authorities can issue 
                  certificates for your domain
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Validation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Before issuing a certificate, CAs check CAA records to ensure 
                  they're authorized
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Protection
                </h3>
                <p className="text-sm text-muted-foreground">
                  Prevent unauthorized CAs from issuing certificates for your 
                  domain, adding security
                </p>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
