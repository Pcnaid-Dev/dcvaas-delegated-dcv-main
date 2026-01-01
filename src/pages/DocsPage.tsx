import { useBrand } from '@/contexts/BrandContext';
import { Card } from '@/components/ui/card';
import { Code, Book, Shield, Globe } from '@phosphor-icons/react';

// --- KEYLESS DOCS (API Ref) ---
const KeylessDocs = () => (
  <div className="min-h-screen bg-[#0d1117] text-gray-300 font-mono flex">
    <div className="w-64 border-r border-gray-800 p-6 hidden md:block">
       <div className="font-bold text-white mb-4">API Reference</div>
       <ul className="space-y-2 text-sm text-gray-500">
         <li className="text-emerald-400">Introduction</li>
         <li className="hover:text-white cursor-pointer">Authentication</li>
         <li className="hover:text-white cursor-pointer">Domains</li>
         <li className="hover:text-white cursor-pointer">Certificates</li>
         <li className="hover:text-white cursor-pointer">Webhooks</li>
       </ul>
    </div>
    <div className="flex-1 p-12 max-w-4xl">
       <h1 className="text-3xl font-bold text-white mb-6">Introduction</h1>
       <p className="text-gray-400 mb-8 leading-relaxed">
         KeylessSSL is a RESTful API for automating DNS-01 challenges via CNAME delegation.
         All requests must be authenticated using a scoped Bearer token.
       </p>
       <div className="bg-[#161b22] p-4 rounded border border-gray-800 font-mono text-sm mb-8">
         <span className="text-purple-400">POST</span> <span className="text-gray-300">https://api.keylessssl.dev/v1/issue</span>
       </div>
    </div>
  </div>
);

// --- DELEGATED DOCS (Knowledge Base) ---
const DelegatedDocs = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <div className="bg-blue-700 py-16 px-8 text-center text-white">
      <h1 className="text-3xl font-bold mb-4">How can we help?</h1>
      <input className="w-full max-w-xl px-4 py-3 rounded-lg text-slate-900" placeholder="Search for answers..." />
    </div>
    <div className="max-w-5xl mx-auto py-12 px-6 grid md:grid-cols-3 gap-6">
       {['Getting Started', 'Client Management', 'Billing & Seats', 'White Labeling', 'DNS Setup', 'Troubleshooting'].map(topic => (
         <Card key={topic} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-bold text-lg mb-2">{topic}</h3>
            <p className="text-slate-500 text-sm">Learn how to configure {topic} for your agency.</p>
         </Card>
       ))}
    </div>
  </div>
);

// --- AUTOCERTIFY GUIDES (Simple Help) ---
const AutoCertifyDocs = () => (
  <div className="min-h-screen bg-white text-gray-800 font-sans py-12 px-6">
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Setup Guides</h1>
      <div className="space-y-4">
        {[
          { icon: Globe, title: "How to add the record to GoDaddy" },
          { icon: Globe, title: "How to add the record to Namecheap" },
          { icon: Globe, title: "How to add the record to Cloudflare" },
          { icon: Shield, title: "Why do I see 'Not Secure'?" },
        ].map((guide, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer transition-colors">
             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
               <guide.icon size={20} weight="fill" />
             </div>
             <span className="font-medium text-lg">{guide.title}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export function DocsPage({ onNavigate }: any) {
  const { brand } = useBrand();

  if (brand.brandId === 'keylessssl.dev') return <KeylessDocs />;
  if (brand.brandId === 'delegatedssl.com') return <DelegatedDocs />;
  return <AutoCertifyDocs />;
}