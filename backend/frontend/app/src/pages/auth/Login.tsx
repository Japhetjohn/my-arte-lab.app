import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth, api } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations/authSchemas';
import { Mail, Lock } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import { useSEO } from '@/hooks/useSEO';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  useSEO({ title: 'Sign In', noindex: true });
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Handle Google OAuth redirect code in query params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const redirectParam = urlParams.get('redirect');
    if (code) {
      setIsLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      loginWithGoogle({
        code,
        redirectUri: window.location.origin + window.location.pathname,
        role: 'client',
      })
        .then((authUser) => {
          if (authUser?.isOnboarded === false) {
            window.location.href = '/onboarding';
          } else {
            const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/home';
            window.location.href = dest;
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [loginWithGoogle]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setShowVerifyModal(false);
    try {
      await login(data.email, data.password);
      const storedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      if (storedUser?.isOnboarded === false) {
        window.location.href = '/onboarding';
      } else {
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/home';
        window.location.href = dest;
      }
    } catch (error: any) {
      // Check if the error is due to unverified email
      const response = error.response?.data;
      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setVerifyEmail(response.email || data.email);
        setShowVerifyModal(true);
        toast.error(response.error || 'Please verify your email to continue');
      }
      // Other errors are handled by the login function
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verifyCode];
    newCode[index] = value;
    setVerifyCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verifyCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify email
  const handleVerify = async () => {
    const code = verifyCode.join('');
    if (code.length !== 6) {
      toast.error('Enter all 6 digits of your verification code');
      return;
    }

    setIsVerifying(true);
    try {
      await api.post('/auth/verify-email', { code });
      toast.success('Email verified. You can now sign in.');
      setShowVerifyModal(false);
      setVerifyCode(['', '', '', '', '', '']);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verifyEmail });
      toast.success('A new verification code has been sent.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not resend code. Try again in a moment.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Good to see you"
      subtitle="Sign in to pick up where you left off."
      illustration="/images/auth-illustration.svg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10 h-11 sm:h-12 bg-white border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password Input with show/hide control */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            leftIcon={<Lock className="w-4 h-4" />}
            className="h-11 sm:h-12 bg-white border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>
          )}

          {/* Forgot password link */}
          <div className="flex justify-end pt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#9747FF] hover:text-[#8534f0] hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Full-width purple Sign in button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 bg-[#9747FF] hover:bg-[#8534f0] active:bg-[#7427dc] text-white font-semibold text-sm sm:text-base rounded-xl transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" variant="white" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>

        {/* Subtle divider labelled "or" */}
        <div className="relative my-4 sm:my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 font-medium">or</span>
          </div>
        </div>

        {/* Full-width Continue with Google button */}
        <GoogleAuthButton text="Continue with Google" disabled={isLoading} />

        {/* Account navigation link */}
        <p className="text-center text-xs sm:text-sm text-gray-500 pt-3 sm:pt-4">
          Don&apos;t have an account?{' '}
          <Link
            to={
              typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect')
                ? `/register?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect')!)}`
                : '/register'
            }
            className="text-[#9747FF] hover:text-[#8534f0] font-semibold hover:underline transition-colors ml-0.5"
          >
            Create account
          </Link>
        </p>
      </form>

      {/* Email Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-center text-xl font-bold text-gray-900 dark:text-gray-100">
              Verify your email
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 sm:py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#9747FF]/10 text-[#9747FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code sent to<br />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{verifyEmail}</span>
              </p>
            </div>

            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-6">
              {verifyCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-gray-200 dark:border-[#2f3032] dark:bg-[#121212] dark:text-gray-100 rounded-xl focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white h-11 sm:h-12 rounded-xl text-sm font-semibold cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Spinner size="sm" variant="white" className="mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-4">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#9747FF] hover:text-[#8534f0] hover:underline font-semibold disabled:opacity-50 cursor-pointer ml-1"
              >
                {isResending ? 'Sending...' : 'Resend'}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
