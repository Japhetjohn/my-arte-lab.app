import { useState, useRef } from 'react';
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      window.location.href = '/home';
    } catch (error: any) {
      // Check if the error is due to unverified email
      const response = error.response?.data;
      if (response?.code === 'EMAIL_NOT_VERIFIED') {
        setVerifyEmail(response.email || data.email);
        setShowVerifyModal(true);
        toast.error(response.error || 'Please verify your email');
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
      toast.error('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    try {
      await api.post('/auth/verify-email', { code });
      toast.success('Email verified! You can now log in.');
      setShowVerifyModal(false);
      setVerifyCode(['', '', '', '', '', '']);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verifyEmail });
      toast.success('Code resent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    } finally {
      setIsResending(false);
    }
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

        <p className="text-center text-sm text-gray-600 pt-2 sm:pt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-[#8A2BE2] hover:underline font-medium">
            Sign up
          </a>
        </p>
      </form>

      {/* Email Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Verify Your Email</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#8A2BE2]" />
              </div>
              <p className="text-gray-600">
                Enter the 6-digit code sent to<br />
                <span className="font-medium text-gray-900">{verifyEmail}</span>
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
                  className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-[#8A2BE2]"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-12"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-[#8A2BE2] hover:underline font-medium disabled:opacity-50"
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
