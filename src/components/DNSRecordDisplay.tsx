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
    <Card className="p-6 border-border bg-card">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              DNS Configuration Required
            </h4>
            <p className="text-xs text-muted-foreground">
              Add this CNAME record to your DNS provider
            </p>
          </div>
        </div>
        
        {/* High-contrast code block - intentionally using fixed terminal colors for code aesthetic */}
        <div className="relative">
          <div className="font-mono text-sm bg-slate-950 dark:bg-black text-green-400 p-4 rounded-lg border border-slate-800 dark:border-slate-900 overflow-x-auto">
            <div className="whitespace-nowrap">
              <span className="text-slate-500"># </span>
              <span className="text-blue-400">Type:</span>
              <span className="text-slate-300"> CNAME</span>
            </div>
            <div className="whitespace-nowrap mt-1">
              <span className="text-slate-500"># </span>
              <span className="text-blue-400">Host:</span>
              <span className="text-amber-300"> {domain}</span>
            </div>
            <div className="whitespace-nowrap mt-1">
              <span className="text-slate-500"># </span>
              <span className="text-blue-400">Value:</span>
              <span className="text-green-400"> {cnameTarget}</span>
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <CopyButton text={cnameTarget} size="sm" variant="ghost" />
          </div>
        </div>
        
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="text-xs text-muted-foreground leading-relaxed">
            💡 <strong>Tip:</strong> DNS changes typically propagate within 5-15 minutes. 
            Once configured, click "Check DNS Now" to verify and proceed with certificate issuance.
          </div>
        </div>
      </div>
    </Card>
  );
}
