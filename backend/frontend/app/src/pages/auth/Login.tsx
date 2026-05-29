import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth, api } from '@/contexts/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validations/authSchemas';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setShowVerifyPrompt(false);
    try {
      await login(data.email, data.password);
      window.location.href = '/home'; // Force full page reload
    } catch (error: any) {
      // Check if the error is due to unverified email
      const response = error.response?.data;
      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setVerifyEmail(response.email || data.email);
        setShowVerifyPrompt(true);
        toast.error(response.error || 'Please verify your email');
      }
      // Other errors are handled by the login function
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verifyEmail) return;
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verifyEmail });
      toast.success('Verification code sent! Check your email.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToVerify = () => {
    // Store email in session storage so VerifyEmail page can use it
    sessionStorage.setItem('pendingVerificationEmail', verifyEmail);
    window.location.href = '/verify-email';
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your MyArteLab account"
      illustration="/images/welcome.png"
      showBackButton={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10 h-12 sm:h-11 text-base"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
            <a
              href="/forgot-password"
              className="text-sm text-[#8A2BE2] hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            className="h-12 sm:h-11 text-base"
            {...register('password')}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-12 sm:h-11 text-base mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Email Verification Prompt */}
        {showVerifyPrompt && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">Email Not Verified</h3>
                <p className="text-xs text-amber-700 mt-1">
                  Your email <span className="font-medium">{verifyEmail}</span> needs to be verified before you can log in.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendCode}
                disabled={isResending}
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleGoToVerify}
                className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
              >
                Verify Email
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-gray-600 pt-2 sm:pt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-[#8A2BE2] hover:underline font-medium">
            Sign up
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
