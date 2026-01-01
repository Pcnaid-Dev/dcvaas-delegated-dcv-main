import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDomain, syncDomain } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Warning, User, EnvelopeSimple, LinkSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function AgencyDomainDetail({ domainId, onNavigate }: any) {
  const queryClient = useQueryClient();
  const { data: domain, isLoading } = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => getDomain(domainId),
  });

  const syncMutation = useMutation({
    mutationFn: () => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] });
      toast.success("Status refreshed");
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (!domain) return <div>Domain not found</div>; // FIX: Handle undefined domain

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Button variant="ghost" onClick={() => onNavigate('dashboard')}>
          <ArrowLeft className="mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold text-slate-800">{domain.domainName}</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Status Card */}
        <div className="col-span-2 space-y-6">
           <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Certificate Status</h2>
              
              <div className="flex items-center gap-4 mb-6">
                 {domain.status === 'active' ? (
                   <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                     <CheckCircle size={24} weight="fill" />
                   </div>
                 ) : (
                   <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                     <Warning size={24} weight="fill" />
                   </div>
                 )}
                 <div>
                   <div className="font-bold text-slate-900 text-lg capitalize">{domain.status.replace('_', ' ')}</div>
                   <div className="text-slate-500 text-sm">
                     {domain.status === 'active' ? 'Auto-renewal active. No action needed.' : 'Client action required.'}
                   </div>
                 </div>
                 <div className="ml-auto">
                   <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                     {syncMutation.isPending ? 'Refreshing...' : 'Refresh Status'}
                   </Button>
                 </div>
              </div>

              {domain.status !== 'active' && (
                <div className="bg-slate-50 p-4 rounded border border-slate-200">
                  <div className="text-sm font-medium text-slate-700 mb-2">Setup Instructions for Client</div>
                  <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded font-mono text-sm text-slate-600">
                    <span className="text-blue-600 font-bold">CNAME</span>
                    <span>_acme-challenge.{domain.domainName}</span>
                    <span className="text-slate-400">→</span>
                    <span>{domain.cnameTarget}</span>
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* Client Sidebar */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
             <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
               <User size={18} /> Client Details
             </h3>
             <div className="space-y-4">
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase">Assigned To</label>
                 <div className="text-slate-700">Unassigned</div>
                 <button className="text-blue-600 text-xs hover:underline">Assign Client</button>
               </div>
               
               <hr className="border-slate-100" />
               
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase">Magic Link</label>
                 <p className="text-xs text-slate-500 mb-2">Send this white-labeled link to your client to let them verify their domain.</p>
                 <div className="flex gap-2">
                   <input className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs" readOnly value={`https://certs.agency.com/verify/${domain.id}`} />
                   <Button size="icon" variant="ghost" className="h-6 w-6"><LinkSimple/></Button>
                 </div>
                 <Button className="w-full mt-2 bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs">
                   <EnvelopeSimple className="mr-2"/> Email Instructions
                 </Button>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}