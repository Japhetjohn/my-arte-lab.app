import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth, api } from '@/contexts/AuthContext';
import {
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  CREATOR_CATEGORIES,
  type RegisterStep1Data,
  type RegisterStep2Data,
  type RegisterStep3Data,
} from '@/lib/validations/authSchemas';
import { Loader2, User, Mail, Briefcase, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 1 | 2 | 3;

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser, login } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredPassword, setRegisteredPassword] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form data state
  const [step1Data, setStep1Data] = useState<RegisterStep1Data | null>(null);
  const [step2Data, setStep2Data] = useState<RegisterStep2Data | null>(null);

  // Step 1 Form
  const step1Form = useForm<RegisterStep1Data>({
    resolver: zodResolver(registerStep1Schema),
  });

  // Step 2 Form
  const step2Form = useForm<RegisterStep2Data>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: {
      gender: undefined,
    },
  });

  // Step 3 Form
  const step3Form = useForm<RegisterStep3Data>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: {
      role: 'client',
      gender: undefined,
      location: {
        localArea: '',
        state: '',
        country: 'Nigeria',
      },
      agreeToTerms: true, // Auto-agree to terms
    },
  });

  const handleStep1Submit = (data: RegisterStep1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Submit = (data: RegisterStep2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: RegisterStep3Data) => {
    if (!step1Data || !step2Data) return;

    // Get avatar URL based on gender
    const getAvatarUrl = (g?: string) => {
      switch (g) {
        case 'male': return '/images/avatar-2.png';
        case 'female': return '/images/avatar-1.png';
        default: return '/images/avatar-3.png';
      }
    };

    setIsLoading(true);
    try {
      await registerUser({
        ...step1Data,
        ...step2Data,
        ...data,
        avatar: getAvatarUrl(step2Data.gender),
        coverImage: '/images/hero-bg.jpg', // Default cover image
      });
      // Store credentials for auto-login after verification
      setRegisteredEmail(step1Data.email);
      setRegisteredPassword(step1Data.password);
      setShowVerifyModal(true);
    } catch (error) {
      // Error handled in register function
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0]; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newCode = [...verifyCode];
    newCode[index] = value;
    setVerifyCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
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
      toast.success('Email verified!');
      
      // Auto-login after verification
      await login(registeredEmail, registeredPassword);
      navigate('/home');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email: registeredEmail });
      toast.success('Code resent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    }
  };

  const steps = [
    { number: 1, label: 'Personal Info' },
    { number: 2, label: 'Avatar' },
    { number: 3, label: 'Role' },
  ];

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                currentStep >= step.number
                  ? 'bg-[#8A2BE2] text-white'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'ml-2 text-sm hidden sm:block',
                currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 sm:w-12 h-0.5 mx-2 sm:mx-4',
                  currentStep > step.number ? 'bg-[#8A2BE2]' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="firstName"
              placeholder="John"
              className="pl-10 h-12 sm:h-11 text-base"
              {...step1Form.register('firstName')}
            />
          </div>
          {step1Form.formState.errors.firstName && (
            <p className="text-sm text-red-500">
              {step1Form.formState.errors.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            className="h-12 sm:h-11 text-base"
            {...step1Form.register('lastName')}
          />
          {step1Form.formState.errors.lastName && (
            <p className="text-sm text-red-500">
              {step1Form.formState.errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10 h-12 sm:h-11 text-base"
            {...step1Form.register('email')}
          />
        </div>
        {step1Form.formState.errors.email && (
          <p className="text-sm text-red-500">
            {step1Form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
        <PasswordInput
          id="password"
          showStrength
          placeholder="Create a strong password"
          error={step1Form.formState.errors.password?.message}
          className="h-12 sm:h-11 text-base"
          {...step1Form.register('password')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="Confirm your password"
          error={step1Form.formState.errors.confirmPassword?.message}
          className="h-12 sm:h-11 text-base"
          {...step1Form.register('confirmPassword')}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-12 sm:h-11 text-base mt-2"
      >
        Continue
      </Button>

      <p className="text-center text-sm text-gray-600 pt-2">
        Already have an account?{' '}
        <a href="/login" className="text-[#8A2BE2] hover:underline font-medium">
          Sign in
        </a>
      </p>
    </form>
  );

  const renderStep2 = () => {
    const gender = step2Form.watch('gender');
    
    const getAvatarUrl = (g: string) => {
      switch (g) {
        case 'male': return '/images/avatar-2.png';  // Male avatar
        case 'female': return '/images/avatar-1.png';  // Female avatar
        default: return '/images/avatar-3.png';  // Neutral avatar
      }
    };

    return (
      <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-5">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Choose Your Avatar</h3>
          <p className="text-gray-500 text-sm">Select your gender to get a cool default avatar</p>
        </div>

        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img
              src={gender ? getAvatarUrl(gender) : '/images/avatar-3.png'}
              alt="Avatar Preview"
              className="w-32 h-32 rounded-full object-cover border-4 border-[#8A2BE2]/20"
            />
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#8A2BE2] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Gender Selection */}
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Select your gender</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => step2Form.setValue('gender', 'male')}
              className={cn(
                'p-3 border rounded-lg text-center transition-all',
                gender === 'male'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-xl">👨</span>
              </div>
              <p className="font-medium text-sm">Male</p>
            </button>

            <button
              type="button"
              onClick={() => step2Form.setValue('gender', 'female')}
              className={cn(
                'p-3 border rounded-lg text-center transition-all',
                gender === 'female'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 mx-auto bg-pink-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-xl">👩</span>
              </div>
              <p className="font-medium text-sm">Female</p>
            </button>

            <button
              type="button"
              onClick={() => step2Form.setValue('gender', 'other')}
              className={cn(
                'p-3 border rounded-lg text-center transition-all',
                gender === 'other'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-xl">🧑</span>
              </div>
              <p className="font-medium text-sm">Other</p>
            </button>
          </div>
          {step2Form.formState.errors.gender && (
            <p className="text-sm text-red-500">
              {step2Form.formState.errors.gender.message}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center">
          You can change your avatar later in your profile settings
        </p>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 sm:h-11 text-base"
            onClick={() => setCurrentStep(1)}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-12 sm:h-11 text-base"
          >
            Continue
          </Button>
        </div>
      </form>
    );
  };

  const renderStep3 = () => {
    const role = step3Form.watch('role');

    return (
      <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4 sm:space-y-5">
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">I want to join as</Label>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => step3Form.setValue('role', 'client')}
              className={cn(
                'p-3 sm:p-4 border rounded-lg text-left transition-all',
                role === 'client'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-[#8A2BE2]" />
              </div>
              <p className="font-medium text-sm sm:text-base">Client</p>
              <p className="text-xs sm:text-sm text-gray-500">I want to hire creators</p>
            </button>

            <button
              type="button"
              onClick={() => step3Form.setValue('role', 'creator')}
              className={cn(
                'p-3 sm:p-4 border rounded-lg text-left transition-all',
                role === 'creator'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center mb-2">
                <Briefcase className="w-5 h-5 text-[#8A2BE2]" />
              </div>
              <p className="font-medium text-sm sm:text-base">Creator</p>
              <p className="text-xs sm:text-sm text-gray-500">I want to offer services</p>
            </button>
          </div>
        </div>

        {role === 'creator' && (
          <div className="space-y-2">
            <Label>Select your category</Label>
            <div className="grid grid-cols-2 gap-2">
              {CREATOR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => step3Form.setValue('category', cat.id)}
                  className={cn(
                    'p-3 border rounded-lg text-left text-sm transition-all',
                    step3Form.watch('category') === cat.id
                      ? 'border-[#8A2BE2] bg-[#8A2BE2]/5 text-[#8A2BE2]'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {step3Form.formState.errors.category && (
              <p className="text-sm text-red-500">
                {step3Form.formState.errors.category.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Location</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="City/Area"
                className="h-12 sm:h-11 text-base"
                {...step3Form.register('location.localArea')}
              />
            </div>
            <div>
              <Input
                placeholder="State"
                className="h-12 sm:h-11 text-base"
                {...step3Form.register('location.state')}
              />
            </div>
          </div>
          <Input
            placeholder="Country"
            className="h-12 sm:h-11 text-base"
            {...step3Form.register('location.country')}
          />
        </div>

        {/* Auto-agree to terms - checkbox removed */}
        <p className="text-xs text-gray-500 text-center">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-[#8A2BE2] hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-[#8A2BE2] hover:underline">
            Privacy Policy
          </Link>
        </p>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 sm:h-11 text-base"
            onClick={() => setCurrentStep(2)}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-12 sm:h-11 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join MyArtelab and start your journey"
      illustration="/images/welcome.png"
      showBackButton={false}
    >
      {renderStepIndicator()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      
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
                <span className="font-medium text-gray-900">{registeredEmail}</span>
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
                className="text-[#8A2BE2] hover:underline font-medium"
              >
                Resend
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
}
