import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Certificate,
  Globe,
  Users,
  CreditCard,
  Code,
  Gear,
  ListBullets,
  Queue,
  ShieldCheck,
  Bell,
  SignOut,
} from '@phosphor-icons/react';

type AppShellProps = {
  children: ReactNode;
  onNavigate: (page: string) => void;
  currentPage?: string;
};

export function AppShell({ children, onNavigate, currentPage }: AppShellProps) {
// ADD THIS ONE LINE
const { user, currentOrg, organizations, setCurrentOrg, userRole, logout } = useAuth();

  // Define all navigation items with role requirements
  const allNavItems = [
    { id: 'overview', label: 'Overview', icon: Certificate, roles: ['owner', 'admin', 'member'] },
    { id: 'dashboard', label: 'Domains', icon: Globe, roles: ['owner', 'admin', 'member'] },
    { id: 'jobs', label: 'Jobs', icon: Queue, roles: ['owner', 'admin', 'member'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['owner', 'admin', 'member'] },
    { id: 'api-tokens', label: 'API', icon: Code, roles: ['owner', 'admin'] },
    { id: 'webhooks', label: 'Webhooks', icon: Bell, roles: ['owner', 'admin'] },
    { id: 'billing', label: 'Billing', icon: CreditCard, roles: ['owner'] },
    { id: 'settings', label: 'Settings', icon: Gear, roles: ['owner', 'admin'] },
  ];

  // Filter navigation items based on user role
  // During loading, show only basic items to prevent exposure of restricted functionality
  const navItems = allNavItems.filter(item => {
    if (!userRole) {
      // Show only basic items during loading
      return ['overview', 'dashboard', 'jobs', 'team'].includes(item.id);
    }
    return item.roles.includes(userRole);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-2"
            >
              <Certificate size={28} weight="bold" className="text-primary" />
              <span className="text-lg font-bold text-foreground">DCVaaS</span>
            </button>

            {currentOrg && (
              <div className="text-sm">
                <span className="text-muted-foreground">Org:</span>{' '}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="font-semibold">
                      {currentOrg.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {organizations.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => setCurrentOrg(org)}
                      >
                        {org.name}
                        {org.id === currentOrg.id && ' ✓'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('docs')}
            >
              Docs
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatarUrl} alt={user.login} />
                      <AvatarFallback>
                        {user.login.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.login}
                    <div className="text-xs font-normal text-muted-foreground">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate('admin')}>
                    <ShieldCheck size={16} className="mr-2" />
                    Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate('audit')}>
                    <ListBullets size={16} className="mr-2" />
                    Audit Logs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <SignOut size={16} className="mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r border-border bg-card/30">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
