// src/contexts/AuthContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import type { User, Organization } from '@/types';
import { getUserOrganizations } from '@/lib/data';
import { useState, useEffect, useMemo } from 'react';

type AuthContextType = {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  userRole: 'owner' | 'admin' | 'member' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithRedirect: () => Promise<void>;
  logout: () => void; // Changed signature to match usage
  getAccessToken: () => Promise<string>;
  refreshOrganizations: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user: auth0User,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);

  // Map Auth0 user to your app's User type
  const user: User | null = useMemo(() => {
    return isAuthenticated && auth0User ? {
      id: auth0User.sub!,
      email: auth0User.email!,
      login: auth0User.nickname || auth0User.name || 'User',
      avatarUrl: auth0User.picture || '',
      createdAt: new Date().toISOString(),
    } : null;
  }, [isAuthenticated, auth0User]); // Dependencies
  
  // Load organizations when user is authenticated
  useEffect(() => {
    async function loadOrgs() {
      if (user) {
        // For now, we still use the stub/local logic for orgs until the API is fully migrated
        const orgs = await getUserOrganizations(); 
        setOrganizations(orgs);
        if (orgs.length > 0 && !currentOrg) {
          setCurrentOrg(orgs[0]);
        }
      }
    }
    loadOrgs();
  }, [user?.id]);

  // Load user role when org changes
  useEffect(() => {
    async function loadRole() {
      if (user && currentOrg) {
        // FAILSAFE: If the user ID matches the Org Owner ID, they are the OWNER.
        // This fixes the missing "Team" / "Settings" menu issue.
        if (currentOrg.ownerId === user.id) {
          setUserRole('owner');
          return;
        }

        try {
          const { getOrgMembers } = await import('@/lib/data');
          const members = await getOrgMembers(currentOrg.id);
          const member = members.find(m => m.userId === user.id || m.email === user.email);
          setUserRole(member?.role || null);
        } catch (err) {
          console.warn('Failed to load user role', err);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    }
    loadRole();
  }, [user?.id, currentOrg?.id, currentOrg?.ownerId]); // Added currentOrg.ownerId dependency

  const handleLogout = () => {
    // CLEAR LOCAL DATA to prevent leakage between users
    localStorage.removeItem('dcvaas_user');
    localStorage.removeItem('dcvaas_org');
    localStorage.removeItem('dcvaas_orgs');
    localStorage.removeItem('dcvaas_members');
    localStorage.removeItem('dcvaas_tokens');
    localStorage.removeItem('dcvaas_audit_logs');
    
    // Perform Auth0 logout
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const getAccessToken = async () => {
    return await getAccessTokenSilently();
  };

  const refreshOrganizations = async () => {
     const orgs = await getUserOrganizations();
     setOrganizations(orgs);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        setCurrentOrg,
        userRole,
        isLoading,
        isAuthenticated,
        loginWithRedirect,
        logout: handleLogout,
        getAccessToken,
        refreshOrganizations
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