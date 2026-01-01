import { useBrand } from '@/contexts/BrandContext';
import { Button } from '@/components/ui/button';
import { Check, X } from '@phosphor-icons/react';
import { useAuth0 } from '@auth0/auth0-react';

// --- KEYLESS PRICING (Dark, Dev-Focused) ---
const KeylessPricing = ({ login }: any) => (
  <div className="min-h-screen bg-[#0d1117] text-gray-300 font-mono py-20 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl text-white font-bold mb-4">Pricing that doesn't punish automation.</h1>
        <p className="text-gray-500">No per-certificate fees. No "Enterprise" gates for SSO.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Hacker Tier */}
        <div className="border border-gray-700 bg-[#161b22] p-8 rounded-lg">
          <h3 className="text-xl text-white font-bold mb-2">Hacker</h3>
          <div className="text-4xl text-white font-bold mb-6">$0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
          <Button onClick={() => login({ screen_hint: 'signup' })} variant="outline" className="w-full mb-8 border-gray-600 text-white hover:bg-gray-800">Get API Key</Button>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><Check className="text-emerald-500"/> 3 Domains</li>
            <li className="flex gap-2"><Check className="text-emerald-500"/> Unlimited Renewals</li>
            <li className="flex gap-2"><Check className="text-emerald-500"/> Community Queue</li>
          </ul>
        </div>
        
        {/* Pro Tier */}
        <div className="border border-emerald-900/50 bg-[#161b22] p-8 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs px-3 py-1 font-bold uppercase">Recommended</div>
          <h3 className="text-xl text-white font-bold mb-2">Pro</h3>
          <div className="text-4xl text-white font-bold mb-6">$29<span className="text-lg text-gray-500 font-normal">/mo</span></div>
          <Button onClick={() => login({ screen_hint: 'signup' })} className="w-full mb-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Start Pro</Button>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><Check className="text-emerald-500"/> 50 Domains</li>
            <li className="flex gap-2"><Check className="text-emerald-500"/> Priority Queue</li>
            <li className="flex gap-2"><Check className="text-emerald-500"/> Team Access (RBAC)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// --- DELEGATED PRICING (SaaS / Agency Table) ---
const DelegatedPricing = ({ login }: any) => (
  <div className="min-h-screen bg-slate-50 py-20 px-6 font-sans text-slate-900">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold mb-4 text-slate-900">Flat-Rate Plans for Agencies</h1>
        <p className="text-xl text-slate-500">Stop paying per-domain overages. Predictable billing for your entire portfolio.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 p-4 font-semibold text-slate-700">
          <div className="col-span-2">Features</div>
          <div className="text-center">Agency</div>
          <div className="text-center">Enterprise</div>
        </div>
        
        {[
          { name: "Domains Included", agency: "250", ent: "2,000+" },
          { name: "Price", agency: "$79/mo", ent: "$299/mo" },
          { name: "White Label Portal", agency: true, ent: true },
          { name: "Custom Domain (CNAME)", agency: true, ent: true },
          { name: "SLA Guarantee", agency: false, ent: true },
          { name: "Dedicated Account Mgr", agency: false, ent: true },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-4 p-4 border-b border-slate-100 hover:bg-slate-50/50">
            <div className="col-span-2 text-slate-600 font-medium">{row.name}</div>
            <div className="text-center font-bold text-slate-800">
              {typeof row.agency === 'boolean' ? (row.agency ? <Check className="inline text-green-600"/> : <X className="inline text-slate-300"/>) : row.agency}
            </div>
            <div className="text-center font-bold text-slate-800">
              {typeof row.ent === 'boolean' ? (row.ent ? <Check className="inline text-blue-600"/> : <X className="inline text-slate-300"/>) : row.ent}
            </div>
          </div>
        ))}
        
        <div className="grid grid-cols-4 p-8 bg-slate-50">
           <div className="col-span-2"></div>
           <div className="px-2">
             <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => login({ screen_hint: 'signup' })}>Start Trial</Button>
           </div>
           <div className="px-2">
             <Button variant="outline" className="w-full" onClick={() => window.location.href = 'mailto:sales@delegatedssl.com'}>Contact Sales</Button>
           </div>
        </div>
      </div>
    </div>
  </div>
);

// --- AUTOCERTIFY PRICING (Simple) ---
const AutoCertifyPricing = ({ login }: any) => (
  <div className="min-h-screen bg-white py-20 px-6 font-sans">
    <div className="max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
      <p className="text-gray-500 mb-10">Everything you need to secure your site.</p>
      
      <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 shadow-xl shadow-emerald-900/5">
        <div className="text-emerald-800 font-bold tracking-wide uppercase text-sm mb-2">Business Pro</div>
        <div className="text-5xl font-bold text-gray-900 mb-2">$15<span className="text-lg text-gray-500 font-normal">/mo</span></div>
        <p className="text-gray-500 text-sm mb-8">billed monthly, cancel anytime</p>
        
        <Button onClick={() => login({ screen_hint: 'signup' })} size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg mb-6">
          Secure My Site
        </Button>
        
        <div className="space-y-4 text-left">
          <div className="flex gap-3 text-gray-700"><div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check weight="bold"/></div> 24/7 Monitoring</div>
          <div className="flex gap-3 text-gray-700"><div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check weight="bold"/></div> Auto-Renewal</div>
          <div className="flex gap-3 text-gray-700"><div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check weight="bold"/></div> Email Support</div>
        </div>
      </div>
    </div>
  </div>
);

export function PricingPage({ onNavigate }: any) {
  const { brand } = useBrand();
  const { loginWithRedirect } = useAuth0();

  if (brand.brandId === 'keylessssl.dev') return <KeylessPricing login={loginWithRedirect} />;
  if (brand.brandId === 'delegatedssl.com') return <DelegatedPricing login={loginWithRedirect} />;
  return <AutoCertifyPricing login={loginWithRedirect} />;
}