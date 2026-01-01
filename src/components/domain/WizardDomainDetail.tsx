import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDomain, syncDomain } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { CheckCircle, Warning, Copy, ArrowsClockwise, ShieldCheck, CaretLeft } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function WizardDomainDetail({ domainId, onNavigate }: any) {
  const queryClient = useQueryClient();
  const { data: domain } = useQuery({
    queryKey: ['domain', domainId],
    queryFn: () => getDomain(domainId),
    refetchInterval: 3000
  });

  const syncMutation = useMutation({
    mutationFn: () => syncDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain', domainId] });
      toast.success("Checking connection...");
    }
  });

  if (!domain) return null;

  // Header with Back Button
  const Header = () => (
    <div className="mb-6">
      <button 
        onClick={() => onNavigate('dashboard')} 
        className="flex items-center text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium mb-4"
      >
        <CaretLeft size={16} className="mr-1" /> Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold text-gray-900">{domain.domainName}</h1>
    </div>
  );

  if (domain.status === 'active') {
    return (
      <div className="text-center py-12">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 animate-pulse">
           <ShieldCheck size={64} weight="fill" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">You're All Set!</h1>
        <p className="text-xl text-gray-600 mb-8">
          {domain.domainName} is now secure. The padlock is active.
        </p>
        <Button onClick={() => onNavigate('dashboard')} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header />
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex gap-4">
           <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-amber-600 font-bold">1</div>
           <div className="flex-1">
             <h3 className="font-bold text-gray-800 mb-2">Log in to your domain provider</h3>
             <p className="text-sm text-gray-600">Go to GoDaddy, Namecheap, or wherever you bought your domain.</p>
           </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex gap-4">
           <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 text-amber-600 font-bold">2</div>
           <div className="flex-1">
             <h3 className="font-bold text-gray-800 mb-4">Add this record</h3>
             
             <div className="bg-white rounded-lg border border-amber-200 divide-y divide-gray-100 shadow-sm">
                <div className="p-4 flex justify-between items-center">
                   <span className="text-xs uppercase font-bold text-gray-400">Type</span>
                   <span className="font-mono font-bold text-blue-600">CNAME</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                   <span className="text-xs uppercase font-bold text-gray-400">Name (Host)</span>
                   <div className="flex items-center gap-2">
                     <span className="font-mono bg-gray-50 px-2 py-1 rounded">_acme-challenge</span>
                     <Copy className="text-gray-400 cursor-pointer hover:text-black" onClick={() => { navigator.clipboard.writeText("_acme-challenge"); toast.success("Copied"); }}/>
                   </div>
                </div>
                <div className="p-4 flex justify-between items-center">
                   <span className="text-xs uppercase font-bold text-gray-400">Value (Target)</span>
                   <div className="flex items-center gap-2">
                     <span className="font-mono bg-gray-50 px-2 py-1 rounded text-green-600 font-bold">{domain.cnameTarget}</span>
                     <Copy className="text-gray-400 cursor-pointer hover:text-black" onClick={() => { navigator.clipboard.writeText(domain.cnameTarget); toast.success("Copied"); }}/>
                   </div>
                </div>
             </div>
           </div>
        </div>
      </div>

      <div className="pt-4">
        <Button 
          size="lg" 
          className="w-full h-16 text-xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 text-white font-bold"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? <ArrowsClockwise className="animate-spin mr-3" /> : null}
          {syncMutation.isPending ? 'Verifying...' : 'I Added It — Check Now'}
        </Button>
      </div>
    </div>
  );
}