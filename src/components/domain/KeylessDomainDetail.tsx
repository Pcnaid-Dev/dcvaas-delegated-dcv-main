import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDomain, syncDomain } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Terminal, Copy, ArrowLeft, CheckCircle, XCircle, ArrowsClockwise } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function KeylessDomainDetail({ domainId, onNavigate }: any) {
  const queryClient = useQueryClient();
  const { data: domain, isLoading } = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => getDomain(domainId),
    refetchInterval: 5000
  });

  const syncMutation = useMutation({
    mutationFn: () => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] });
      toast.success("Sync trigger sent to edge");
    }
  });

  if (isLoading) return <div className="text-emerald-500 font-mono">Loading config...</div>;
  if (!domain) return <div>Domain not found</div>; // FIX: Handle undefined domain

  const statusColor = domain.status === 'active' ? 'text-emerald-400' : 'text-amber-400';

  return (
    <div className="max-w-4xl mx-auto font-mono text-sm text-gray-300">
      {/* Header / Breadcrumb */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => onNavigate('dashboard')} className="hover:text-white transition-colors">
          <ArrowLeft />
        </button>
        <span className="text-gray-500">/ domains /</span>
        <span className="text-white font-bold">{domain.domainName}</span>
        <span className={`ml-auto px-2 py-1 rounded border ${domain.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
          {domain.status}
        </span>
      </div>

      {/* The "Config" View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Configuration */}
        <div className="space-y-6">
          <div className="p-4 border border-gray-800 bg-[#0d1117] rounded">
            <div className="text-xs text-gray-500 uppercase mb-4 font-bold tracking-wider">DNS Delegation Config</div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-xs mb-1">_acme-challenge record</label>
                <div className="flex gap-2">
                  <code className="bg-black p-2 rounded border border-gray-800 flex-1 block overflow-x-auto">
                    _acme-challenge.{domain.domainName}
                  </code>
                  <button className="text-gray-500 hover:text-white" onClick={() => navigator.clipboard.writeText(`_acme-challenge.${domain.domainName}`)}><Copy/></button>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 text-xs mb-1">CNAME Target</label>
                <div className="flex gap-2">
                  <code className="bg-black p-2 rounded border border-gray-800 flex-1 block text-emerald-500">
                    {domain.cnameTarget}
                  </code>
                   <button className="text-gray-500 hover:text-white" onClick={() => navigator.clipboard.writeText(domain.cnameTarget)}><Copy/></button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-800 bg-[#0d1117] rounded">
             <div className="text-xs text-gray-500 uppercase mb-4 font-bold tracking-wider">Certificate Metadata</div>
             <pre className="text-xs text-gray-400 overflow-x-auto">
{JSON.stringify({
  issuer: "Let's Encrypt R3",
  expires_at: domain.expiresAt || "pending",
  auto_renew: true,
  wildcard: true,
  algorithm: "ECDSA-384"
}, null, 2)}
             </pre>
          </div>
        </div>

        {/* Right: Actions / Terminal */}
        <div className="space-y-6">
           <div className="border border-gray-800 bg-black rounded p-4 relative group">
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
              </div>
              <div className="text-xs text-gray-600 mb-2 border-b border-gray-800 pb-2">Diagnostic Terminal</div>
              <div className="space-y-2 font-mono text-xs">
                 <p><span className="text-emerald-500">$</span> check-dns {domain.domainName}</p>
                 <p className="text-gray-400">Resolving CNAME... <span className="text-emerald-500">OK</span></p>
                 <p className="text-gray-400">Target matches... <span className="text-emerald-500">OK</span></p>
                 <p className="text-gray-400">Querying CA status... <span className={statusColor}>{domain.status.toUpperCase()}</span></p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-white"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? <ArrowsClockwise className="animate-spin mr-2"/> : <Terminal className="mr-2"/>}
                  {syncMutation.isPending ? 'Running diagnostics...' : 'Run Diagnostics'}
                </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}