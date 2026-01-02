import { ReactNode } from 'react';
import { Terminal, Book, Code, Pulse } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext'; // CHANGED: Use Context

export function KeylessLayout({ children, currentPage }: { children: ReactNode; currentPage?: string }) {
  // Use the wrapper context, not raw Auth0
  const { loginWithRedirect, isAuthenticated, logout } = useAuth();
  
  // currentPage is accepted for consistency but not used in KeylessLayout
  // since it doesn't have a sidebar with active states
  void currentPage; 

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 font-mono selection:bg-emerald-900 selection:text-white">
      <nav className="border-b border-gray-800 bg-[#161b22]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold tracking-tight">
            <Terminal weight="fill" className="text-emerald-500" size={24} />
            <span>KeylessSSL</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <a href="/docs" className="hover:text-white transition-colors flex items-center gap-2">
              <Book size={16} /> Docs
            </a>
            <a href="/docs" className="hover:text-white transition-colors flex items-center gap-2">
              <Code size={16} /> API
            </a>
            <span className="hover:text-white transition-colors flex items-center gap-2 cursor-default">
              <Pulse size={16} className="text-emerald-500" /> Status
            </span>
            
            <div className="h-4 w-px bg-gray-700 mx-2"></div>
            
            {!isAuthenticated ? (
              <button onClick={() => loginWithRedirect()} className="hover:text-white">
                Sign In
              </button>
            ) : (
              <button onClick={() => logout()} className="hover:text-white">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="border-t border-gray-800 mt-20 py-8 text-xs text-gray-600 text-center">
        <p>latency: 24ms • region: us-east-1 • status: nominal</p>
      </footer>
    </div>
  );
}