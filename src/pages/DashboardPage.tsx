import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useBrand } from '@/contexts/BrandContext';
import { getOrgDomains, getOrgAPITokens, createAPIToken, createDomain, syncDomain } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CheckCircle, Warning, LockKey, Copy, Plus, ArrowRight, DotsThree, ArrowsClockwise } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

// --- 1. KEYLESS DASHBOARD (Interactive) ---
const KeylessDashboard = ({ onNavigate }: any) => {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isKeyModalOpen, setKeyModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const { data: tokens = [] } = useQuery({
    queryKey: ['apiTokens', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgAPITokens() : Promise.resolve([]),
  });

  const createKeyMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg) throw new Error("No Org");
      return createAPIToken(newTokenName || 'Keyless Agent');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apiTokens'] });
      setCreatedToken(data.token);
      toast.success("API Key Generated");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleClose = () => {
    setKeyModalOpen(false);
    setCreatedToken(null);
    setNewTokenName('');
  };

  return (
    <div className="space-y-8">
      {/* Rate Limit / Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded border border-gray-800 bg-[#161b22]">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">API Rate Limit</div>
          <div className="text-2xl font-mono text-emerald-400">950<span className="text-gray-600 text-sm">/1000 req</span></div>
        </div>
        <div className="p-4 rounded border border-gray-800 bg-[#161b22]">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Active Keys</div>
          <div className="text-2xl font-mono text-white">{tokens.length}</div>
        </div>
        <div className="p-4 rounded border border-gray-800 bg-[#161b22]">
           <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">System Health</div>
           <div className="flex items-center gap-2 text-emerald-500 font-mono text-sm mt-1">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             Operational
           </div>
        </div>
      </div>

      {/* API Tokens Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">API Keys</h3>
          
          <Dialog open={isKeyModalOpen} onOpenChange={setKeyModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono">
                Generate New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0d1117] border-gray-800 text-gray-300 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Generate API Key</DialogTitle>
                <DialogDescription>Tokens are scoped to your organization.</DialogDescription>
              </DialogHeader>
              
              {!createdToken ? (
                <div className="space-y-4 pt-4">
                   <div className="space-y-2">
                     <Label>Token Name</Label>
                     <Input 
                       className="bg-[#161b22] border-gray-700 text-white" 
                       placeholder="e.g. CI Runner" 
                       value={newTokenName}
                       onChange={e => setNewTokenName(e.target.value)}
                     />
                   </div>
                   <Button onClick={() => createKeyMutation.mutate()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createKeyMutation.isPending}>
                      {createKeyMutation.isPending ? 'Generating...' : 'Create Token'}
                   </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                   <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded">
                      <Label className="text-emerald-500 text-xs uppercase font-bold">Your Token (Shown Once)</Label>
                      <div className="flex items-center gap-2 mt-2">
                         <code className="flex-1 bg-black p-2 rounded border border-gray-800 font-mono text-xs break-all">{createdToken}</code>
                         <Button size="icon" variant="ghost" onClick={() => handleCopy(createdToken)}>
                           <Copy size={16}/>
                         </Button>
                      </div>
                   </div>
                   <Button onClick={handleClose} className="w-full">Done</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-gray-800 rounded overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] text-gray-500 font-mono text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Key Name</th>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-[#0d1117]">
              {tokens.length > 0 ? tokens.map((t: any) => (
                <tr key={t.id} className="hover:bg-[#161b22]">
                  <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-4 py-3 font-mono">k1_live_...</td>
                  <td className="px-4 py-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className="text-emerald-500 px-2 py-0.5 rounded bg-emerald-500/10 text-xs border border-emerald-500/20">Active</span></td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600">No active keys found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Logs View */}
      <div>
         <h3 className="text-lg font-bold text-white mb-4">Recent Events</h3>
         <div className="bg-black border border-gray-800 rounded p-4 font-mono text-xs text-gray-500 h-48 overflow-y-auto">
            <p><span className="text-blue-400">INFO</span> [System] Dashboard loaded</p>
         </div>
      </div>
    </div>
  );
};

// --- 2. AGENCY DASHBOARD (Interactive) ---
const AgencyDashboard = ({ onNavigate, onSelectDomain }: any) => {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setAddOpen] = useState(false);
  const [domainName, setDomainName] = useState('');

  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
  });

  const addDomainMutation = useMutation({
    mutationFn: (name: string) => createDomain(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setAddOpen(false);
      setDomainName('');
      toast.success("Client Domain Added");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add domain")
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Portfolio</h1>
          <p className="text-slate-500">Manage SSL certificates across all client accounts.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus size={16} className="mr-2"/> Add Client Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Client Domain</DialogTitle>
              <DialogDescription>Enter the domain name to manage.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Domain Name</Label>
                <Input 
                  placeholder="client-site.com" 
                  value={domainName}
                  onChange={e => setDomainName(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => addDomainMutation.mutate(domainName)} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!domainName || addDomainMutation.isPending}
              >
                {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-500 font-medium">Total Active</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{domains.filter((d:any) => d.status === 'active').length}</div>
         </div>
         <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-400">
            <div className="text-sm text-slate-500 font-medium">Action Needed</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{domains.filter((d:any) => d.status !== 'active').length}</div>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Domain</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Renewal</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domains.map((d: any) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  {d.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                       <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div> Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{d.domainName}</td>
                <td className="px-6 py-4 text-slate-500">Unassigned</td>
                <td className="px-6 py-4 text-slate-500">Auto-renewing</td>
                <td className="px-6 py-4 text-right">
                   <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => {
                        onSelectDomain(d.id);
                        onNavigate('domain-detail');
                      }}
                   >
                     Manage
                   </Button>
                </td>
              </tr>
            ))}
            {domains.length === 0 && (
               <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No domains found. Import your client list.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 3. AUTOCERTIFY DASHBOARD (Interactive List + Wizard) ---
const AutoCertifyDashboard = ({ onNavigate, onSelectDomain }: any) => {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const { data: domains = [] } = useQuery({
    queryKey: ['domains', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgDomains(currentOrg.id) : Promise.resolve([]),
    refetchInterval: 5000 
  });
  const [inputDomain, setInputDomain] = useState('');

  const addDomainMutation = useMutation({
    mutationFn: createDomain,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      // Redirect to the wizard view immediately
      onSelectDomain(data.id);
      onNavigate('domain-detail');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleStart = () => {
    if (!inputDomain) return;
    addDomainMutation.mutate(inputDomain);
  };

  // View: Empty State / Input
  if (domains.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
           <LockKey size={32} weight="fill" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Let's secure your website</h1>
        <p className="text-gray-500 mb-8">Enter your website address to remove the "Not Secure" warning.</p>
        
        <div className="max-w-md mx-auto space-y-4">
           <Input 
             placeholder="yourwebsite.com" 
             className="h-12 text-lg text-center bg-white"
             value={inputDomain}
             onChange={(e) => setInputDomain(e.target.value)}
           />
           <Button 
             size="lg" 
             className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg shadow-lg shadow-emerald-900/10 text-white font-bold"
             onClick={handleStart}
             disabled={addDomainMutation.isPending}
           >
             {addDomainMutation.isPending ? 'Securing...' : 'Start Securing'}
           </Button>
        </div>
      </div>
    );
  }

  // View: Domain List (Cards)
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-gray-800">Your Sites</h1>
         <div className="flex gap-2">
            <Input 
               placeholder="Add another site..." 
               className="w-64 bg-white"
               value={inputDomain}
               onChange={(e) => setInputDomain(e.target.value)}
            />
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleStart} disabled={!inputDomain}>
               <Plus size={16} className="mr-2"/> Add
            </Button>
         </div>
       </div>

       <div className="grid gap-4">
          {domains.map((d: any) => (
             <div key={d.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-lg text-gray-800">{d.domainName}</h3>
                   <div className="flex items-center gap-2 mt-1">
                      {d.status === 'active' ? (
                        <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle weight="fill"/> Secure</span>
                      ) : (
                        <span className="text-sm text-amber-600 flex items-center gap-1"><Warning weight="fill"/> Action Needed</span>
                      )}
                   </div>
                </div>
                <Button variant="outline" onClick={() => {
                   onSelectDomain(d.id);
                   onNavigate('domain-detail');
                }}>
                   {d.status === 'active' ? 'View Status' : 'Fix Now'} <ArrowRight className="ml-2"/>
                </Button>
             </div>
          ))}
       </div>
    </div>
  );
};

// --- MAIN SWITCHER ---
export function DashboardPage({ onNavigate, onSelectDomain }: any) {
  const { brand } = useBrand();

  if (brand.brandId === 'keylessssl.dev') return <KeylessDashboard onNavigate={onNavigate} />;
  if (brand.brandId === 'delegatedssl.com') return <AgencyDashboard onNavigate={onNavigate} onSelectDomain={onSelectDomain} />;
  
  // Important: Pass onSelectDomain to AutoCertify so it can navigate to details
  return <AutoCertifyDashboard onNavigate={onNavigate} onSelectDomain={onSelectDomain} />;
}