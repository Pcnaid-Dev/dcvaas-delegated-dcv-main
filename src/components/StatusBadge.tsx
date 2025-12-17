import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Warning,
} from '@phosphor-icons/react';
import type { DomainStatus, JobStatus } from '@/types';

type StatusBadgeProps = {
  status: DomainStatus | JobStatus;
  showIcon?: boolean;
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  const isPending = status === 'pending_cname' || status === 'issuing' || status === 'running';

  return (
    <Badge
      variant="outline"
      className={`${config.className} inline-flex items-center gap-1.5`}
    >
      {showIcon && (
        <span className="relative inline-flex">
          <config.icon size={14} weight="fill" className={isPending ? 'animate-pulse' : ''} />
        </span>
      )}
      <span>{config.label}</span>
    </Badge>
  );
}

function getStatusConfig(status: DomainStatus | JobStatus) {
  switch (status) {
    case 'pending_cname':
      return {
        label: 'Pending CNAME',
        icon: Clock,
        className: 'bg-muted text-muted-foreground border-border',
      };
    case 'issuing':
    case 'running':
      return {
        label: status === 'issuing' ? 'Issuing' : 'Running',
        icon: ArrowsClockwise,
        className: 'bg-primary/10 text-primary border-primary/20',
      };
    case 'active':
    case 'succeeded':
      return {
        label: status === 'active' ? 'Active' : 'Succeeded',
        icon: CheckCircle,
        className: 'bg-success/10 text-success border-success/20',
      };
    case 'error':
    case 'failed':
      return {
        label: status === 'error' ? 'Error' : 'Failed',
        icon: XCircle,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      };
    case 'queued':
      return {
        label: 'Queued',
        icon: Clock,
        className: 'bg-muted text-muted-foreground border-border',
      };
    default:
      return {
        label: status,
        icon: Warning,
        className: 'bg-muted text-muted-foreground border-border',
      };
  }
}
