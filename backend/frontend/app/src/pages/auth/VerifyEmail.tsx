import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { VerificationCodeScreen } from '@/components/auth/VerificationCodeScreen';
import { SuccessModal } from '@/components/modals/SuccessModal';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification, user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');

  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const storedEmail = sessionStorage.getItem('pendingVerificationEmail');
    const resolvedEmail = urlEmail || storedEmail || user?.email || '';
    setTargetEmail(resolvedEmail);
  }, [searchParams, user]);

  const handleVerify = async (code: string) => {
    await verifyEmail(code, targetEmail || undefined);
    // Clear pending email upon success
    sessionStorage.removeItem('pendingVerificationEmail');
    setShowSuccess(true);
  };

  const handleResend = async () => {
    await resendVerification(targetEmail || undefined);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/home');
  };

  return (
    <>
      <VerificationCodeScreen
        email={targetEmail}
        heading="Verify your email address"
        subheadingPrefix="We sent a 6-digit verification code to: "
        illustration="/images/undraw_opened_47gd.svg"
        onVerify={handleVerify}
        onResend={handleResend}
        onBack={() => navigate('/login')}
        submitButtonText="Submit"
      />

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        title="Email Verified!"
        message="Your email has been successfully verified. You now have full access to all features of MyArteLab."
        actionLabel="Go to Dashboard"
        onAction={handleSuccessClose}
        illustration="/images/undraw_opened_47gd.svg"
      />
    </>
  );
}
