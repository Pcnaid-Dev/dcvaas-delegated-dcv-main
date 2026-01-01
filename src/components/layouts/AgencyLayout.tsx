import { ReactNode } from 'react';
import { Buildings, Gear, SignOut, MagnifyingGlass, Bell, ChartPieSlice, ListDashes, UsersThree, Briefcase, Palette, ClockCounterClockwise } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext'; // CHANGED: Use Context

export function AgencyLayout({ children }: { children: ReactNode }) {
  const { logout, user, currentOrg } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">
            <Buildings weight="bold" size={18} />
          </div>
          <span className="font-bold text-slate-800">DelegatedSSL</span>
        </div>
        
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3 mt-4">
            {currentOrg?.name || 'Agency Console'}
          </div>
          
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md">
            <ChartPieSlice size={18} /> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors">
            <Briefcase size={18} /> Clients
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors">
            <ListDashes size={18} /> Domains
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors">
            <Palette size={18} /> Brand Kits
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors">
            <UsersThree size={18} /> Team
          </button>
          
          <div className="mt-8 border-t border-slate-100 pt-4">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
               <ClockCounterClockwise size={18} /> Audit Log
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
               <Gear size={18} /> Settings
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-200">
          <button onClick={() => logout()} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 w-full">
            <SignOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
           <div className="relative w-96">
             <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Search domains, clients, or tags..." 
               className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-md text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
             />
           </div>
           <div className="flex items-center gap-4">
             <button className="relative p-2 text-slate-400 hover:text-slate-600">
               <Bell size={20} />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200">
               {user?.login?.substring(0,2).toUpperCase() || 'AG'}
             </div>
           </div>
        </header>

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}