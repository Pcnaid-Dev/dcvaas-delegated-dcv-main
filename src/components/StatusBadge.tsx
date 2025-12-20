import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${config.className} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1`}
          >
            {/* Status dot indicator */}
            <span 
              className={`h-1.5 w-1.5 rounded-full ${config.dotClassName}`}
              aria-hidden="true"
            />
            {/* Icon */}
            {showIcon && (
              <config.icon size={14} weight={config.animated ? 'regular' : 'fill'} />
            )}
            {/* Label */}
            <span className="font-medium text-sm">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs"
        >
          <p className="font-semibold">{config.label}</p>
          {config.tooltip && <p className="text-xs mt-1">{config.tooltip}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getStatusConfig(status: DomainStatus | JobStatus) {
  switch (status) {
    case 'pending_cname':
      return {
        label: 'Action Needed',
        icon: Warning,
        className: 'bg-warning-bg text-warning border-warning/30',
        dotClassName: 'bg-warning-600',
        tooltip: 'Client DNS verification pending. Pending CNAME (Client action required)',
        animated: false,
      };
    case 'issuing':
      return {
        label: 'Pending',
        icon: ArrowsClockwise,
        className: 'bg-neutral-bg text-neutral border-neutral/30',
        dotClassName: 'bg-neutral-600',
        tooltip: 'Provisioning in progress',
        animated: true,
      };
    case 'running':
      return {
        label: 'Running',
        icon: ArrowsClockwise,
        className: 'bg-primary/10 text-primary border-primary/20',
        dotClassName: 'bg-primary',
        tooltip: 'Job is currently running',
        animated: true,
      };
    case 'active':
      return {
        label: 'Active',
        icon: CheckCircle,
        className: 'bg-success-bg text-success border-success/30',
        dotClassName: 'bg-success-600',
        tooltip: 'Auto-renewing',
        animated: false,
      };
    case 'succeeded':
      return {
        label: 'Succeeded',
        icon: CheckCircle,
        className: 'bg-success-bg text-success border-success/30',
        dotClassName: 'bg-success-600',
        tooltip: 'Job completed successfully',
        animated: false,
      };
    case 'error':
      return {
        label: 'Blocked',
        icon: XCircle,
        className: 'bg-danger-bg text-danger border-danger/30',
        dotClassName: 'bg-danger-600',
        tooltip: 'CAA policy prevents issuance. CAA Error (Client DNS blocks Let\'s Encrypt - Click to Fix)',
        animated: false,
      };
    case 'failed':
      return {
        label: 'Failed',
        icon: XCircle,
        className: 'bg-danger-bg text-danger border-danger/30',
        dotClassName: 'bg-danger-600',
        tooltip: 'Job failed to complete',
        animated: false,
      };
    case 'queued':
      return {
        label: 'Queued',
        icon: Clock,
        className: 'bg-muted text-muted-foreground border-border',
        dotClassName: 'bg-muted-foreground',
        tooltip: 'Job is waiting in queue',
        animated: false,
      };
    default:
      return {
        label: status,
        icon: Warning,
        className: 'bg-muted text-muted-foreground border-border',
        dotClassName: 'bg-muted-foreground',
        tooltip: undefined,
        animated: false,
      };
  }
}
