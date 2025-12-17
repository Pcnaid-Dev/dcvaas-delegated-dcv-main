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
    <Card className="overflow-hidden border-slate-700 bg-slate-950">
      <div className="flex flex-col">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-xs font-mono text-slate-400">dns-config.sh</span>
          </div>
          <CopyButton text={instruction} label="Copy" />
        </div>
        
        {/* Terminal Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-green-400 font-mono text-sm select-none">$</span>
            <div className="flex-1">
              <div className="font-mono text-sm text-green-400 break-all">
                {instruction}
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs font-mono text-slate-500">
              # Point your domain to our edge network.<br />
              # Cloudflare will automatically validate and issue your certificate.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
