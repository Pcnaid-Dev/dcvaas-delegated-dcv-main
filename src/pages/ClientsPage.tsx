/**
 * ClientsPage - Manage client accounts for agency/MSP use case
 */
export function ClientsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-600 mt-2">Manage your client accounts and portfolios</p>
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Client management dashboard coming soon...</p>
      </div>
    </div>
  );
}
