import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import { useAuth, api } from '@/contexts/AuthContext';

declare global {
  interface Window {
    google?: any;
    _googleGsiLoaded?: boolean;
  }
}

interface GoogleAuthButtonProps {
  className?: string;
  text?: string;
  disabled?: boolean;
  role?: 'client' | 'creator';
  category?: string;
  onSuccess?: () => void;
}

export function GoogleAuthButton({
  className = '',
  text = 'Continue with Google',
  disabled = false,
  role = 'client',
  category,
  onSuccess,
}: GoogleAuthButtonProps) {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const gsiScriptLoaded = useRef(false);

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '349133501173-8q51dm2dalrpg244mq07lfhlcrhk1ota.apps.googleusercontent.com';

  // Ensure Google Identity Services script is loaded
  useEffect(() => {
    if (window.google?.accounts?.id || window.google?.accounts?.oauth2) {
      gsiScriptLoaded.current = true;
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        gsiScriptLoaded.current = true;
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gsiScriptLoaded.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const handleGoogleAuth = async () => {
    if (disabled || isLoading) return;
    setIsLoading(true);

    try {
      // Strategy 1: Google Identity Services OAuth 2.0 Code Client (Popup)
      if (window.google?.accounts?.oauth2?.initCodeClient) {
        const client = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: async (response: any) => {
            if (response?.error) {
              setIsLoading(false);
              if (response.error !== 'popup_closed_by_user') {
                toast.error(`Google sign-in error: ${response.error}`);
              }
              return;
            }

            if (response?.code) {
              try {
                const authUser = await loginWithGoogle({
                  code: response.code,
                  redirectUri: 'postmessage',
                  role,
                  category,
                });
                if (onSuccess) {
                  onSuccess();
                } else if (authUser?.isOnboarded === false) {
                  navigate('/onboarding');
                } else {
                  const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                  const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/home';
                  navigate(dest);
                }
              } catch (err: any) {
                // Handled in context
              } finally {
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          },
          error_callback: (err: any) => {
            setIsLoading(false);
            console.warn('[GoogleAuth] Popup error callback:', err);
            // Fallback to URL redirect if popup blocked
            triggerRedirectFallback();
          },
        });

        client.requestCode();
        return;
      }

      // Strategy 2: Google Identity Services ID Token (One Tap / Credential)
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              try {
                const authUser = await loginWithGoogle({
                  credential: response.credential,
                  role,
                  category,
                });
                if (onSuccess) {
                  onSuccess();
                } else if (authUser?.isOnboarded === false) {
                  navigate('/onboarding');
                } else {
                  const redirectParam = new URLSearchParams(window.location.search).get('redirect');
                  const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/home';
                  navigate(dest);
                }
              } catch (err: any) {
                // Handled in context
              } finally {
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          },
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            triggerRedirectFallback();
          }
        });
        return;
      }

      // Strategy 3: Server-generated OAuth Redirect Fallback
      await triggerRedirectFallback();
    } catch (error: any) {
      console.error('[GoogleAuth] Execution error:', error);
      setIsLoading(false);
      toast.error('Unable to initiate Google sign-in. Please try again or use email.');
    }
  };

  const triggerRedirectFallback = async () => {
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await api.get('/auth/google/url', {
        params: {
          redirectUri,
          role,
        },
      });

      const targetUrl = res.data?.data?.url || res.data?.url;
      if (targetUrl) {
        window.location.href = targetUrl;
        return;
      }
      throw new Error('Google OAuth URL not returned');
    } catch (err: any) {
      setIsLoading(false);
      toast.error('Google sign-in is currently unavailable. Please use email and password.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading}
      className={`w-full h-11 sm:h-12 bg-white hover:bg-gray-50/90 active:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium text-sm sm:text-base rounded-xl transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={text}
    >
      {isLoading ? (
        <Spinner size="sm" variant="primary" />
      ) : (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span>{isLoading ? 'Connecting to Google...' : text}</span>
    </button>
  );
}
