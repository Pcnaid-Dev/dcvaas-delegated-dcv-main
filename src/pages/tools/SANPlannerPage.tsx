import { useState } from 'react';
import { ToolLayout, DiagnosisBlock, FixStepsBlock, CTABlock } from '@/components/ToolLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/CopyButton';
import { ListPlus, CheckCircle, XCircle, Info } from '@phosphor-icons/react';
import { toast } from 'sonner';

type SANPlannerPageProps = {
  onNavigate: (page: string) => void;
};

interface SANAnalysis {
  inputDomains: string[];
  wildcardSuggestion: string | null;
  covered: string[];
  notCovered: string[];
  minimalSANList: string[];
  certificateCount: number;
}

export function SANPlannerPage({ onNavigate }: SANPlannerPageProps) {
  const [domainsInput, setDomainsInput] = useState('');
  const [result, setResult] = useState<SANAnalysis | null>(null);

  const handleAnalyze = () => {
    const domains = domainsInput
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domains.length === 0) {
      toast.error('Please enter at least one domain');
      return;
    }

    // Analyze domains
    const uniqueDomains = [...new Set(domains)];
    const baseDomains = new Set<string>();
    const subdomains = new Map<string, string[]>();

    uniqueDomains.forEach(domain => {
      const parts = domain.split('.');
      if (parts.length > 2) {
        const base = parts.slice(-2).join('.');
        baseDomains.add(base);
        if (!subdomains.has(base)) {
          subdomains.set(base, []);
        }
        subdomains.get(base)!.push(domain);
      } else {
        baseDomains.add(domain);
      }
    });

    // Determine if wildcard makes sense
    const wildcardSuggestion = Array.from(subdomains.entries())
      .filter(([, subs]) => subs.length >= 3)
      .map(([base]) => `*.${base}`)
      [0] || null;

    const covered: string[] = [];
    const notCovered: string[] = [];
    const minimalSANList: string[] = [];

    if (wildcardSuggestion) {
      const base = wildcardSuggestion.replace('*.', '');
      minimalSANList.push(base, wildcardSuggestion);

      uniqueDomains.forEach(domain => {
        if (domain === base || domain.endsWith(`.${base}`)) {
          // Wildcard covers subdomains but NOT the base domain itself
          if (domain === base) {
            covered.push(domain);
          } else {
            const parts = domain.split('.');
            if (parts.length === 3) {
              // *.example.com covers sub.example.com
              covered.push(domain);
            } else {
              // *.example.com does NOT cover sub.sub.example.com
              notCovered.push(domain);
              if (!minimalSANList.includes(domain)) {
                minimalSANList.push(domain);
              }
            }
          }
        } else {
          notCovered.push(domain);
          if (!minimalSANList.includes(domain)) {
            minimalSANList.push(domain);
          }
        }
      });
    } else {
      minimalSANList.push(...uniqueDomains);
      covered.push(...uniqueDomains);
    }

    const analysis: SANAnalysis = {
      inputDomains: uniqueDomains,
      wildcardSuggestion,
      covered,
      notCovered,
      minimalSANList,
      certificateCount: 1,
    };

    setResult(analysis);
    toast.success('Analysis complete');
  };

  return (
    <ToolLayout onNavigate={onNavigate}>
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ListPlus size={40} weight="fill" className="text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              SAN/Wildcard Coverage Planner
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plan your certificate SANs and understand wildcard coverage.
            Learn what *.example.com covers (and what it doesn't).
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="domains">Domains (one per line)</Label>
              <Textarea
                id="domains"
                placeholder={'example.com\nwww.example.com\napi.example.com\nadmin.example.com\napp.example.com'}
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleAnalyze} className="w-full">
              <ListPlus size={20} weight="bold" className="mr-2" />
              Analyze Coverage
            </Button>
          </div>
        </Card>

        {result && (
          <div className="space-y-6">
            <DiagnosisBlock
              status="info"
              title="Coverage Analysis"
            >
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground mb-2">
                    Unique Domains: {result.inputDomains.length}
                  </p>
                  <p className="font-semibold text-foreground mb-2">
                    Recommended Certificate Count: {result.certificateCount}
                  </p>
                </div>

                {result.wildcardSuggestion && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded p-4">
                    <p className="font-semibold text-blue-600 dark:text-blue-500 mb-2 flex items-center gap-2">
                      <Info size={20} weight="fill" />
                      Wildcard Recommendation
                    </p>
                    <p className="text-muted-foreground mb-3">
                      Multiple subdomains detected. Consider using a wildcard certificate:
                    </p>
                    <Badge variant="default" className="text-base px-4 py-2">
                      {result.wildcardSuggestion}
                    </Badge>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {result.wildcardSuggestion && result.covered.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <CheckCircle size={20} weight="fill" className="text-green-500" />
                        Covered by Wildcard
                      </p>
                      <div className="bg-muted rounded p-3 space-y-1 text-sm">
                        {result.covered.map(domain => (
                          <div key={domain} className="font-mono">{domain}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.notCovered.length > 0 && (
                    <div>
                      <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <XCircle size={20} weight="fill" className="text-yellow-500" />
                        NOT Covered by Wildcard
                      </p>
                      <div className="bg-muted rounded p-3 space-y-1 text-sm">
                        {result.notCovered.map(domain => (
                          <div key={domain} className="font-mono text-yellow-600 dark:text-yellow-500">{domain}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-2">Minimal SAN List:</p>
                  <div className="bg-muted rounded p-4 font-mono text-sm space-y-1 max-h-60 overflow-y-auto">
                    {result.minimalSANList.map((san, idx) => (
                      <div key={idx} className="flex items-center justify-between group">
                        <span>{san}</span>
                        <CopyButton text={san} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DiagnosisBlock>

            <FixStepsBlock title="Understanding Wildcard Certificates">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Key Rules</h4>
                  <div className="bg-muted rounded p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={20} weight="fill" className="text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">*.example.com covers:</p>
                        <p className="text-sm text-muted-foreground">
                          www.example.com, api.example.com, admin.example.com
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <XCircle size={20} weight="fill" className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">*.example.com does NOT cover:</p>
                        <p className="text-sm text-muted-foreground">
                          example.com (base domain) or sub.api.example.com (nested subdomains)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Info size={20} weight="fill" className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">For complete coverage:</p>
                        <p className="text-sm text-muted-foreground">
                          Include both example.com AND *.example.com in the SAN list
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Generate CSR with SANs</h4>
                  <p className="text-muted-foreground mb-3">
                    Create a configuration file for OpenSSL:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm">
                    <pre className="text-xs whitespace-pre-wrap">
{`[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
${result.minimalSANList.map((san, idx) => `DNS.${idx + 1} = ${san}`).join('\n')}`}
                    </pre>
                  </div>
                  <p className="text-muted-foreground mt-3">
                    Then generate CSR:
                  </p>
                  <div className="bg-muted rounded p-4 font-mono text-sm mt-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs">openssl req -new -key private.key -out csr.pem -config san.conf</code>
                      <CopyButton text="openssl req -new -key private.key -out csr.pem -config san.conf" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">When to Use Wildcards</h4>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>You have 3+ subdomains on the same level</li>
                      <li>Subdomain names change frequently (user-generated, etc.)</li>
                      <li>You need flexibility to add subdomains without re-issuing</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">When NOT to Use Wildcards</h4>
                  <div className="bg-muted rounded p-4">
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      <li>You only have 1-2 subdomains (explicit SANs are simpler)</li>
                      <li>You need nested subdomains (*.*.example.com not allowed)</li>
                      <li>Security policy requires least-privilege certificates</li>
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
