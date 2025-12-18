import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Warning, XCircle } from '@phosphor-icons/react';

type CalloutProps = {
  variant?: 'info' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
};

export function Callout({ variant = 'info', title, children }: CalloutProps) {
  const config = {
    info: {
      icon: Info,
      className: 'border-primary/50 bg-primary/5 text-foreground',
      iconColor: 'text-primary',
    },
    warning: {
      icon: Warning,
      className: 'border-yellow-500/50 bg-yellow-500/5 text-foreground',
      iconColor: 'text-yellow-600 dark:text-yellow-500',
    },
    error: {
      icon: XCircle,
      className: 'border-destructive/50 bg-destructive/5 text-foreground',
      iconColor: 'text-destructive',
    },
  };

  const { icon: Icon, className, iconColor } = config[variant];

  return (
    <Alert className={className}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
