import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Certificate } from '@phosphor-icons/react';

type EmptyStateProps = {
  onAddDomain: () => void;
};

export function EmptyState({ onAddDomain }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* SVG Illustration */}
        <div className="relative mx-auto w-32 h-32 mb-6">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full text-primary/20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Certificate size={48} weight="duotone" className="text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            No Domains Yet
          </h3>
          <p className="text-muted-foreground">
            Get started by adding your first domain. We'll guide you through the setup process.
          </p>
        </div>

        <Button size="lg" onClick={onAddDomain} className="gap-2">
          <Plus size={20} weight="bold" />
          Add Your First Domain
        </Button>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            It takes less than 5 minutes to set up delegated DNS validation
          </p>
        </div>
      </div>
    </Card>
  );
}
