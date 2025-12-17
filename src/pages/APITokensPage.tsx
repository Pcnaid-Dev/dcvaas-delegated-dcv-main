import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash, Eye, EyeSlash } from '@phosphor-icons/react';
import { getOrgAPITokens, addAPIToken, deleteAPIToken } from '@/lib/data';
import { generateId, hashToken, generateToken } from '@/lib/crypto';
import { toast } from 'sonner';
import type { APIToken } from '@/types';
import { PLAN_LIMITS } from '@/types';
import { CopyButton } from '@/components/CopyButton';

type APITokensPageProps = {
  onNavigate: (page: string) => void;
};

export function APITokensPage({ onNavigate }: APITokensPageProps) {
  const { currentOrg } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());

  // Fetch tokens with React Query
  const { data: tokens = [] } = useQuery({
    queryKey: ['apiTokens', currentOrg?.id],
    queryFn: () => currentOrg ? getOrgAPITokens() : Promise.resolve([]),
    enabled: !!currentOrg,
    staleTime: 30000,
  });

  // Mutation for creating tokens
  const createTokenMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!currentOrg) throw new Error('No organization');
      const plainToken = await generateToken();
      const token: APIToken = {
        id: await generateId(),
        orgId: currentOrg.id,
        name,
        tokenHash: await hashToken(plainToken),
        createdAt: new Date().toISOString(),
      };
      await addAPIToken(token);
      return plainToken;
    },
    onSuccess: (plainToken) => {
      queryClient.invalidateQueries({ queryKey: ['apiTokens', currentOrg?.id] });
      setNewToken(plainToken);
      setTokenName('');
      toast.success('API token created');
    },
    onError: () => {
      toast.error('Failed to create token');
    },
  });

  // Mutation for deleting tokens
  const deleteTokenMutation = useMutation({
    mutationFn: (tokenId: string) => deleteAPIToken(tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiTokens', currentOrg?.id] });
      toast.success('Token deleted');
    },
    onError: () => {
      toast.error('Failed to delete token');
    },
  });

  const handleCreate = async () => {
    if (!currentOrg) return;
    if (!tokenName.trim()) {
      toast.error('Please enter a token name');
      return;
    }
    createTokenMutation.mutate(tokenName);
  };

  const handleDelete = async (tokenId: string) => {
    if (!currentOrg) return;
    deleteTokenMutation.mutate(tokenId);
  };

  const toggleReveal = (tokenId: string) => {
    setRevealedTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const maskToken = (tokenHash: string) => {
    // Show first 8 chars and mask the rest
    return `dcv_${tokenHash.substring(0, 8)}${'•'.repeat(32)}`;
  };

  if (!currentOrg) return null;

  const hasAccess = PLAN_LIMITS[currentOrg.subscriptionTier].apiAccess;

  return (
    <AppShell onNavigate={onNavigate} currentPage="api-tokens">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Tokens</h1>
          <p className="text-muted-foreground mt-1">
            Manage API tokens for programmatic access
          </p>
        </div>

        {!hasAccess ? (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              API Access (Pro Plan)
            </h3>
            <p className="text-muted-foreground mb-6">
              Upgrade to Pro or Agency plan to access the API
            </p>
            <Button onClick={() => onNavigate('billing')}>Upgrade Plan</Button>
          </Card>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  API Tokens
                </h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus size={20} weight="bold" className="mr-2" />
                      Create Token
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API Token</DialogTitle>
                    </DialogHeader>
                    {!newToken ? (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="token-name">Token Name</Label>
                          <Input
                            id="token-name"
                            placeholder="My API Token"
                            value={tokenName}
                            onChange={(e) => setTokenName(e.target.value)}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={handleCreate}
                          disabled={createTokenMutation.isPending}
                        >
                          {createTokenMutation.isPending ? 'Creating...' : 'Create Token'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Your API Token</Label>
                          <div className="flex gap-2">
                            <Input value={newToken} readOnly className="font-mono text-xs" />
                            <CopyButton text={newToken} />
                          </div>
                          <p className="text-xs text-destructive">
                            Make sure to copy your token now. You won't be able
                            to see it again!
                          </p>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            setNewToken(null);
                            setIsCreateOpen(false);
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>

              {tokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No API tokens yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">{token.name}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                            {revealedTokens.has(token.id) ? token.tokenHash : maskToken(token.tokenHash)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReveal(token.id)}
                            className="h-6 w-6 p-0"
                          >
                            {revealedTokens.has(token.id) ? (
                              <EyeSlash size={16} className="text-muted-foreground" />
                            ) : (
                              <Eye size={16} className="text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(token.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash size={18} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete API Token</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{token.name}"? This action cannot be undone and any applications using this token will stop working immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(token.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Token
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold text-foreground mb-2">
                API Documentation
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                View the full API documentation to learn how to integrate with DCVaaS
              </p>
              <Button variant="outline" onClick={() => onNavigate('docs')}>
                View API Docs
              </Button>
            </Card>

            {/* Danger Zone */}
            {tokens.length > 0 && (
              <Card className="p-6 border-2 border-destructive/50 bg-destructive/5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive mb-2">
                      Danger Zone
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deleting API tokens is permanent and cannot be undone. Make sure to remove the token from all applications before deletion.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
