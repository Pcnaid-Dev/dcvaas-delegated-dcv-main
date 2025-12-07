import { Card } from '@/components/ui/card';
import { CopyButton } from './CopyButton';

type DNSRecordDisplayProps = {
  domain: string;
  cnameTarget: string;
};

export function DNSRecordDisplay({ domain, cnameTarget }: DNSRecordDisplayProps) {
  const instruction = `_acme-challenge.${domain} CNAME ${cnameTarget}`;

  return (
    <Card className="p-4 bg-muted/50">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            DNS Configuration Required
          </span>
          <CopyButton text={instruction} label="Copy" />
        </div>
        <div className="font-mono text-sm text-foreground bg-card p-3 rounded border border-border break-all">
          {instruction}
        </div>
        <div className="text-xs text-muted-foreground">
          Add this CNAME record to your DNS provider. DNS propagation typically
          takes 5-15 minutes.
        </div>
      </div>
    </Card>
  );
}
