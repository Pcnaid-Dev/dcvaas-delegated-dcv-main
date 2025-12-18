import { useEffect, useState } from 'react';
import { exchangeOAuthCode } from '@/lib/data';
import { toast } from 'sonner';

export function OAuthCallbackPage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.location.href = path;
  };

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Get code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(`OAuth error: ${error}`);
        toast.error(`OAuth authorization failed: ${error}`);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        toast.error('No authorization code received');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Get provider and redirect URI from session storage
      const provider = sessionStorage.getItem('oauth_provider');
      const redirectUri = sessionStorage.getItem('oauth_redirect_uri');

      if (!provider || !redirectUri) {
        setStatus('error');
        setErrorMessage('OAuth session data not found');
        toast.error('OAuth session expired. Please try again.');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      // Exchange code for tokens
      await exchangeOAuthCode(provider, code, redirectUri);

      // Clear session storage
      sessionStorage.removeItem('oauth_provider');
      sessionStorage.removeItem('oauth_redirect_uri');

      setStatus('success');
      toast.success(`Successfully connected to ${provider}`);
      setTimeout(() => navigate('/settings'), 1500);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Failed to complete OAuth flow');
      toast.error('Failed to connect provider');
      setTimeout(() => navigate('/settings'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Connecting your DNS provider...</h2>
            <p className="text-muted-foreground">Please wait while we complete the setup.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl">✓</div>
            <h2 className="text-xl font-semibold">Successfully connected!</h2>
            <p className="text-muted-foreground">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl">✕</div>
            <h2 className="text-xl font-semibold">Connection failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
      </div>
    </div>
  );
}
