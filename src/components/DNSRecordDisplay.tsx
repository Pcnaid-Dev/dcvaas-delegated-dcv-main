import { Card } from '@/components/ui/card';
import { CopyButton } from './CopyButton';

type DNSRecordDisplayProps = {
  domain: string;
  cnameTarget: string;
};

export function DNSRecordDisplay({ domain, cnameTarget }: DNSRecordDisplayProps) {
  const acmeChallengeDomain = `_acme-challenge.${domain}`;
  
  return (
    <Card className="card p-6 border-border bg-card">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1 font-mono uppercase tracking-wide">
              Delegation Record
            </h4>
            <p className="text-xs text-muted-foreground">
              Add this CNAME once. We handle rotations forever.
            </p>
          </div>
        </div>
        
        {/* KeylessSSL branded DNS display - monospace, technical aesthetic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-surface-3 rounded-md border border-border-subtle">
            <div className="space-y-1 flex-1">
              <div className="text-[0.7rem] font-mono uppercase tracking-wider text-muted-foreground">Host</div>
              <div className="font-mono text-sm text-secondary dns-field select-all">
                {acmeChallengeDomain}
              </div>
            </div>
            <CopyButton text={acmeChallengeDomain} size="sm" variant="ghost" />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-surface-3 rounded-md border border-border-subtle">
            <div className="space-y-1 flex-1">
              <div className="text-[0.7rem] font-mono uppercase tracking-wider text-muted-foreground">Type</div>
              <div className="font-mono text-sm text-foreground">CNAME</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-surface-3 rounded-md border border-border-subtle">
            <div className="space-y-1 flex-1">
              <div className="text-[0.7rem] font-mono uppercase tracking-wider text-muted-foreground">Target</div>
              <div className="font-mono text-sm text-primary dns-field select-all">
                {cnameTarget}
              </div>
            </div>
            <CopyButton text={cnameTarget} size="sm" variant="ghost" />
          </div>
        </div>
        
        <div className="alert-info p-3 border border-border-subtle rounded-md">
          <div className="text-xs text-muted-foreground leading-relaxed font-mono">
            <span className="text-secondary">→</span> CNAME propagation: 5-15 minutes. 
            <span className="text-secondary">→</span> Verification timeout: 60 seconds.
          </div>
        </div>
      </div>
    </Card>
  );
}
