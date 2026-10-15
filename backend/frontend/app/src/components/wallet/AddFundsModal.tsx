import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { walletService } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  X,
  Landmark,
  Wallet,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface FundingCorridor {
  country: string;
  currencies: string[];
  continent?: string | null;
  channels: string[];
  defaultChannel: string;
  settlementTime?: Record<string, string>;
  payoutLimit?: Record<string, any>;
}

interface QuoteDetails {
  rate: number;
  expiry: string;
  settlement: string;
  channel: string;
  source: {
    amount: number;
    amountUsd?: number;
    currency: string;
    network: string;
  };
  destination: {
    amount: number;
    amountUsd?: number;
    currency: string;
    network: string;
    asset: string;
  };
}

interface DepositInstructions {
  accountNumber?: string | null;
  accountName?: string | null;
  bankName?: string | null;
  bankCode?: string | null;
  amount: number;
  currency: string;
  expiresAt?: string | null;
  instructions: string[];
}

interface ActiveFunding {
  reference: string;
  status: string;
  fiatAmount: number;
  fiatCurrency: string;
  quotedUsdcAmount: number;
  rate: number;
  channel: string;
  deposit: DepositInstructions;
}

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solanaAddress?: string | null;
  userCountry?: {
    countryCode: string;
    countryName: string;
    defaultCurrency: string;
  } | null;
  paymentCapabilities?: any | null;
  onSuccess?: () => void;
}

const getCurrencySymbol = (code: string): string => {
  switch ((code || '').toUpperCase()) {
    case 'NGN':
      return '₦';
    case 'GHS':
      return 'GH₵';
    case 'KES':
      return 'KSh';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'ZAR':
      return 'R';
    default:
      return code || '$';
  }
};

type FundingStep =
  | 'select-method'
  | 'bank-amount'
  | 'bank-quote'
  | 'bank-instructions'
  | 'crypto-transfer';

export function AddFundsModal({
  isOpen,
  onClose,
  solanaAddress,
  userCountry,
  paymentCapabilities,
  onSuccess,
}: AddFundsModalProps) {
  const isMobile = useIsMobile();

  // Navigation state machine
  const [step, setStep] = useState<FundingStep>('select-method');
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'crypto'>('bank');

  // Corridors & Bank funding state
  const [corridors, setCorridors] = useState<FundingCorridor[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(
    userCountry?.countryCode || 'NG'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    userCountry?.defaultCurrency || 'NGN'
  );
  const [amount, setAmount] = useState<string>('10000');
  const [isLoadingCorridors, setIsLoadingCorridors] = useState<boolean>(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [activeFunding, setActiveFunding] = useState<ActiveFunding | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Crypto / Solana state
  const [solanaInstructions, setSolanaInstructions] = useState<{
    network: string;
    token: string;
    mint: string;
    decimals: number;
    recipientAddress: string;
    instructions: string[];
  } | null>(null);
  const [isLoadingSolana, setIsLoadingSolana] = useState<boolean>(false);
  const [solanaSignature, setSolanaSignature] = useState<string>('');
  const [isVerifyingSolana, setIsVerifyingSolana] = useState<boolean>(false);
  const [solanaVerifyResult, setSolanaVerifyResult] = useState<{
    success: boolean;
    amountUsdc?: number;
    balance?: number;
    signature?: string;
    message?: string;
  } | null>(null);
  const [solanaError, setSolanaError] = useState<string | null>(null);

  // Initialize and load Solana instructions
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSolanaInstructions = async () => {
      setIsLoadingSolana(true);
      try {
        const res = await walletService.getSolanaDepositInstructions();
        if (isMounted && res.data?.data) {
          setSolanaInstructions(res.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[AddFundsModal] Could not fetch Solana instructions:', err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSolana(false);
        }
      }
    };

    fetchSolanaInstructions();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Load supported funding corridors
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCorridors = async () => {
      setIsLoadingCorridors(true);
      try {
        const res = await walletService.getFundingOptions();
        const corridorsList = res.data?.data?.corridors || [];
        if (isMounted) {
          setCorridors(corridorsList);
          const targetCountry = userCountry?.countryCode || selectedCountry || 'NG';
          const match = corridorsList.find((c: FundingCorridor) => c.country === targetCountry);
          if (match && match.currencies?.length > 0) {
            setSelectedCountry(match.country);
            setSelectedCurrency(match.currencies[0]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[AddFundsModal] Could not fetch corridors:', err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCorridors(false);
        }
      }
    };

    fetchCorridors();
    return () => {
      isMounted = false;
    };
  }, [isOpen, userCountry]);

  // Reset or initialize view when opening modal
  useEffect(() => {
    if (isOpen) {
      if (!activeFunding) {
        setStep('select-method');
        setQuote(null);
        setErrorMessage(null);
        setSolanaError(null);
        setSolanaVerifyResult(null);

        // Pre-select crypto if onramp is unsupported for this country
        if (paymentCapabilities?.onramp?.supported === false) {
          setSelectedMethod('crypto');
        } else {
          setSelectedMethod('bank');
        }
      }
    }
  }, [isOpen, paymentCapabilities]);

  // Check if bank transfer is supported for the user's country
  const currentCorridor = corridors.find((c) => c.country === selectedCountry);
  const isBankSupported =
    paymentCapabilities?.onramp?.supported !== false &&
    (!corridors.length || !!currentCorridor);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Step 1 -> Step 2: Get quote on Continue
  const handleFetchQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount greater than 0');
      return;
    }

    setIsLoadingQuote(true);
    setErrorMessage(null);

    try {
      const res = await walletService.getQuote({
        amount: parsedAmount,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: 'BANK',
      });

      const quoteData = res.data?.data;
      if (quoteData) {
        setQuote(quoteData);
        setStep('bank-quote');
      } else {
        setErrorMessage('Unable to retrieve guaranteed quote. Please try again.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Failed to fetch quote from payment provider';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Step 2 -> Step 3: Initiate funding on Continue
  const handleInitiateFunding = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount');
      return;
    }

    setIsInitiating(true);
    setErrorMessage(null);

    try {
      const res = await walletService.initiateFunding({
        amount: parsedAmount,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: quote?.channel || 'BANK',
      });

      const fundingData = res.data?.data;
      if (fundingData) {
        setActiveFunding(fundingData);
        setStep('bank-instructions');
        toast.success('Payment instructions generated');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || 'Failed to generate payment instructions';
      setErrorMessage(errorMsg);
    } finally {
      setIsInitiating(false);
    }
  };

  // Check live payment status
  const handleCheckStatus = async () => {
    if (!activeFunding?.reference) return;

    setIsCheckingStatus(true);
    try {
      const res = await walletService.getFundingStatus(activeFunding.reference);
      const updated = res.data?.data;
      if (updated) {
        setActiveFunding((prev) =>
          prev ? { ...prev, status: updated.status, switchStatus: updated.switchStatus } : null
        );
        if (updated.status === 'completed') {
          toast.success('Deposit confirmed and credited to your wallet balance!');
          if (onSuccess) onSuccess();
        } else if (updated.status === 'processing') {
          toast.info('Payment received and is currently being settled to USDC.');
        } else {
          toast.info(`Current status: ${updated.status || 'Awaiting payment'}`);
        }
      }
    } catch {
      toast.error('Could not refresh status at this time.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Verify on-chain Solana USDC transfer
  const handleVerifySolanaDeposit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSig = solanaSignature.trim();
    if (!cleanSig || cleanSig.length < 32) {
      setSolanaError('Please enter a valid Solana transaction signature (64-88 characters)');
      return;
    }

    setIsVerifyingSolana(true);
    setSolanaError(null);
    setSolanaVerifyResult(null);

    try {
      const res = await walletService.verifySolanaDeposit(cleanSig);
      if (res.data?.success) {
        setSolanaVerifyResult({
          success: true,
          amountUsdc: res.data.data?.amountUsdc,
          balance: res.data.data?.balance,
          signature: res.data.data?.signature,
          message: res.data.message || 'Deposit successfully verified and credited!',
        });
        toast.success(res.data.message || `Successfully credited ${res.data.data?.amountUsdc} USDC!`);
        setSolanaSignature('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setSolanaError(res.data?.error || 'Verification failed');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Failed to verify transaction signature on Solana';
      setSolanaError(msg);
    } finally {
      setIsVerifyingSolana(false);
    }
  };

  // Back action navigation
  const handleBack = () => {
    setErrorMessage(null);
    if (step === 'bank-amount' || step === 'crypto-transfer') {
      setStep('select-method');
    } else if (step === 'bank-quote') {
      setStep('bank-amount');
    } else if (step === 'bank-instructions') {
      setStep('bank-amount');
    }
  };

  const getHeaderTitle = () => {
    switch (step) {
      case 'select-method':
        return 'Add Funds';
      case 'bank-amount':
        return 'Bank Transfer';
      case 'bank-quote':
        return 'Confirm Deposit';
      case 'bank-instructions':
        return 'Payment Details';
      case 'crypto-transfer':
        return 'Transfer from Another Wallet';
      default:
        return 'Add Funds';
    }
  };

  const depositAddress = solanaInstructions?.recipientAddress || solanaAddress || '';

  // Render the persistent action footer for each step
  const renderFooterActions = () => {
    switch (step) {
      case 'select-method':
        return (
          <button
            type="button"
            onClick={() => {
              if (selectedMethod === 'bank') setStep('bank-amount');
              else if (selectedMethod === 'crypto') setStep('crypto-transfer');
            }}
            disabled={!selectedMethod || (selectedMethod === 'bank' && !isBankSupported)}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <span>Continue</span>
          </button>
        );

      case 'bank-amount':
        return (
          <button
            type="button"
            onClick={handleFetchQuote}
            disabled={isLoadingQuote || !amount || parseFloat(amount) <= 0}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {isLoadingQuote ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Getting Quote...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        );

      case 'bank-quote':
        return (
          <button
            type="button"
            onClick={handleInitiateFunding}
            disabled={isInitiating}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {isInitiating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Payment Instructions...</span>
              </>
            ) : (
              <span>Proceed to Payment</span>
            )}
          </button>
        );

      case 'bank-instructions':
        return (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isCheckingStatus}
              className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {isCheckingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Check Deposit Status</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-medium rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer"
            >
              Done
            </button>
          </div>
        );

      case 'crypto-transfer':
        return (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleVerifySolanaDeposit}
              disabled={isVerifyingSolana || !solanaSignature.trim()}
              className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              {isVerifyingSolana ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying On-Chain...</span>
                </>
              ) : (
                <span>Verify & Credit Deposit</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-medium rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer"
            >
              Done
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Structured content with separated Header, Scrollable Body, and Fixed Footer
  const content = (
    <div className="flex flex-col h-full max-h-[90dvh] sm:max-h-[85vh] overflow-hidden">
      {/* 1. Header Bar: Understated Back button, Title, Close button */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 pt-1 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          {step !== 'select-method' && (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-base font-semibold text-gray-900">{getHeaderTitle()}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Body: Content scrolls freely while Header & Footer stay fixed */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-4 px-0.5">
        {/* Step 1: Choose Funding Method */}
        {step === 'select-method' && (
          <div className="space-y-3">
            {/* Option 1: Bank Transfer */}
            <button
              type="button"
              disabled={!isBankSupported}
              onClick={() => {
                if (isBankSupported) {
                  setSelectedMethod('bank');
                }
              }}
              className={cn(
                'w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer',
                selectedMethod === 'bank'
                  ? 'border-[#9747FF] bg-purple-50/25 ring-1 ring-[#9747FF]'
                  : 'border-gray-200/80 bg-white hover:border-gray-300 hover:bg-gray-50/50',
                !isBankSupported && 'opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200'
              )}
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Bank Transfer</span>
                  {!isBankSupported && (
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {isLoadingCorridors ? 'Loading...' : 'Unavailable'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Fund your wallet using a supported local payment method.
                </p>
              </div>
              <div className="shrink-0 pl-1">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                    selectedMethod === 'bank'
                      ? 'border-[#9747FF] bg-[#9747FF]'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {selectedMethod === 'bank' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>

            {/* Option 2: Transfer from Another Wallet */}
            <button
              type="button"
              onClick={() => setSelectedMethod('crypto')}
              className={cn(
                'w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer',
                selectedMethod === 'crypto'
                  ? 'border-[#9747FF] bg-purple-50/25 ring-1 ring-[#9747FF]'
                  : 'border-gray-200/80 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              )}
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    Transfer from Another Wallet
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Send supported crypto to your MyArteLab wallet.
                </p>
              </div>
              <div className="shrink-0 pl-1">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                    selectedMethod === 'crypto'
                      ? 'border-[#9747FF] bg-[#9747FF]'
                      : 'border-gray-300 bg-white'
                  )}
                >
                  {selectedMethod === 'crypto' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Bank Transfer Amount Input */}
        {step === 'bank-amount' && (
          <form onSubmit={handleFetchQuote} className="space-y-6">
            <div className="py-6 text-center bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Deposit Amount
              </p>
              <div className="inline-flex items-baseline justify-center">
                <span className="text-3xl font-light text-gray-400 mr-1.5">
                  {getCurrencySymbol(selectedCurrency)}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setAmount(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0.00"
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 bg-transparent text-center focus:outline-none w-auto max-w-[280px]"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Currency: <span className="font-semibold text-gray-700">{selectedCurrency}</span>
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        )}

        {/* Step 3: Review Quote */}
        {step === 'bank-quote' && quote && (
          <div className="space-y-5">
            <div className="text-center py-4 bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Estimated Credit
              </p>
              <div className="flex items-baseline justify-center mt-1">
                <span className="text-3xl font-light text-gray-400 mr-1">$</span>
                <span className="text-4xl font-bold text-gray-900 tracking-tight">
                  {quote.destination.amount.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md ml-2">
                  USDC
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Settles on Solana Mainnet</p>
            </div>

            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500">You Pay</span>
                <span className="font-semibold text-gray-900">
                  {quote.source.amount.toLocaleString()} {quote.source.currency}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500">Exchange Rate</span>
                <span className="font-semibold text-gray-900">
                  1 USDC ≈{' '}
                  {quote.rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                  {quote.source.currency}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500">Settlement Speed</span>
                <span className="font-semibold text-gray-900">{quote.settlement || 'Instant'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-semibold text-gray-900">
                  {quote.channel === 'MOBILEMONEY' ? 'Mobile Money' : 'Bank Transfer'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Payment Instructions */}
        {step === 'bank-instructions' && activeFunding && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                Exact Amount to Pay
              </p>
              <p className="text-3xl font-extrabold text-gray-900 font-mono tracking-tight mt-1">
                {activeFunding.deposit.amount.toLocaleString()} {activeFunding.fiatCurrency}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Credits{' '}
                <span className="font-semibold text-[#9747FF]">
                  {activeFunding.quotedUsdcAmount.toFixed(4)} USDC
                </span>{' '}
                upon settlement
              </p>
            </div>

            {activeFunding.deposit.accountNumber && (
              <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-3 shadow-2xs text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Bank Name</span>
                  <span className="font-semibold text-gray-900">
                    {activeFunding.deposit.bankName || 'Partner Bank'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-gray-50 px-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Account Number</p>
                    <p className="font-mono text-base font-bold text-gray-900 tracking-wider">
                      {activeFunding.deposit.accountNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(activeFunding.deposit.accountNumber!, 'Account Number')
                    }
                    className="h-8 px-2.5 text-xs text-[#9747FF] hover:bg-purple-50 rounded-lg flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    {copiedField === 'Account Number' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'Account Number' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-semibold text-gray-900">
                    {activeFunding.deposit.accountName || 'Switch Checkout'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-gray-50 px-3 rounded-xl border border-gray-100">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">
                      Reference / Memo
                    </p>
                    <p className="font-mono text-xs font-semibold text-gray-800 truncate max-w-[200px]">
                      {activeFunding.reference}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeFunding.reference, 'Reference')}
                    className="h-8 px-2.5 text-xs text-[#9747FF] hover:bg-purple-50 rounded-lg flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'Reference' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedField === 'Reference' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Direct Solana Crypto Deposit */}
        {step === 'crypto-transfer' && (
          <div className="space-y-4">
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700">
                  Your Solana Deposit Address
                </span>
                <span className="text-[11px] font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md">
                  USDC (Solana)
                </span>
              </div>

              {isLoadingSolana ? (
                <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#9747FF]" />
                  <span>Loading deposit address...</span>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-2">
                  <p className="font-mono text-xs font-semibold text-gray-900 break-all select-all leading-relaxed">
                    {depositAddress || 'Address unavailable'}
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(depositAddress, 'Deposit Address')}
                      disabled={!depositAddress}
                      className="h-8 px-3 text-xs bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                    >
                      {copiedField === 'Deposit Address' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'Deposit Address' ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                    Accepted Asset
                  </span>
                  <span className="font-semibold text-gray-900">USDC (USD Coin)</span>
                </div>
                <div className="p-2.5 bg-gray-50/80 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                    Network
                  </span>
                  <span className="font-semibold text-gray-900">Solana Mainnet</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs">
                <div className="truncate pr-2">
                  <span className="text-gray-400 text-[10px] uppercase font-semibold block">
                    Official USDC Mint
                  </span>
                  <span className="font-mono text-[11px] text-gray-700 truncate">
                    {solanaInstructions?.mint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      solanaInstructions?.mint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                      'Token Mint'
                    )
                  }
                  className="h-7 px-2 text-xs text-gray-600 hover:text-gray-900 rounded flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'Token Mint' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
                Send only SPL USDC on Solana mainnet. Transfers from other networks (Ethereum, BSC,
                Polygon) or other tokens (SOL, USDT) are not supported.
              </p>
            </div>

            {/* Signature Verification Form */}
            <form onSubmit={handleVerifySolanaDeposit} className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Already sent? Enter transaction signature
                </label>
                <input
                  type="text"
                  placeholder="Paste 64-88 character Solana signature (e.g. 5xY8...)"
                  value={solanaSignature}
                  onChange={(e) => setSolanaSignature(e.target.value)}
                  className="w-full h-11 px-3 text-xs font-mono bg-white border border-gray-200/80 rounded-xl focus:border-[#9747FF] focus:outline-none"
                  disabled={isVerifyingSolana}
                />
              </div>

              {solanaError && (
                <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{solanaError}</span>
                </div>
              )}

              {solanaVerifyResult && (
                <div className="p-3.5 bg-green-50 border border-green-200/80 rounded-xl text-xs text-green-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-green-900">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Deposit Confirmed & Credited</span>
                  </div>
                  <p>
                    Credited{' '}
                    <strong className="font-semibold">{solanaVerifyResult.amountUsdc} USDC</strong>{' '}
                    to your wallet.
                    {solanaVerifyResult.balance !== undefined && (
                      <span>
                        {' '}
                        New balance:{' '}
                        <strong className="font-semibold">
                          ${solanaVerifyResult.balance.toFixed(2)} USDC
                        </strong>
                      </span>
                    )}
                  </p>
                  {solanaVerifyResult.signature && (
                    <a
                      href={`https://explorer.solana.com/tx/${solanaVerifyResult.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-green-700 hover:text-green-900 underline flex items-center gap-1 pt-0.5"
                    >
                      <span>View on Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* 3. Fixed Opaque Action Footer: Always visible above bottom navigation and safe areas */}
      <div className="shrink-0 bg-white border-t border-gray-100 pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
        {renderFooterActions()}
      </div>
    </div>
  );

  // Responsive presentation: Mobile Bottom Sheet (Drawer) vs Desktop Modal (Dialog)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="bg-white rounded-t-3xl max-h-[90dvh] flex flex-col p-5 pb-0 border-none shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Add Funds</DrawerTitle>
          <DrawerDescription className="sr-only">
            Fund your MyArteLab wallet balance
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white rounded-2xl max-h-[85vh] sm:max-w-[460px] flex flex-col p-6 pb-0 border border-gray-100 shadow-xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Add Funds</DialogTitle>
        <DialogDescription className="sr-only">
          Fund your MyArteLab wallet balance
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
