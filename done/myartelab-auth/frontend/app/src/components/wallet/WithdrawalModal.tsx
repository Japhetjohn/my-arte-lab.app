import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AccountVerification } from './AccountVerification';
import { WITHDRAWAL_METHODS } from '@/lib/validations/walletSchemas';
import {
  Building2,
  Smartphone,
  Bitcoin,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/contexts/AuthContext';
import { SuccessModal } from '@/components/modals/SuccessModal';
import { TransactionStatusModal } from '@/components/modals/TransactionStatusModal';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  currency?: string;
}

type WithdrawalStep = 'method' | 'details' | 'amount' | 'confirm';
type WithdrawalMethod = 'bank' | 'mobile_money' | 'crypto';

export function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance,
  currency = 'USDC',
}: WithdrawalModalProps) {
  const [step, setStep] = useState<WithdrawalStep>('method');
  const [method, setMethod] = useState<WithdrawalMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'completed' | 'failed' | null>(null);
  const [transactionReference, setTransactionReference] = useState('');

  // Bank withdrawal state
  const [bankId, setBankId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('');

  // Mobile money state
  const [provider, setProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Crypto state
  const [walletAddress, setWalletAddress] = useState('');

  // Amount state
  const [amount, setAmount] = useState('');

  const methodConfig = WITHDRAWAL_METHODS.find((m) => m.id === method);

  const calculateFee = () => {
    if (!methodConfig || !amount) return 0;
    return parseFloat(amount) * methodConfig.fee;
  };

  const calculateTotal = () => {
    if (!amount) return 0;
    return parseFloat(amount) - calculateFee();
  };

  const handleMethodSelect = (selectedMethod: WithdrawalMethod) => {
    setMethod(selectedMethod);
    setStep('details');
  };

  const handleDetailsNext = () => {
    if (method === 'bank' && !accountName) {
      toast.error('Please verify your account first');
      return;
    }
    if (method === 'mobile_money' && (!provider || !phoneNumber)) {
      toast.error('Please fill in all fields');
      return;
    }
    if (method === 'crypto' && !walletAddress) {
      toast.error('Please enter a wallet address');
      return;
    }
    setStep('amount');
  };

  const handleAmountNext = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (numAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (methodConfig && numAmount < methodConfig.minAmount) {
      toast.error(`Minimum withdrawal is ${methodConfig.minAmount}`);
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setTransactionStatus('pending');

    try {
      const payload: any = {
        method,
        amount: parseFloat(amount),
        currency,
      };

      if (method === 'bank') {
        payload.bankId = bankId;
        payload.accountNumber = accountNumber;
        payload.accountName = accountName;
        payload.saveAsBeneficiary = saveAsBeneficiary;
        if (saveAsBeneficiary) payload.beneficiaryName = beneficiaryName;
      } else if (method === 'mobile_money') {
        payload.provider = provider;
        payload.phoneNumber = phoneNumber;
      } else if (method === 'crypto') {
        payload.walletAddress = walletAddress;
        payload.network = 'solana';
      }

      const response = await api.post('/hostfi/withdrawal/initiate', payload);
      setTransactionReference(response.data.reference);
      setTransactionStatus('completed');
      setShowSuccess(true);
    } catch (error: any) {
      setTransactionStatus('failed');
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setMethod(null);
    setBankId('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setProvider('');
    setPhoneNumber('');
    setWalletAddress('');
    setAmount('');
    setSaveAsBeneficiary(false);
    setBeneficiaryName('');
    setTransactionStatus(null);
    setShowSuccess(false);
    onClose();
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Select your preferred withdrawal method</p>
      <div className="space-y-2">
        {WITHDRAWAL_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => handleMethodSelect(m.id as WithdrawalMethod)}
            className="w-full p-4 border rounded-lg hover:border-[#8A2BE2] hover:bg-[#8A2BE2]/5 transition-all text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center flex-shrink-0">
                {m.id === 'bank' && <Building2 className="w-5 h-5 text-[#8A2BE2]" />}
                {m.id === 'mobile_money' && <Smartphone className="w-5 h-5 text-[#8A2BE2]" />}
                {m.id === 'crypto' && <Bitcoin className="w-5 h-5 text-[#8A2BE2]" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>Fee: {(m.fee * 100).toFixed(1)}%</span>
                  <span>•</span>
                  <span>{m.processingTime}</span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDetailsForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('method')}>
          <ArrowLeft className="w-4 h-4" />
        Back
        </Button>
        <span className="font-medium">Enter Details</span>
      </div>

      {method === 'bank' && (
        <AccountVerification
          bankId={bankId}
          accountNumber={accountNumber}
          onBankChange={(bank) => {
            setBankId(bank.id);
            setBankName(bank.name);
          }}
          onAccountNumberChange={setAccountNumber}
          onVerified={setAccountName}
        />
      )}

      {method === 'mobile_money' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {['mtn', 'airtel', 'glo', '9mobile'].map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`p-3 border rounded-lg capitalize text-sm font-medium transition-all ${
                    provider === p
                      ? 'border-[#8A2BE2] bg-[#8A2BE2]/10 text-[#8A2BE2]'
                      : 'hover:border-gray-400'
                  }`}
                >
                  {p === '9mobile' ? '9mobile' : p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              placeholder="08012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              maxLength={11}
            />
          </div>
        </div>
      )}

      {method === 'crypto' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Note:</span> Only Solana (SOL) addresses are supported.
              Double-check your address before proceeding.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Solana Wallet Address</Label>
            <Input
              placeholder="Enter Solana wallet address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleDetailsNext}
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderAmountForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('details')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <span className="font-medium">Enter Amount</span>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Available Balance</p>
        <p className="text-2xl font-bold text-gray-900">
          {availableBalance.toLocaleString()} {currency}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Amount to Withdraw</Label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {currency}
          </span>
        </div>
        {methodConfig && (
          <p className="text-xs text-gray-500">
            Min: {methodConfig.minAmount} {currency} • Max: {methodConfig.maxAmount.toLocaleString()} {currency}
          </p>
        )}
      </div>

      {amount && (
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span>{parseFloat(amount || '0').toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Fee ({(methodConfig?.fee || 0) * 100}%)</span>
            <span>{calculateFee().toLocaleString()} {currency}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>Total to Receive</span>
            <span className="text-[#8A2BE2]">{calculateTotal().toLocaleString()} {currency}</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleAmountNext}
        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderConfirmation = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('amount')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <span className="font-medium">Confirm Withdrawal</span>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Method</span>
          <span className="font-medium capitalize">{method?.replace('_', ' ')}</span>
        </div>

        {method === 'bank' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bank</span>
              <span className="font-medium">{bankName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Account</span>
              <span className="font-medium">{accountName}</span>
            </div>
          </>
        )}

        {method === 'mobile_money' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Provider</span>
              <span className="font-medium capitalize">{provider}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{phoneNumber}</span>
            </div>
          </>
        )}

        {method === 'crypto' && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Address</span>
            <span className="font-medium font-mono">
              {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
            </span>
          </div>
        )}

        <div className="border-t pt-2 flex justify-between text-sm">
          <span className="text-gray-500">Amount</span>
          <span className="font-medium">{parseFloat(amount).toLocaleString()} {currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Fee</span>
          <span className="font-medium">{calculateFee().toLocaleString()} {currency}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-[#8A2BE2]">{calculateTotal().toLocaleString()} {currency}</span>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Please verify all details before confirming. Withdrawals cannot be reversed.
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Confirm Withdrawal
          </>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
          </DialogHeader>

          {step === 'method' && renderMethodSelection()}
          {step === 'details' && renderDetailsForm()}
          {step === 'amount' && renderAmountForm()}
          {step === 'confirm' && renderConfirmation()}
        </DialogContent>
      </Dialog>

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleClose}
        title="Withdrawal Submitted!"
        message={`Your withdrawal of ${calculateTotal().toLocaleString()} ${currency} has been submitted. Reference: ${transactionReference}`}
        actionLabel="Done"
        onAction={handleClose}
      />

      <TransactionStatusModal
        isOpen={!!transactionStatus && transactionStatus !== 'completed'}
        onClose={() => setTransactionStatus(null)}
        status={transactionStatus || 'pending'}
      />
    </>
  );
}
