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
    <Card className="p-6 bg-muted/50 border-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            DNS Configuration Required
          </span>
          <CopyButton text={instruction} label="Copy Record" size="default" />
        </div>
        <div className="font-mono text-sm text-foreground bg-slate-950 dark:bg-slate-950 text-green-400 p-4 rounded-lg border-2 border-slate-700 break-all shadow-inner">
          {instruction}
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          Point your domain to our edge network. Cloudflare will automatically validate and issue your certificate once DNS propagates (typically 5-15 minutes).
        </div>
      </div>
    </Card>
  );
}
