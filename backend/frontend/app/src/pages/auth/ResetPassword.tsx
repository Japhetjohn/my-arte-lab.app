import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/authSchemas';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      toast.error('Invalid or missing reset token');
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await resetPassword(token, data.password);
      setIsSuccess(true);
    } catch (error) {
      // Error handled in resetPassword function
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <AuthLayout
        title="Invalid Link"
        subtitle="This password reset session is invalid or has expired"
        illustration="/images/undraw_opened_47gd.svg"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <p className="text-gray-600 text-sm">
            Please request a new 6-digit verification code to reset your password.
          </p>
          <Link to={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}>
            <Button className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full h-12 font-semibold shadow-md shadow-[#9747FF]/20 cursor-pointer">
              Request New Code
            </Button>
          </Link>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-[#9747FF] hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully reset"
        illustration="/images/undraw_opened_47gd.svg"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mx-auto text-[#9747FF]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <p className="text-gray-700 font-medium">
              Your password has been successfully reset.
            </p>
            <p className="text-sm text-gray-500">
              You can now sign in with your new password.
            </p>
          </div>

          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full h-12 font-semibold shadow-md shadow-[#9747FF]/20 cursor-pointer"
          >
            Sign In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new password for your account"
      illustration="/images/undraw_opened_47gd.svg"
      showBackButton={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <PasswordInput
            id="password"
            label="New Password"
            showStrength
            placeholder="Create a new password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="space-y-2">
          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm your new password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white h-12 rounded-full font-semibold shadow-md shadow-[#9747FF]/20 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
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
