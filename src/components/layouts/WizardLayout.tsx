import { ReactNode } from 'react';
import { ShieldCheck, ChatCircleText } from '@phosphor-icons/react';

export function WizardLayout({ children, currentPage }: { children: ReactNode; currentPage?: string }) {
  // currentPage is accepted for consistency but not used in WizardLayout
  // since it's a simple wizard flow without complex navigation
  void currentPage;
  
  return (
    <div className="min-h-screen bg-emerald-50/50 text-gray-800 font-sans">
      <header className="bg-white border-b border-emerald-100 py-4 px-6 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 text-emerald-800">
           <ShieldCheck size={28} weight="fill" className="text-emerald-600" />
           <span className="font-bold text-lg">AutoCertify</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
           <ChatCircleText size={18} weight="fill" />
           <span>24/7 Support</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-12 px-6">
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/5 border border-emerald-100 overflow-hidden min-h-[400px]">
           {children}
        </div>
        <p className="text-center text-gray-400 text-sm mt-8 flex items-center justify-center gap-2">
          <ShieldCheck weight="fill" className="text-gray-300"/> 
          Bank-grade encryption. 30-day money-back guarantee.
        </p>
      </main>
    </div>
  );
}