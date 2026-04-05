import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
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

type Step = 1 | 2 | 3;

export function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);

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
      agreeToTerms: false,
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

    setIsLoading(true);
    try {
      await registerUser({
        ...step1Data,
        ...step2Data,
        ...data,
      });
      navigate('/verify-email');
    } catch (error) {
      // Error handled in register function
    } finally {
      setIsLoading(false);
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
        <Link to="/login" className="text-[#8A2BE2] hover:underline font-medium">
          Sign in
        </Link>
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

        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreeToTerms"
            checked={step3Form.watch('agreeToTerms')}
            onCheckedChange={(checked) => step3Form.setValue('agreeToTerms', checked === true, { shouldValidate: true })}
            className="h-5 w-5 mt-0.5 border-2 data-[state=checked]:bg-[#8A2BE2] data-[state=checked]:border-[#8A2BE2]"
          />
          <Label htmlFor="agreeToTerms" className="text-sm font-normal leading-normal cursor-pointer">
            I agree to the{' '}
            <Link to="/terms" className="text-[#8A2BE2] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-[#8A2BE2] hover:underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
        {step3Form.formState.errors.agreeToTerms && (
          <p className="text-sm text-red-500">
            {step3Form.formState.errors.agreeToTerms.message}
          </p>
        )}

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
    </AuthLayout>
  );
}
