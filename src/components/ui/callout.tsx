import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Info, Warning, CheckCircle, XCircle } from '@phosphor-icons/react';

type CalloutVariant = 'info' | 'warning' | 'success' | 'error';

interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
    iconClassName: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: Warning,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    iconClassName: 'text-red-600 dark:text-red-400',
  },
};

export function Callout({
  variant = 'info',
  title,
  children,
  className,
}: CalloutProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.className,
        className
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <Icon size={20} weight="fill" className={cn('flex-shrink-0 mt-0.5', config.iconClassName)} />
        <div className="flex-1">
          {title && (
            <h4 className="font-semibold mb-1">{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
