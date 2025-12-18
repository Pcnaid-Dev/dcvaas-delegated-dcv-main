import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {title}
          </h3>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
