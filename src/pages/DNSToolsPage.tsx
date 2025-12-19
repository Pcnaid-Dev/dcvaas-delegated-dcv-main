import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Certificate, MagnifyingGlass, Warning, CheckCircle, XCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

type DNSToolsPageProps = {
  onNavigate: (page: string) => void;
};

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'CAA';

type DNSResult = {
  resolver: string;
  type: 'authoritative' | 'recursive';
  status: 'success' | 'error' | 'nxdomain';
  records: string[];
  responseTime: number;
  error?: string;
};

// DNS over HTTPS endpoints for various resolvers
const RESOLVERS = [
  { name: 'Google DNS', url: 'https://dns.google/resolve', type: 'recursive' as const },
  { name: 'Cloudflare DNS', url: 'https://cloudflare-dns.com/dns-query', type: 'recursive' as const },
  { name: 'Quad9', url: 'https://dns.quad9.net/dns-query', type: 'recursive' as const },
  { name: 'OpenDNS', url: 'https://doh.opendns.com/dns-query', type: 'recursive' as const },
];

// DNS Record Type to numeric type mapping
const RECORD_TYPE_MAP: Record<RecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  TXT: 16,
  CAA: 257,
};

export function DNSToolsPage({ onNavigate }: DNSToolsPageProps) {
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('CNAME');
  const [isQuerying, setIsQuerying] = useState(false);
  const [results, setResults] = useState<DNSResult[]>([]);
  const [authoritativeNS, setAuthoritativeNS] = useState<string[]>([]);

  const queryResolver = async (
    resolverName: string,
    resolverUrl: string,
    domain: string,
    recordType: RecordType,
    isAuthoritative: boolean
  ): Promise<DNSResult> => {
    const startTime = performance.now();
    
    try {
      const typeNum = RECORD_TYPE_MAP[recordType];
      let url: string;
      let headers: HeadersInit = {};
      
      if (resolverUrl.includes('dns.google')) {
        // Google DNS uses query parameters
        url = `${resolverUrl}?name=${encodeURIComponent(domain)}&type=${typeNum}`;
      } else {
        // Other resolvers use DNS-JSON format
        url = `${resolverUrl}?name=${encodeURIComponent(domain)}&type=${typeNum}`;
        headers = { Accept: 'application/dns-json' };
      }

      const response = await fetch(url, { headers });
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        return {
          resolver: resolverName,
          type: isAuthoritative ? 'authoritative' : 'recursive',
          status: 'error',
          records: [],
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      
      // Check for NXDOMAIN (Status code 3)
      if (data.Status === 3) {
        return {
          resolver: resolverName,
          type: isAuthoritative ? 'authoritative' : 'recursive',
          status: 'nxdomain',
          records: [],
          responseTime,
          error: 'Domain not found (NXDOMAIN)',
        };
      }
      
      // Extract records from response
      const records: string[] = [];
      if (data.Answer && Array.isArray(data.Answer)) {
        for (const answer of data.Answer) {
          if (answer.type === typeNum) {
            // Format the data based on record type
            let recordData = answer.data;
            if (recordType === 'CNAME' || recordType === 'TXT') {
              // Remove trailing dots and quotes
              recordData = recordData.replace(/\.+$/, '').replace(/^"|"$/g, '');
            }
            records.push(recordData);
          }
        }
      }

      return {
        resolver: resolverName,
        type: isAuthoritative ? 'authoritative' : 'recursive',
        status: records.length > 0 ? 'success' : 'error',
        records,
        responseTime,
        error: records.length === 0 ? 'No records found' : undefined,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        resolver: resolverName,
        type: isAuthoritative ? 'authoritative' : 'recursive',
        status: 'error',
        records: [],
        responseTime,
        error: error instanceof Error ? error.message : 'Query failed',
      };
    }
  };

  const getAuthoritativeNameservers = async (domain: string): Promise<string[]> => {
    try {
      // Query Google DNS for NS records to get authoritative nameservers
      const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=2`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const nameservers: string[] = [];
      
      if (data.Answer && Array.isArray(data.Answer)) {
        for (const answer of data.Answer) {
          if (answer.type === 2) { // NS record
            nameservers.push(answer.data.replace(/\.+$/, ''));
          }
        }
      }
      
      return nameservers;
    } catch (error) {
      console.error('Failed to get authoritative nameservers:', error);
      return [];
    }
  };

  const handleQuery = async () => {
    if (!domain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setIsQuerying(true);
    setResults([]);
    setAuthoritativeNS([]);

    try {
      // First, get authoritative nameservers
      const nameservers = await getAuthoritativeNameservers(domain);
      setAuthoritativeNS(nameservers);

      // Query all resolvers in parallel
      const queries = RESOLVERS.map((resolver) =>
        queryResolver(resolver.name, resolver.url, domain, recordType, false)
      );

      // If we found authoritative nameservers, query them too
      // Note: Direct queries to authoritative servers require special handling
      // For now, we'll show them in the UI but note they can't be queried via DoH
      
      const queryResults = await Promise.all(queries);
      setResults(queryResults);

    } catch (error) {
      toast.error('Failed to query DNS records');
      console.error(error);
    } finally {
      setIsQuerying(false);
    }
  };

  const detectMismatches = (): boolean => {
    if (results.length === 0) return false;

    const successfulResults = results.filter(r => r.status === 'success');
    if (successfulResults.length < 2) return false;

    // Get unique record sets
    const recordSets = successfulResults.map(r => r.records.sort().join(','));
    const uniqueSets = new Set(recordSets);

    return uniqueSets.size > 1;
  };

  const hasMismatches = detectMismatches();

  const getStatusIcon = (status: DNSResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} weight="fill" />;
      case 'nxdomain':
        return <XCircle className="text-yellow-500" size={20} weight="fill" />;
      case 'error':
        return <XCircle className="text-red-500" size={20} weight="fill" />;
    }
  };

  const getStatusBadge = (status: DNSResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Success</Badge>;
      case 'nxdomain':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">NXDOMAIN</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Error</Badge>;
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
                onClick={() => onNavigate('dns-tools')}
                className="text-sm font-medium text-primary"
              >
                DNS Tools
              </button>
              <Button onClick={() => onNavigate('dashboard')}>
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            DNS Propagation Matrix
          </h1>
          <p className="text-xl text-muted-foreground">
            Check DNS record propagation across multiple resolvers and detect mismatches
          </p>
        </div>

        {/* Query Form */}
        <Card className="p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="recordType">Record Type</Label>
              <Select value={recordType} onValueChange={(value) => setRecordType(value as RecordType)}>
                <SelectTrigger id="recordType" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A (IPv4 Address)</SelectItem>
                  <SelectItem value="AAAA">AAAA (IPv6 Address)</SelectItem>
                  <SelectItem value="CNAME">CNAME (Canonical Name)</SelectItem>
                  <SelectItem value="TXT">TXT (Text Record)</SelectItem>
                  <SelectItem value="CAA">CAA (Certificate Authority)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleQuery} 
            disabled={isQuerying}
            className="w-full md:w-auto"
          >
            {isQuerying ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Querying...
              </>
            ) : (
              <>
                <MagnifyingGlass size={20} className="mr-2" />
                Query DNS Records
              </>
            )}
          </Button>
        </Card>

        {/* Authoritative Nameservers */}
        {authoritativeNS.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Authoritative Nameservers for {domain}
            </h3>
            <div className="flex flex-wrap gap-2">
              {authoritativeNS.map((ns, index) => (
                <Badge key={index} variant="secondary" className="font-mono">
                  {ns}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Note: Direct queries to authoritative nameservers via DNS over HTTPS are not supported by most providers. 
              The results below show responses from public recursive resolvers.
            </p>
          </Card>
        )}

        {/* Mismatch Alert */}
        {results.length > 0 && hasMismatches && (
          <Card className="p-6 mb-8 border-yellow-500/50 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Warning size={24} className="text-yellow-500 flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  DNS Propagation Mismatch Detected
                </h3>
                <p className="text-muted-foreground mb-3">
                  Different resolvers are returning different records for <span className="font-mono font-semibold">{domain}</span>. 
                  This typically happens when DNS changes are still propagating or when there are DNS configuration issues.
                </p>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    💡 Skip the Wait with DCVaaS
                  </p>
                  <p className="text-sm text-muted-foreground">
                    DCVaaS uses delegated DNS-01 validation, allowing us to validate domain ownership 
                    <span className="font-semibold"> before full DNS propagation completes</span>. 
                    Issue SSL/TLS certificates instantly without waiting hours for global DNS propagation.
                  </p>
                  <Button 
                    onClick={() => onNavigate('home')} 
                    variant="default"
                    size="sm"
                    className="mt-3"
                  >
                    Learn More About DCVaaS
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Query Results
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resolver</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead className="text-right">Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          {result.resolver}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {result.type === 'authoritative' ? 'Auth' : 'Recursive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(result.status)}
                      </TableCell>
                      <TableCell>
                        {result.status === 'success' ? (
                          <div className="space-y-1">
                            {result.records.map((record, idx) => (
                              <div key={idx} className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                {record}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {result.error || 'No records'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {result.responseTime.toFixed(0)}ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* CTA Section */}
        {results.length === 0 && (
          <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Why DNS Propagation Matters
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              Traditional certificate issuance requires waiting for DNS changes to propagate globally, 
              which can take hours or even days. DCVaaS eliminates this delay with delegated validation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-left">
                <div className="text-3xl mb-2">⚡</div>
                <h4 className="font-semibold text-foreground mb-2">Instant Validation</h4>
                <p className="text-sm text-muted-foreground">
                  Validate domain ownership immediately without waiting for propagation
                </p>
              </div>
              <div className="text-left">
                <div className="text-3xl mb-2">🔒</div>
                <h4 className="font-semibold text-foreground mb-2">Secure Method</h4>
                <p className="text-sm text-muted-foreground">
                  One-time CNAME setup - no need to expose DNS API credentials
                </p>
              </div>
              <div className="text-left">
                <div className="text-3xl mb-2">🔄</div>
                <h4 className="font-semibold text-foreground mb-2">Auto Renewal</h4>
                <p className="text-sm text-muted-foreground">
                  Certificates renew automatically, never worry about expiration
                </p>
              </div>
            </div>
            <Button 
              onClick={() => onNavigate('home')} 
              size="lg"
              className="mt-8"
            >
              Get Started with DCVaaS
            </Button>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© 2024 DCVaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
