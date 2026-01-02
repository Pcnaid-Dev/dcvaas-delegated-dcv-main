/**
 * BrandKitsPage - White label customization for agencies
 */
export function BrandKitsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Brand Kits</h1>
        <p className="text-slate-600 mt-2">Customize white-label branding for your clients</p>
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Brand kit customization coming soon...</p>
      </div>
    </div>
  );
}
