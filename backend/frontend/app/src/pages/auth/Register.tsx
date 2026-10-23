import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth, api } from '@/contexts/AuthContext';
import {
  signUpSchema,
  CREATOR_CATEGORIES,
  type SignUpFormData,
} from '@/lib/validations/authSchemas';
import { Loader2, User, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser, login, loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'client' | 'creator'>('client');
  
  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredPassword, setRegisteredPassword] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: 'client',
      category: '',
    },
  });

  // Handle Google OAuth redirect code in query params if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setIsLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      loginWithGoogle({
        code,
        redirectUri: window.location.origin + window.location.pathname,
        role: selectedRole,
      })
        .then((authUser) => {
          if (authUser?.isOnboarded === false) {
            navigate('/onboarding');
          } else {
            navigate('/home');
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [loginWithGoogle, selectedRole, navigate]);

  const handleRoleChange = (role: 'client' | 'creator') => {
    setSelectedRole(role);
    setValue('role', role, { shouldValidate: true });
    if (role === 'client') {
      setValue('category', '');
    }
  };

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      // Map categories to array for backend compatibility
      const payload: any = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role || 'client',
        category: data.role === 'creator' && data.category ? [data.category] : undefined,
        avatar: '/images/default-avatar.png',
        coverImage: '/images/hero-bg.jpg',
        location: {
          country: 'Nigeria',
          state: '',
          localArea: '',
        },
      };

      await registerUser(payload);
      // Store credentials for auto-login after verification
      setRegisteredEmail(data.email.trim());
      setRegisteredPassword(data.password);
      setShowVerifyModal(true);
    } catch (error: any) {
      const errRes = error?.response?.data;
      const errorMsg = (errRes?.error || errRes?.message || error?.message || '').toLowerCase();
      
      if (errorMsg.includes('email') || errorMsg.includes('already registered')) {
        setError('email', {
          type: 'manual',
          message: 'This email is already registered. Please log in or use a different email.',
        });
      } else if (errorMsg.includes('password')) {
        setError('password', {
          type: 'manual',
          message: errRes?.error || errRes?.message || 'Password must be at least 8 characters and contain at least one uppercase and one lowercase letter.',
        });
      } else {
        toast.error(errRes?.error || errRes?.message || 'Registration failed. Please try again.');
      }
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
      toast.success('Email verified! Logging you in...');
      
      // Auto-login after verification
      await login(registeredEmail, registeredPassword);
      const redirectParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null;
      const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/home';
      navigate(dest);
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
      await api.post('/auth/resend-verification', { email: registeredEmail });
      toast.success('New verification code sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join MyArteLab and connect with creative opportunities."
      illustration="/images/auth-illustration.svg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Subtle Role Toggle: Client vs Creator */}
        <div className="space-y-1">
          <div className="flex p-0.5 bg-gray-100 rounded-xl border border-gray-200/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleRoleChange('client')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer',
                selectedRole === 'client'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              Client (Hire creators)
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('creator')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer',
                selectedRole === 'creator'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              Creator (Offer services)
            </button>
          </div>
        </div>

        {/* 5. Name Fields: First Name and Last Name */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-semibold text-gray-700">
              First name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                id="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Jane"
                className="pl-9 h-11 sm:h-12 bg-white border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
                {...register('firstName')}
              />
            </div>
            {errors.firstName && (
              <p className="text-[11px] text-red-500 font-medium">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-semibold text-gray-700">
              Last name
            </Label>
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe"
              className="h-11 sm:h-12 bg-white border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-[11px] text-red-500 font-medium">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Creator Category Dropdown (conditionally shown if Creator is selected) */}
        {selectedRole === 'creator' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <Label htmlFor="category" className="text-xs font-semibold text-gray-700">
              Primary creative category
            </Label>
            <select
              id="category"
              className="w-full h-11 sm:h-12 bg-white border border-gray-200 focus:border-[#9747FF] focus:ring-2 focus:ring-[#9747FF]/20 rounded-xl text-sm px-3 text-gray-800 outline-none transition-all cursor-pointer"
              {...register('category')}
            >
              <option value="">Select your primary specialty...</option>
              {CREATOR_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-[11px] text-red-500 font-medium">{errors.category.message}</p>
            )}
          </div>
        )}

        {/* 6. Email Input */}
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
            <p className="text-[11px] text-red-500 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* 7. Password Input with functional show/hide control */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters (1 uppercase, 1 lowercase)"
            leftIcon={<Lock className="w-4 h-4" />}
            className="h-11 sm:h-12 bg-white border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20 rounded-xl text-sm"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-[11px] text-red-500 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* 8. Full-width purple Create account button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 bg-[#9747FF] hover:bg-[#8534f0] active:bg-[#7427dc] text-white font-semibold text-sm sm:text-base rounded-xl transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </button>

        {/* 9. Subtle divider labelled "or" */}
        <div className="relative my-3 sm:my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 font-medium">or</span>
          </div>
        </div>

        {/* 10. Full-width Continue with Google button */}
        <GoogleAuthButton
          text="Continue with Google"
          disabled={isLoading}
          role={selectedRole}
          category={selectedRole === 'creator' ? (watch('category') || undefined) : undefined}
        />

        {/* 11. Account navigation link */}
        <p className="text-center text-xs sm:text-sm text-gray-500 pt-2 sm:pt-3">
          Already have an account?{' '}
          <Link
            to={
              typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect')
                ? `/login?redirect=${encodeURIComponent(new URLSearchParams(window.location.search).get('redirect')!)}`
                : '/login'
            }
            className="text-[#9747FF] hover:text-[#8534f0] font-semibold hover:underline transition-colors ml-0.5"
          >
            Log in
          </Link>
        </p>
      </form>

      {/* Email Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-center text-xl font-bold text-gray-900 dark:text-gray-100">
              Verify Your Email
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-2 sm:py-4">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[#9747FF]/10 text-[#9747FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                We sent a 6-digit confirmation code to<br />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{registeredEmail}</span>
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
