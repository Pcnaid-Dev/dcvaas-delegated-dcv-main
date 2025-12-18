import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from '@phosphor-icons/react';

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  helpText?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function StatCard({
  icon,
  label,
  value,
  delta,
  helpText,
  trend = 'neutral',
}: StatCardProps) {
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-sm font-medium">{label}</span>
            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex">
                      <Info size={14} className="text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="text-3xl font-bold text-foreground">
            {value}
          </div>
          {delta && (
            <p className={`text-sm mt-1 ${trendColors[trend]}`}>
              {delta}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}
