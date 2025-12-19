// Base layout component for diagnostic tools
import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, ArrowRight, Certificate } from '@phosphor-icons/react';

interface ToolLayoutProps {
  children: ReactNode;
  onNavigate?: (page: string) => void;
}

interface DiagnosisBlockProps {
  status: 'success' | 'warning' | 'error' | 'info';
  title: string;
  children: ReactNode;
}

interface FixStepsBlockProps {
  title?: string;
  children: ReactNode;
}

interface CTABlockProps {
  onNavigate?: (page: string) => void;
}

export function ToolLayout({ children, onNavigate }: ToolLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate?.('home')}
              className="flex items-center gap-2"
            >
              <Certificate size={32} weight="bold" className="text-primary" />
              <span className="text-xl font-bold text-foreground">DCVaaS</span>
            </button>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => onNavigate?.('home')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => onNavigate?.('tools')}
                className="text-sm font-medium text-primary"
              >
                Tools
              </button>
              <button
                onClick={() => onNavigate?.('pricing')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigate?.('docs')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Docs
              </button>
              <Button onClick={() => onNavigate?.('dashboard')}>
                Dashboard
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
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

export function DiagnosisBlock({ status, title, children }: DiagnosisBlockProps) {
  const statusColors = {
    success: 'border-green-500/50 bg-green-500/10',
    warning: 'border-yellow-500/50 bg-yellow-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
  };

  const statusIcons = {
    success: <CheckCircle size={24} weight="fill" className="text-green-500" />,
    warning: <XCircle size={24} weight="fill" className="text-yellow-500" />,
    error: <XCircle size={24} weight="fill" className="text-red-500" />,
    info: <CheckCircle size={24} weight="fill" className="text-blue-500" />,
  };

  return (
    <Card className={`p-6 border-2 ${statusColors[status]}`}>
      <div className="flex items-start gap-4">
        {statusIcons[status]}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
          <div className="space-y-2 text-muted-foreground">{children}</div>
        </div>
      </div>
    </Card>
  );
}

export function FixStepsBlock({ title = 'How to Fix', children }: FixStepsBlockProps) {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

export function CTABlock({ onNavigate }: CTABlockProps) {
  return (
    <Card className="p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
      <div className="text-center space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Don't want to touch DNS again?
          </h3>
          <p className="text-lg text-muted-foreground">
            Delegate DCV to <span className="font-semibold text-primary">DCVaaS</span>
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-foreground">
            <CheckCircle size={20} weight="fill" className="text-green-500" />
            <span>CNAME once</span>
            <ArrowRight size={20} className="text-muted-foreground" />
            <CheckCircle size={20} weight="fill" className="text-green-500" />
            <span>Renewals forever</span>
          </div>
          
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription className="text-left">
              <strong>How it works:</strong> Create one CNAME record pointing to our service. 
              We handle all ACME challenges automatically - no DNS API keys needed, no manual renewals ever.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={() => onNavigate?.('dashboard')}>
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" onClick={() => onNavigate?.('pricing')}>
            View Pricing
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          3 free domains • No credit card required • 5 minute setup
        </p>
      </div>
    </Card>
  );
}
