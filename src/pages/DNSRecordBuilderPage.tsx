import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CopyButton } from '@/components/CopyButton';
import {
  Certificate,
  Warning,
  CheckCircle,
  Info,
  ArrowRight,
} from '@phosphor-icons/react';

type DNSRecordBuilderPageProps = {
  onNavigate: (page: string) => void;
};

type ValidationTarget = 'cname' | 'txt';

type DNSProvider = 
  | 'cloudflare'
  | 'route53'
  | 'google-cloud'
  | 'godaddy'
  | 'namecheap'
  | 'generic';

interface ProviderHint {
  name: string;
  tips: string[];
  commonMistakes: string[];
}

const PROVIDER_HINTS: Record<DNSProvider, ProviderHint> = {
  cloudflare: {
    name: 'Cloudflare',
    tips: [
      'Enter only the subdomain part (e.g., "_acme-challenge" not "_acme-challenge.example.com")',
      'Remove trailing dots - Cloudflare adds them automatically',
      'Changes typically propagate within 1-2 minutes',
    ],
    commonMistakes: [
      '❌ Adding the full domain name in the Name field',
      '❌ Including trailing dots in CNAME targets',
      '❌ Using the root domain (@) for ACME challenges',
    ],
  },
  route53: {
    name: 'AWS Route 53',
    tips: [
      'Use the FQDN with trailing dot (e.g., "_acme-challenge.example.com.")',
      'CNAME targets should also end with a dot',
      'TTL of 300 seconds (5 minutes) is recommended',
    ],
    commonMistakes: [
      '❌ Forgetting the trailing dot on record names',
      '❌ Not using FQDN format',
      '❌ Setting TTL too high (delays validation)',
    ],
  },
  'google-cloud': {
    name: 'Google Cloud DNS',
    tips: [
      'Use FQDN format with trailing dot',
      'Both record name and CNAME target need trailing dots',
      'Changes typically propagate within 1-2 minutes',
    ],
    commonMistakes: [
      '❌ Missing trailing dots on FQDN',
      '❌ Using relative names instead of FQDN',
      '❌ Forgetting to click "Create" after entering values',
    ],
  },
  godaddy: {
    name: 'GoDaddy',
    tips: [
      'Enter only the subdomain (e.g., "_acme-challenge")',
      'GoDaddy automatically appends your domain name',
      'Do NOT include trailing dots',
    ],
    commonMistakes: [
      '❌ Including the domain name (GoDaddy adds it automatically)',
      '❌ Adding trailing dots (not needed)',
      '❌ Using @ for ACME challenges (use _acme-challenge)',
    ],
  },
  namecheap: {
    name: 'Namecheap',
    tips: [
      'Enter only the host part (e.g., "_acme-challenge")',
      'Namecheap appends the domain automatically',
      'No trailing dots needed',
    ],
    commonMistakes: [
      '❌ Including the full domain in the Host field',
      '❌ Adding trailing dots',
      '❌ Using "www" or "@" for ACME challenge records',
    ],
  },
  generic: {
    name: 'Other DNS Provider',
    tips: [
      'Check if your provider requires FQDN or subdomain only',
      'Verify if trailing dots are required',
      'Test with a short TTL first (300 seconds)',
    ],
    commonMistakes: [
      '❌ Not checking provider-specific formatting requirements',
      '❌ Mixing FQDN and subdomain formats',
      '❌ Setting TTL too high before testing',
    ],
  },
};

export function DNSRecordBuilderPage({ onNavigate }: DNSRecordBuilderPageProps) {
  const [domain, setDomain] = useState('');
  const [validationType, setValidationType] = useState<ValidationTarget>('cname');
  const [tokenValue, setTokenValue] = useState('');
  const [provider, setProvider] = useState<DNSProvider>('generic');
  const [showResults, setShowResults] = useState(false);

  // Generate the DNS record based on inputs
  const generateRecord = () => {
    if (!domain || !tokenValue) {
      return null;
    }

    const cleanDomain = domain.trim().toLowerCase();
    const recordName = `_acme-challenge.${cleanDomain}`;
    
    // Format based on provider
    let formattedName = recordName;
    let formattedValue = tokenValue.trim();
    
    if (provider === 'route53' || provider === 'google-cloud') {
      // FQDN with trailing dot
      formattedName = `${recordName}.`;
      if (validationType === 'cname') {
        formattedValue = `${formattedValue}.`;
      }
    } else if (provider === 'godaddy' || provider === 'namecheap' || provider === 'cloudflare') {
      // Subdomain only
      formattedName = '_acme-challenge';
      // Remove trailing dot if present
      formattedValue = formattedValue.replace(/\.$/, '');
    }

    return {
      type: validationType.toUpperCase(),
      name: formattedName,
      value: formattedValue,
      fullRecord: `${formattedName} ${validationType.toUpperCase()} ${formattedValue}`,
    };
  };

  const handleGenerate = () => {
    if (domain && tokenValue) {
      setShowResults(true);
    }
  };

  const record = generateRecord();
  const providerInfo = PROVIDER_HINTS[provider];

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
                onClick={() => onNavigate('dns-builder')}
                className="text-sm font-medium text-primary"
              >
                DNS Builder
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            DCV DNS Record Builder
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Generate correctly formatted DNS records for ACME domain validation.
            Get provider-specific instructions to avoid common mistakes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Configure Your Record
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your domain and validation details
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your domain without protocol (e.g., example.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Validation Type</Label>
                <RadioGroup
                  value={validationType}
                  onValueChange={(value) => setValidationType(value as ValidationTarget)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cname" id="cname" />
                    <Label htmlFor="cname" className="cursor-pointer">
                      CNAME (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="txt" id="txt" />
                    <Label htmlFor="txt" className="cursor-pointer">
                      TXT Record
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  CNAME allows persistent delegation; TXT requires updates per validation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">
                  {validationType === 'cname' ? 'CNAME Target' : 'TXT Value'}
                </Label>
                <Input
                  id="token"
                  type="text"
                  placeholder={
                    validationType === 'cname'
                      ? 'abc123.acme.dcvaas-verify.com'
                      : 'verification-token-here'
                  }
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {validationType === 'cname'
                    ? 'The target domain for CNAME delegation'
                    : 'The verification token from your CA'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">DNS Provider</Label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as DNSProvider)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="generic">Other / Generic</option>
                  <option value="cloudflare">Cloudflare</option>
                  <option value="route53">AWS Route 53</option>
                  <option value="google-cloud">Google Cloud DNS</option>
                  <option value="godaddy">GoDaddy</option>
                  <option value="namecheap">Namecheap</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select your DNS provider for specific formatting guidance
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!domain || !tokenValue}
              >
                Generate DNS Record
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </Card>

          {/* Results and Hints */}
          <div className="space-y-6">
            {showResults && record ? (
              <>
                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} weight="fill" className="text-success" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Generated Record
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Record Type</Label>
                      <div className="font-mono text-sm bg-muted p-3 rounded-lg mt-1">
                        {record.type}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Record Name / Host</Label>
                      <div className="font-mono text-sm bg-muted p-3 rounded-lg mt-1 flex items-center justify-between">
                        <span className="break-all">{record.name}</span>
                        <CopyButton text={record.name} size="sm" variant="ghost" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Record Value / Target</Label>
                      <div className="font-mono text-sm bg-muted p-3 rounded-lg mt-1 flex items-center justify-between">
                        <span className="break-all">{record.value}</span>
                        <CopyButton text={record.value} size="sm" variant="ghost" />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-xs text-muted-foreground">Full Record (for reference)</Label>
                      <div className="font-mono text-xs bg-slate-950 dark:bg-black text-green-400 p-3 rounded-lg mt-1 overflow-x-auto whitespace-nowrap">
                        {record.fullRecord}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Info size={20} weight="fill" className="text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {providerInfo.name} Tips
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Best Practices</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {providerInfo.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle size={16} className="text-success mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Common Mistakes to Avoid</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {providerInfo.commonMistakes.map((mistake, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Warning size={16} className="text-warning mt-0.5 flex-shrink-0" />
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <Certificate size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Fill in the form to generate your DNS record with provider-specific formatting
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="mt-12 p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Tired of Manual DNS Configuration?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Delegate validation to DCVaaS with a one-time CNAME setup.
              We'll handle all future ACME challenges automatically—no more token updates, 
              no DNS API keys on your servers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" onClick={() => onNavigate('dashboard')}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('docs')}>
                Learn More
              </Button>
            </div>
            <div className="pt-4 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>One-time setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>Automatic renewals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-success" />
                <span>Zero downtime</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <Alert className="mt-8">
          <Info size={16} className="text-primary" />
          <AlertDescription>
            <strong>Pro tip:</strong> After creating your DNS record, allow 5-15 minutes for DNS 
            propagation before attempting validation. You can check propagation status using tools 
            like <code className="font-mono bg-muted px-1 py-0.5 rounded">dig</code> or online DNS 
            checkers.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
}
