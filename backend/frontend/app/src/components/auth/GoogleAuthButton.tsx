import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/contexts/AuthContext';

interface GoogleAuthButtonProps {
  className?: string;
  text?: string;
  disabled?: boolean;
}

export function GoogleAuthButton({
  className = '',
  text = 'Continue with Google',
  disabled = false,
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      // 1. Check if backend exposes google oauth initiation endpoint
      const response = await api.get('/auth/google/url').catch(() => null);
      if (response?.data?.data?.url || response?.data?.url) {
        const targetUrl = response.data.data?.url || response.data.url;
        window.location.href = targetUrl;
        return;
      }

      // 2. Fallback check for direct redirect endpoint
      const directCheck = await api.get('/auth/google').catch((err) => err?.response);
      if (directCheck && directCheck.status !== 404 && directCheck.data?.url) {
        window.location.href = directCheck.data.url;
        return;
      }

      // 3. Graceful handling if Google OAuth credentials are not configured on the current backend environment
      toast.info('Google sign-in is not configured on this server. Please use email and password.', {
        duration: 4500,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to connect to Google authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled || isLoading}
      className={`w-full h-11 sm:h-12 bg-white hover:bg-gray-50/80 active:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 font-medium text-sm sm:text-base rounded-xl transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={text}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
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
      <span>{text}</span>
    </button>
  );
}
