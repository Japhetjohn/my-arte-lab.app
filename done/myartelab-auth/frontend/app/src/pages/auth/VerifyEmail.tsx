import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/layouts/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SuccessModal } from '@/components/modals/SuccessModal';

export function VerifyEmail() {
  const navigate = useNavigate();
  const { verifyEmail, resendVerification, user } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join('');
      if (fullCode.length === 6) {
        handleSubmit(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setCode(newCode);

    // Focus appropriate input
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (fullCode: string) => {
    setIsLoading(true);
    try {
      await verifyEmail(fullCode);
      setShowSuccess(true);
    } catch (error) {
      // Reset code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerification();
      setCountdown(30);
    } finally {
      setIsResending(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate('/home');
  };

  return (
    <>
      <AuthLayout
        title="Verify Your Email"
        subtitle={`Enter the 6-digit code sent to ${user?.email || 'your email'}`}
        illustration="/images/email-verified.png"
        showBackButton={false}
      >
        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className="w-12 h-14 text-center text-2xl font-bold"
              />
            ))}
          </div>

          <Button
            onClick={() => handleSubmit(code.join(''))}
            disabled={code.join('').length !== 6 || isLoading}
            className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              Didn't receive the code?
            </p>
            {countdown > 0 ? (
              <p className="text-sm text-gray-400">
                Resend in {countdown}s
              </p>
            ) : (
              <Button
                variant="link"
                onClick={handleResend}
                disabled={isResending}
                className="text-[#8A2BE2]"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend Code'
                )}
              </Button>
            )}
          </div>
        </div>
      </AuthLayout>

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        title="Email Verified!"
        message="Your email has been successfully verified. You can now access all features of MyArtelab."
        actionLabel="Go to Dashboard"
        onAction={handleSuccessClose}
        illustration="/images/email-verified.png"
      />
    </>
  );
}
