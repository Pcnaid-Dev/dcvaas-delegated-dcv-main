import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from '@phosphor-icons/react';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto max-w-md space-y-6">
        {/* Simple SVG Illustration */}
        <div className="mx-auto w-48 h-48 flex items-center justify-center">
          <svg
            className="w-full h-full text-muted-foreground/20"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="40"
              y="60"
              width="120"
              height="80"
              rx="8"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
            <circle cx="100" cy="100" r="20" fill="currentColor" opacity="0.3" />
            <path
              d="M100 90 L100 110 M90 100 L110 100"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
        
        {actionLabel && onAction && (
          <Button onClick={onAction} size="lg">
            <Plus size={20} weight="bold" className="mr-2" />
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
