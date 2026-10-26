import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export interface VerificationCodeScreenProps {
  email: string;
  heading?: string;
  subheadingPrefix?: string;
  illustration?: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack?: () => void;
  submitButtonText?: string;
  initialCooldown?: number;
}

export function VerificationCodeScreen({
  email,
  heading = 'Verify your email address',
  subheadingPrefix = 'Email: ',
  illustration = '/images/undraw_opened_47gd.svg',
  onVerify,
  onResend,
  onBack,
  submitButtonText = 'Verify code',
  initialCooldown = 30,
}: VerificationCodeScreenProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleInputChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return;

    setHasError(false);
    setErrorMessage('');

    const newCode = [...code];
    newCode[index] = cleaned.slice(-1); // Take the latest single digit
    setCode(newCode);

    // Auto-advance to next input if digit entered
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      triggerVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move back and clear previous box
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = code.join('');
      if (fullCode.length === 6 && !isLoading) {
        e.preventDefault();
        triggerVerify(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setCode(newCode);
    setHasError(false);
    setErrorMessage('');

    // Focus last filled or next empty box
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      triggerVerify(pasted);
    }
  };

  const triggerVerify = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 6 || isLoading) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    try {
      await onVerify(codeToSubmit);
    } catch (err: any) {
      setHasError(true);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Invalid verification code';
      setErrorMessage(msg);
      // Keep entered digits and focus first
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setHasError(false);
    setErrorMessage('');

    try {
      await onResend();
      setCooldown(30);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to resend code';
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = code.join('').length === 6;

  return (
    <div className="min-h-[100dvh] w-full bg-white sm:bg-gray-50 flex flex-col justify-between sm:justify-center sm:items-center sm:p-6 transition-colors">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 flex flex-col flex-1 sm:flex-initial min-h-[100dvh] sm:min-h-[620px] justify-between p-6 sm:p-10">
        {/* Top Header Section */}
        <div>
          {/* Back button if supported */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 cursor-pointer -ml-1 group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
          )}

          {/* Centered Downloaded SVG Illustration */}
          {illustration && (
            <div className="flex justify-center mb-6">
              <img
                src={illustration}
                alt="Confirmation Illustration"
                className="h-28 sm:h-36 w-auto object-contain mx-auto drop-shadow-sm select-none"
              />
            </div>
          )}

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight leading-[1.2] whitespace-pre-line text-center sm:text-left">
            {heading}
          </h1>

          {/* Subheading / Email */}
          <p className="text-sm sm:text-base text-gray-600 font-normal mt-2.5 break-all text-center sm:text-left">
            {subheadingPrefix}
            <span className="text-gray-900 font-semibold">{email || 'your email'}</span>
          </p>

          {/* Verification Code Inputs (6 boxes in a horizontal row) */}
          <div className="mt-7 sm:mt-8">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {code.map((digit, index) => {
                return (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={isLoading}
                    aria-label={`Digit ${index + 1}`}
                    className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold rounded-2xl border-2 transition-all duration-150 select-none outline-none caret-[#9747FF] ${
                      hasError
                        ? 'border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'
                        : digit
                        ? 'border-[#9747FF]/70 bg-white text-gray-950 focus:border-[#9747FF] focus:ring-4 focus:ring-[#9747FF]/15'
                        : 'border-gray-200 bg-white text-gray-900 focus:border-[#9747FF] focus:ring-4 focus:ring-[#9747FF]/15'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {hasError && errorMessage && (
              <p className="text-xs sm:text-sm text-red-600 font-medium mt-3 text-left">
                {errorMessage}
              </p>
            )}

            {/* Resend Button - Aligned to the Right */}
            <div className="flex justify-end mt-5 sm:mt-6">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending || isLoading}
                className={`rounded-full px-6 py-2 text-sm font-semibold border transition-all duration-150 cursor-pointer ${
                  cooldown > 0 || isResending
                    ? 'border-gray-200 text-gray-400 bg-transparent cursor-not-allowed'
                    : 'border-[#9747FF] text-[#9747FF] bg-white hover:bg-[#9747FF]/5 active:scale-95 shadow-sm'
                }`}
              >
                {isResending ? 'Sending...' : cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Submit Button with Mobile Safe Area */}
        <div className="mt-auto pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-0">
          <button
            type="button"
            onClick={() => triggerVerify(code.join(''))}
            disabled={!isComplete || isLoading}
            className={`w-full rounded-full py-3.5 sm:py-4 text-base font-semibold tracking-wide transition-all duration-200 flex items-center justify-center ${
              isComplete && !isLoading
                ? 'bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-md shadow-[#9747FF]/25 active:scale-[0.99] cursor-pointer'
                : 'bg-[#94a3b8] text-white cursor-not-allowed opacity-90'
            }`}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" variant="white" className="mr-2" />
                <span>Verifying...</span>
              </>
            ) : (
              submitButtonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
