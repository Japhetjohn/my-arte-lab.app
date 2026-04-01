import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/ui-custom/ImageUpload';
import { PasswordInput } from '@/components/ui-custom/PasswordInput';
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
import { Loader2, User, Mail, MapPin, Camera, Briefcase, Check } from 'lucide-react';
import { toast } from 'sonner';
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
  });

  // Step 3 Form
  const step3Form = useForm<RegisterStep3Data>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: {
      role: 'client',
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
    { number: 2, label: 'Profile' },
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
    <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="firstName"
              placeholder="John"
              className="pl-10"
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
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
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
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
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
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          showStrength
          placeholder="Create a strong password"
          error={step1Form.formState.errors.password?.message}
          {...step1Form.register('password')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="Confirm your password"
          error={step1Form.formState.errors.confirmPassword?.message}
          {...step1Form.register('confirmPassword')}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-11"
      >
        Continue
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-[#8A2BE2] hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-5">
      <div className="space-y-4">
        <ImageUpload
          label="Profile Photo *"
          description="Upload a clear photo of yourself"
          aspectRatio="square"
          value={step2Form.watch('avatar')}
          onChange={(value) => step2Form.setValue('avatar', value)}
          placeholderImage="/images/image-upload.png"
        />
        {step2Form.formState.errors.avatar && (
          <p className="text-sm text-red-500">
            {step2Form.formState.errors.avatar.message}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <ImageUpload
          label="Cover Image *"
          description="Upload a cover image for your profile"
          aspectRatio="cover"
          value={step2Form.watch('coverImage')}
          onChange={(value) => step2Form.setValue('coverImage', value)}
          placeholderImage="/images/image-upload.png"
        />
        {step2Form.formState.errors.coverImage && (
          <p className="text-sm text-red-500">
            {step2Form.formState.errors.coverImage.message}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11"
          onClick={() => setCurrentStep(1)}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-11"
        >
          Continue
        </Button>
      </div>
    </form>
  );

  const renderStep3 = () => {
    const role = step3Form.watch('role');

    return (
      <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-5">
        <div className="space-y-2">
          <Label>I want to join as</Label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => step3Form.setValue('role', 'client')}
              className={cn(
                'p-4 border rounded-lg text-left transition-all',
                role === 'client'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center mb-2">
                <User className="w-5 h-5 text-[#8A2BE2]" />
              </div>
              <p className="font-medium">Client</p>
              <p className="text-sm text-gray-500">I want to hire creators</p>
            </button>

            <button
              type="button"
              onClick={() => step3Form.setValue('role', 'creator')}
              className={cn(
                'p-4 border rounded-lg text-left transition-all',
                role === 'creator'
                  ? 'border-[#8A2BE2] bg-[#8A2BE2]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center mb-2">
                <Briefcase className="w-5 h-5 text-[#8A2BE2]" />
              </div>
              <p className="font-medium">Creator</p>
              <p className="text-sm text-gray-500">I want to offer services</p>
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
          <Label>Location</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                placeholder="City/Area"
                {...step3Form.register('location.localArea')}
              />
            </div>
            <div>
              <Input
                placeholder="State"
                {...step3Form.register('location.state')}
              />
            </div>
          </div>
          <Input
            placeholder="Country"
            {...step3Form.register('location.country')}
          />
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="agreeToTerms"
            {...step3Form.register('agreeToTerms')}
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
            className="flex-1 h-11"
            onClick={() => setCurrentStep(2)}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-11"
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
      illustration="/images/register-hero.png"
    >
      {renderStepIndicator()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </AuthLayout>
  );
}
