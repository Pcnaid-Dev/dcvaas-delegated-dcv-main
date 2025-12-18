import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Warning,
} from '@phosphor-icons/react';
import { useBrand } from '@/contexts/BrandContext';
import type { DomainStatus, JobStatus } from '@/types';

type StatusBadgeProps = {
  status: DomainStatus | JobStatus;
  showIcon?: boolean;
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const { brand } = useBrand();
  const isAutoCertify = brand.id === 'autocertify';
  const config = getStatusConfig(status, isAutoCertify);

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

function getStatusConfig(status: DomainStatus | JobStatus, isAutoCertify: boolean) {
  switch (status) {
    case 'pending_cname':
      return {
        label: isAutoCertify ? 'Setup Required' : 'Pending CNAME',
        icon: Clock,
        className: 'bg-warning/10 text-warning border-warning/20',
        animated: true,
      };
    case 'issuing':
    case 'running':
      return {
        label: isAutoCertify ? 'Securing...' : (status === 'issuing' ? 'Issuing' : 'Running'),
        icon: ArrowsClockwise,
        className: 'bg-primary/10 text-primary border-primary/20',
        animated: true,
      };
    case 'active':
    case 'succeeded':
      return {
        label: isAutoCertify ? 'Secure' : (status === 'active' ? 'Active' : 'Succeeded'),
        icon: CheckCircle,
        className: 'bg-success/10 text-success border-success/20',
        animated: false,
      };
    case 'error':
    case 'failed':
      return {
        label: isAutoCertify ? 'Needs Attention' : (status === 'error' ? 'Error' : 'Failed'),
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
