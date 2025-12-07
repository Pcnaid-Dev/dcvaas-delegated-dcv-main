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
    const orgs = await getUserOrganizations();
    const completeOrgs: Organization[] = orgs.map(org => ({
      ...org,
      ownerId: org.ownerId || user.id,
      subscriptionTier: org.subscriptionTier || 'free',
      createdAt: org.createdAt || new Date().toISOString(),
    }));
    setOrganizations(completeOrgs);
    
    if (!currentOrg && completeOrgs.length > 0) {
      setCurrentOrg(completeOrgs[0]);
    } else if (currentOrg) {
      const updated = completeOrgs.find(o => o.id === currentOrg.id);
      if (updated) {
        setCurrentOrg(updated);
      }
    }
  };

  useEffect(() => {
    async function initAuth() {
      try {
        let sparkUser;
        
        // CHECK IF SPARK EXISTS (Localhost fallback)
        if (typeof window.spark !== 'undefined') {
            sparkUser = await window.spark.user();
        } else {
            console.log("Running locally (No Spark), using mock user.");
            sparkUser = {
                id: "dev-user-1",
                email: "dev@local",
                login: "DevUser",
                avatarUrl: "",
                isOwner: true
            };
        }
        
        let existingUser = await getUser();
        
        let completeUser: User;
        if (!existingUser) {
          completeUser = {
            id: sparkUser.id,
            email: sparkUser.email,
            login: sparkUser.login,
            avatarUrl: sparkUser.avatarUrl,
            createdAt: new Date().toISOString(),
          };
          await setUser(completeUser);
        } else {
          // Ensure existingUser has all required User properties
          completeUser = {
            id: existingUser.id,
            email: existingUser.email,
            login: existingUser.login || sparkUser.login,
            avatarUrl: existingUser.avatarUrl || sparkUser.avatarUrl,
            createdAt: existingUser.createdAt || new Date().toISOString(),
          };
          await setUser(completeUser);
        }
        
        setUserState(completeUser);
        
        const orgs = await getUserOrganizations();
        const completeOrgs: Organization[] = orgs.map(org => ({
          ...org,
          ownerId: org.ownerId || completeUser.id,
          subscriptionTier: org.subscriptionTier || 'free',
          createdAt: org.createdAt || new Date().toISOString(),
        }));
        setOrganizations(completeOrgs);
        
        if (completeOrgs.length > 0) {
          setCurrentOrg(completeOrgs[0]);
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
