import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Organization, Membership } from '@/types';
import { getUser, setUser, getUserOrganizations } from '@/lib/data';
import { generateId } from '@/lib/crypto';

type AuthContextType = {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => void;
  refreshOrganizations: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshOrganizations = async () => {
    if (!user) return;
    const orgs = await getUserOrganizations(user.id);
    setOrganizations(orgs);
    
    if (!currentOrg && orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    } else if (currentOrg) {
      const updated = orgs.find(o => o.id === currentOrg.id);
      if (updated) {
        setCurrentOrg(updated);
      }
    }
  };

  useEffect(() => {
    async function initAuth() {
      try {
        const sparkUser = await spark.user();
        
        let existingUser = await getUser(sparkUser.id);
        
        if (!existingUser) {
          existingUser = {
            id: sparkUser.id,
            email: sparkUser.email,
            login: sparkUser.login,
            avatarUrl: sparkUser.avatarUrl,
            createdAt: new Date().toISOString(),
          };
          await setUser(existingUser);
        }
        
        setUserState(existingUser);
        
        const orgs = await getUserOrganizations(existingUser.id);
        setOrganizations(orgs);
        
        if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const signOut = () => {
    setUserState(null);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        setCurrentOrg,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshOrganizations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
