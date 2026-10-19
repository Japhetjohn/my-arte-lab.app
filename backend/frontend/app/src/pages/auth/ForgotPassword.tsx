import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/authSchemas';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { VerificationCodeScreen } from '@/components/auth/VerificationCodeScreen';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { forgotPassword, verifyResetCode } = useAuth();

  const initialEmail = searchParams.get('email') || '';
  const initialStep = searchParams.get('step') === 'verify' && initialEmail ? 'verify' : 'request';

  const [step, setStep] = useState<'request' | 'verify'>(initialStep);
  const [targetEmail, setTargetEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: initialEmail,
    },
  });

  const onRequestSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const emailToUse = data.email.trim().toLowerCase();
    try {
      await forgotPassword(emailToUse);
      setTargetEmail(emailToUse);
      setStep('verify');
    } catch (error) {
      // Error toast is handled by forgotPassword in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async (code: string) => {
    const resetToken = await verifyResetCode(targetEmail, code);
    // Navigate user directly to Reset Password screen with scoped reset token
    navigate(`/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(targetEmail)}`);
  };

  const handleResendCode = async () => {
    await forgotPassword(targetEmail);
  };

  // Step 2: Verification Code Screen matching reference image
  if (step === 'verify') {
    return (
      <VerificationCodeScreen
        email={targetEmail}
        heading={'Verification code has\nbeen sent'}
        subheadingPrefix="Email: "
        onVerify={handleVerifyResetCode}
        onResend={handleResendCode}
        onBack={() => setStep('request')}
        submitButtonText="Submit"
      />
    );
  }

  // Step 1: Enter email address
  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email to receive a 6-digit verification code"
      illustration="/undraw_working-from-anywhere_33m9.svg"
    >
      <form onSubmit={handleSubmit(onRequestSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10 h-12 rounded-xl border-gray-200 focus-visible:border-[#9747FF] focus-visible:ring-[#9747FF]/20"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white h-12 rounded-full font-semibold shadow-md shadow-[#9747FF]/20 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Code...
            </>
          ) : (
            'Continue'
          )}
        </Button>

        <p className="text-center text-sm pt-2">
          <Link
            to="/login"
            className="inline-flex items-center text-[#9747FF] hover:underline font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
