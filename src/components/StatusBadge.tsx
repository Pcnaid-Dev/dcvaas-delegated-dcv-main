import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Warning,
} from '@phosphor-icons/react';
import type { DomainStatus, JobStatus } from '@/types';
import { getBrand } from '@/hooks/useBrandTheme';
import { getDashboardCopy } from '@/lib/dashboard-copy';

type StatusBadgeProps = {
  status: DomainStatus | JobStatus;
  showIcon?: boolean;
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const brand = getBrand();
  const copy = getDashboardCopy(brand);
  const config = getStatusConfig(status, brand, copy);

  return (
    <Badge
      variant="outline"
      className={`${config.className} inline-flex items-center gap-1.5`}
    >
      {showIcon && config.animated ? (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-current"></span>
        </span>
      ) : showIcon ? (
        <config.icon size={14} weight="fill" />
      ) : null}
      <span>{config.label}</span>
    </Badge>
  );
}

function getStatusConfig(status: DomainStatus | JobStatus, brand: string, copy: ReturnType<typeof getDashboardCopy>) {
  switch (status) {
    case 'pending_cname':
      return {
        label: brand === 'autocertify' ? 'Action Needed' : 'Pending CNAME',
        icon: Clock,
        className: 'bg-warning/10 text-warning border-warning/20',
        animated: true,
      };
    case 'issuing':
    case 'running':
      return {
        label: status === 'issuing' ? (brand === 'autocertify' ? 'Setting Up' : 'Issuing') : 'Running',
        icon: ArrowsClockwise,
        className: 'bg-primary/10 text-primary border-primary/20',
        animated: true,
      };
    case 'active':
    case 'succeeded':
      return {
        label: status === 'active' ? (brand === 'autocertify' ? 'Secure' : 'Active') : 'Succeeded',
        icon: CheckCircle,
        className: 'bg-success/10 text-success border-success/20',
        animated: false,
      };
    case 'error':
    case 'failed':
      return {
        label: status === 'error' ? (brand === 'autocertify' ? 'Needs Help' : 'Error') : 'Failed',
        icon: XCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        animated: false,
      };
    case 'queued':
      return {
        label: 'Queued',
        icon: Clock,
        className: 'bg-muted text-muted-foreground border-border',
        animated: true,
      };
    default:
      return {
        label: status,
        icon: Warning,
        className: 'bg-muted text-muted-foreground border-border',
        animated: false,
      };
  }
}
