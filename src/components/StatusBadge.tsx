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

  return (
    <Badge
      variant="outline"
      className={`${config.className} inline-flex items-center gap-1.5 rounded-full px-3 py-1`}
    >
      {showIcon && config.animated ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      ) : showIcon ? (
        <config.icon size={12} weight="fill" />
      ) : null}
      <span className="uppercase tracking-wide">{config.label}</span>
    </Badge>
  );
}

function getStatusConfig(status: DomainStatus | JobStatus) {
  switch (status) {
    case 'pending_cname':
      return {
        label: 'Pending CNAME',
        icon: Clock,
        className: 'status-pending bg-warning/10 text-warning border-warning/20 font-mono text-[0.82rem]',
        animated: true,
      };
    case 'issuing':
    case 'running':
      return {
        label: status === 'issuing' ? 'Issuing' : 'Running',
        icon: ArrowsClockwise,
        className: 'bg-secondary/10 text-secondary border-secondary/20 font-mono text-[0.82rem]',
        animated: true,
      };
    case 'active':
    case 'succeeded':
      return {
        label: status === 'active' ? 'Active' : 'Succeeded',
        icon: CheckCircle,
        className: 'status-active bg-success/10 text-success border-success/20 font-mono text-[0.82rem]',
        animated: false,
      };
    case 'error':
    case 'failed':
      return {
        label: status === 'error' ? 'Error' : 'Failed',
        icon: XCircle,
        className: 'status-error bg-destructive/10 text-destructive border-destructive/20 font-mono text-[0.82rem]',
        animated: false,
      };
    case 'queued':
      return {
        label: 'Queued',
        icon: Clock,
        className: 'bg-muted text-muted-foreground border-border font-mono text-[0.82rem]',
        animated: true,
      };
    default:
      return {
        label: status,
        icon: Warning,
        className: 'bg-muted text-muted-foreground border-border font-mono text-[0.82rem]',
        animated: false,
      };
  }
}
