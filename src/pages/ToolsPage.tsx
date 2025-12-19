import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Certificate, ShieldCheck, ShieldWarning, Shield, ListChecks, ListPlus, ShieldSlash } from '@phosphor-icons/react';

type ToolsPageProps = {
  onNavigate: (page: string) => void;
};

const TOOLS = [
  {
    id: 'tls-scan',
    title: 'TLS Config Quick Scan',
    description: 'Analyze TLS protocols, ciphers, and ALPN configuration. Detect legacy protocols and weak ciphers.',
    icon: ShieldCheck,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'ocsp-check',
    title: 'OCSP Stapling Checker',
    description: 'Verify OCSP stapling configuration and check certificate revocation status.',
    icon: Certificate,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 'hsts-check',
    title: 'HSTS Status Checker',
    description: 'Check HSTS configuration, preload readiness, and understand HTTP validation impacts.',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'ct-check',
    title: 'Certificate Transparency Checker',
    description: 'Verify CT compliance and SCT presence. Ensure your certificate meets browser requirements.',
    icon: ListChecks,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'san-planner',
    title: 'SAN/Wildcard Coverage Planner',
    description: 'Plan certificate SANs and understand wildcard coverage. Learn what *.example.com covers.',
    icon: ListPlus,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'browser-security',
    title: '"Not Secure" Analyzer',
    description: 'Understand why browsers show security warnings. Get plain-English explanations and fixes.',
    icon: ShieldSlash,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
];

export function ToolsPage({ onNavigate }: ToolsPageProps) {
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
                onClick={() => onNavigate('tools')}
                className="text-sm font-medium text-primary"
              >
                Tools
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
              <Button onClick={() => onNavigate('dashboard')}>
                Dashboard
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            SSL/TLS Diagnostic Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Free tools to analyze, diagnose, and fix SSL/TLS certificate issues.
            Get plain-English explanations and actionable solutions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.id}
                className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => onNavigate(tool.id)}
              >
                <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4`}>
                  <Icon size={28} weight="fill" className={tool.color} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {tool.title}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {tool.description}
                </p>
                <Button variant="outline" className="w-full">
                  Open Tool →
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Card className="p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Need Automated Certificate Management?
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              DCVaaS provides zero-touch certificate issuance and renewal via delegated DCV.
              One CNAME, infinite renewals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => onNavigate('dashboard')}>
                Get Started Free
              </Button>
              <Button size="lg" variant="outline" onClick={() => onNavigate('pricing')}>
                View Pricing
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border bg-card/30 py-8 mt-12">
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
