import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/authSchemas';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const token = searchParams.get('token');

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
        subtitle="This password reset link is invalid or has expired"
        illustration="/images/welcome.png"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <p className="text-gray-600">
            Please request a new password reset link.
          </p>
          <a href="/forgot-password">
            <Button className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white">
              Request New Link
            </Button>
          </a>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password Reset!"
        subtitle="Your password has been successfully reset"
        illustration="/images/welcome.png"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <div className="space-y-2">
            <p className="text-gray-600">
              Your password has been successfully reset.
            </p>
            <p className="text-sm text-gray-500">
              You can now sign in with your new password.
            </p>
          </div>

          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
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
      illustration="/images/welcome.png"
      showBackButton={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <PasswordInput
            id="password"
            label="New Password"
            showStrength
            placeholder="Create a strong password"
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
          className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>

        <p className="text-center text-sm">
          <a
            href="/login"
            className="inline-flex items-center text-[#8A2BE2] hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
