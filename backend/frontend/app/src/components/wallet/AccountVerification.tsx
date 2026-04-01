import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BankSelector } from './BankSelector';
import { X, Loader2, User } from 'lucide-react';
import { api } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AccountVerificationProps {
  bankId: string;
  accountNumber: string;
  onBankChange: (bank: { id: string; name: string; code: string }) => void;
  onAccountNumberChange: (value: string) => void;
  onVerified: (accountName: string) => void;
  disabled?: boolean;
}

export function AccountVerification({
  bankId,
  accountNumber,
  onBankChange,
  onAccountNumberChange,
  onVerified,
  disabled = false,
}: AccountVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canVerify = bankId && accountNumber.length === 10;

  const handleVerify = async () => {
    if (!canVerify) return;

    setIsVerifying(true);
    setError(null);
    setVerifiedName(null);

    try {
      const response = await api.post('/hostfi/withdrawal/verify-account', {
        bankId,
        accountNumber,
      });

      const { accountName } = response.data;
      setVerifiedName(accountName);
      onVerified(accountName);
      toast.success('Account verified successfully!');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to verify account';
      setError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setVerifiedName(null);
    setError(null);
    onAccountNumberChange('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Bank</Label>
        <BankSelector
          value={bankId}
          onChange={onBankChange}
          disabled={disabled || !!verifiedName}
        />
      </div>

      <div className="space-y-2">
        <Label>Account Number</Label>
        <Input
          type="text"
          placeholder="Enter 10-digit account number"
          value={accountNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
            onAccountNumberChange(value);
            setVerifiedName(null);
            setError(null);
          }}
          disabled={disabled || !!verifiedName}
          maxLength={10}
        />
      </div>

      {!verifiedName && !error && (
        <Button
          type="button"
          onClick={handleVerify}
          disabled={!canVerify || isVerifying || disabled}
          className="w-full"
          variant="outline"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Account'
          )}
        </Button>
      )}

      {verifiedName && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Account Verified
              </p>
              <p className="text-sm text-green-700 mt-1">{verifiedName}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-green-700 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Verification Failed
              </p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-red-700 hover:text-red-800"
            >
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
