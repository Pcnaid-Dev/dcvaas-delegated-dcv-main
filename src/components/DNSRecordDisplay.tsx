import { Card } from '@/components/ui/card';
import { CopyButton } from './CopyButton';

type DNSRecordDisplayProps = {
  domain: string;
  cnameTarget: string;
};

export function DNSRecordDisplay({ domain, cnameTarget }: DNSRecordDisplayProps) {
  // Cloudflare typically requires CNAMEing the hostname to your SaaS fallback
  const instruction = `${domain} CNAME ${cnameTarget}`;
  
  // OR if you are doing TXT verification (if they can't CNAME root)
  // const instruction = `_cf-custom-hostname.${domain} TXT ${verificationValue}`;

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
          Point your domain to our edge network. Cloudflare will automatically validate and issue your certificate.
        </div>
      </div>
    </Card>
  );
}
