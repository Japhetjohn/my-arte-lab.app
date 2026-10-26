import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
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
  AlertCircle,
  Copy,
  CheckCircle2,
  ChevronLeft,
  X,
  Landmark,
  Wallet,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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
  const [isSubmittingPaid, setIsSubmittingPaid] = useState<boolean>(false);
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [activeFunding, setActiveFunding] = useState<ActiveFunding | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Mobile virtual keyboard & viewport recovery effect
  useEffect(() => {
    if (!isOpen) return;

    const resetViewport = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        // Clear any stale inline styles that might have been applied to drawer DOM elements
        const drawerElements = document.querySelectorAll<HTMLElement>(
          '[data-vaul-drawer], [data-slot="drawer-content"]'
        );
        drawerElements.forEach((el) => {
          el.style.removeProperty('bottom');
          el.style.removeProperty('height');
          el.style.removeProperty('transform');
        });
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(resetViewport, 120);
      }
    };

    const handleVisualViewportResize = () => {
      if (window.visualViewport && window.visualViewport.height >= window.innerHeight - 60) {
        resetViewport();
      }
    };

    document.addEventListener('focusout', handleFocusOut);
    window.visualViewport?.addEventListener('resize', handleVisualViewportResize);

    return () => {
      document.removeEventListener('focusout', handleFocusOut);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportResize);
      resetViewport();
    };
  }, [isOpen, step]);

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const depositAddress = solanaInstructions?.recipientAddress || solanaAddress || '';

  // Generate high-contrast, clean QR code for deposit address
  useEffect(() => {
    if (depositAddress) {
      QRCode.toDataURL(depositAddress, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => {
          console.error('[AddFundsModal] QR generation failed:', err);
        });
    } else {
      setQrCodeUrl('');
    }
  }, [depositAddress]);

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

  // Clean reset function for transient funding session state
  const resetFundingSession = () => {
    setStep('select-method');
    setActiveFunding(null);
    setQuote(null);
    setErrorMessage(null);
    setIsLoadingQuote(false);
    setIsInitiating(false);
    setIsSubmittingPaid(false);
    if (paymentCapabilities?.onramp?.supported === false) {
      setSelectedMethod('crypto');
    } else {
      setSelectedMethod('bank');
    }
  };

  // Reset or initialize view whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetFundingSession();
    }
  }, [isOpen, paymentCapabilities]);

  // Check if bank transfer is supported for the user's country
  const currentCorridor = corridors.find((c) => c.country === selectedCountry);
  const isBankSupported =
    paymentCapabilities?.onramp?.supported !== false &&
    (!corridors.length || !!currentCorridor);

  const handleModalClose = () => {
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    resetFundingSession();
    onClose();
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      toast.error(`Could not copy ${fieldName}. Please copy manually.`);
    }
  };

  // Step 1 -> Step 2: Get quote on Continue
  const handleFetchQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a deposit amount greater than 0.');
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
        setErrorMessage("We couldn't get a quote right now. Please try again.");
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "We couldn't get a quote right now. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Step 2 -> Step 3: Initiate funding on Continue
  const handleInitiateFunding = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount.');
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
        toast.success('Payment instructions generated.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || err.message || "We couldn't generate payment instructions. Please try again.";
      setErrorMessage(errorMsg);
    } finally {
      setIsInitiating(false);
    }
  };

  // Primary action for bank instructions: I Have Paid
  const handleIHavePaid = () => {
    if (isSubmittingPaid) return;
    setIsSubmittingPaid(true);

    toast.info(
      'Payment confirmation pending. Your wallet will be credited once your deposit is confirmed.'
    );

    if (onSuccess) {
      onSuccess();
    }

    handleModalClose();

    setTimeout(() => {
      setIsSubmittingPaid(false);
    }, 600);
  };

  // Back action navigation
  const handleBack = () => {
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
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
        return 'Add funds';
      case 'bank-amount':
        return 'Bank transfer';
      case 'bank-quote':
        return 'Confirm deposit';
      case 'bank-instructions':
        return 'Payment instructions';
      case 'crypto-transfer':
        return 'Deposit USDC';
      default:
        return 'Add funds';
    }
  };

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
                <Spinner size="sm" variant="white" />
                <span>Getting quote...</span>
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
                <Spinner size="sm" variant="white" />
                <span>Generating payment instructions...</span>
              </>
            ) : (
              <span>Proceed to payment</span>
            )}
          </button>
        );

      case 'bank-instructions':
        return (
          <button
            type="button"
            onClick={handleIHavePaid}
            disabled={isSubmittingPaid}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {isSubmittingPaid ? (
              <>
                <Spinner size="sm" variant="white" />
                <span>Processing...</span>
              </>
            ) : (
              <span>I have sent the payment</span>
            )}
          </button>
        );

      case 'crypto-transfer':
        return (
          <button
            type="button"
            onClick={handleModalClose}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Close
          </button>
        );

      default:
        return null;
    }
  };

  // Structured content with separated Header, Scrollable Body, and Fixed Footer
  const content = (
    <div className="flex flex-col h-full max-h-[90dvh] sm:max-h-[85vh] overflow-hidden text-gray-900 dark:text-gray-100">
      {/* 1. Header Bar: Understated Back button, Title, Close button */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 pt-1 border-b border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#1a1b1c]">
        <div className="flex items-center gap-2">
          {step !== 'select-method' && (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{getHeaderTitle()}</h2>
        </div>
        <button
          type="button"
          onClick={handleModalClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
                  <span className="text-base font-semibold text-gray-900">Bank transfer</span>
                  {!isBankSupported && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {isLoadingCorridors ? 'Loading...' : 'Unavailable'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Deposit funds using local bank transfer or mobile money.
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
                  <span className="text-base font-semibold text-gray-900">
                    Deposit crypto (USDC)
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Send USDC on Solana directly to your wallet address.
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
                Deposit amount
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
                  onBlur={() => {
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }
                  }}
                  placeholder="0.00"
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 bg-transparent text-center focus:outline-none w-auto max-w-[280px]"
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
                Estimated credit
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
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5">Settles on Solana</p>
            </div>

            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">You pay</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {quote.source.amount.toLocaleString()} {quote.source.currency}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Exchange rate</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  1 USDC ≈{' '}
                  {quote.rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                  {quote.source.currency}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Settlement time</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">{quote.settlement || 'Instant'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Payment method</span>
                <span className="text-sm sm:text-base font-semibold text-gray-900">
                  {quote.channel === 'MOBILEMONEY' ? 'Mobile money' : 'Bank transfer'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs sm:text-sm text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Payment Instructions */}
        {step === 'bank-instructions' && activeFunding && (
          <div className="space-y-4">
            {/* Top Caution/Payment Instructions Icon */}
            <div className="flex justify-center pt-1 pb-0.5">
              <div className="w-12 h-12 rounded-full bg-purple-50/80 border border-purple-100 flex items-center justify-center text-[#9747FF]">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Prominent Exact Amount & Instructions */}
            <div className="text-center space-y-1 mb-4">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                {getCurrencySymbol(activeFunding.fiatCurrency)}
                {activeFunding.deposit.amount.toLocaleString()}{' '}
                <span className="text-lg sm:text-xl font-bold text-gray-500">
                  {activeFunding.fiatCurrency}
                </span>
              </h3>
              <p className="text-sm text-gray-600 font-medium">
                Send the exact amount to the account below.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Settles ≈ <span className="font-semibold text-gray-700">{activeFunding.quotedUsdcAmount.toFixed(4)} USDC</span>
              </p>
            </div>

            {/* Recipient Details Card */}
            {activeFunding.deposit.accountNumber && (
              <div className="bg-white border border-gray-150 rounded-2xl shadow-2xs divide-y divide-gray-100 overflow-hidden text-sm">
                {/* Bank Name */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-gray-500 font-medium">Bank name</span>
                  <span className="text-gray-900 font-semibold text-right">
                    {activeFunding.deposit.bankName || 'Partner Bank'}
                  </span>
                </div>

                {/* Account Number */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-gray-500 font-medium">Account number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-gray-900 tracking-wider">
                      {activeFunding.deposit.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(activeFunding.deposit.accountNumber!, 'Account Number')
                      }
                      className="h-7 px-2.5 text-xs text-[#9747FF] hover:bg-purple-50 rounded-md flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                      aria-label="Copy account number"
                    >
                      {copiedField === 'Account Number' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'Account Number' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div className="flex items-center justify-between px-4 py-3.5">
                  <span className="text-gray-500 font-medium">Account name</span>
                  <span className="text-gray-900 font-semibold text-right truncate max-w-[180px] sm:max-w-[240px]">
                    {activeFunding.deposit.accountName || 'Switch Checkout'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Direct Solana Crypto Deposit (Clean, Minimalist Fintech UI) */}
        {step === 'crypto-transfer' && (
          <div className="flex flex-col items-center text-center space-y-4 py-1">
            {/* 3. Short network warning or deposit instruction */}
            <div className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs sm:text-sm text-gray-600 leading-relaxed text-center">
              Send USDC using the <strong className="font-semibold text-gray-900">Solana</strong> network. Deposits sent through other networks cannot be recovered.
            </div>

            {/* 4. Large, centered QR code */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-center">
              {isLoadingSolana || (!depositAddress && !qrCodeUrl) ? (
                <div className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex flex-col items-center justify-center gap-2 text-xs text-gray-400">
                  <Spinner size="md" variant="primary" />
                  <span>Loading deposit address...</span>
                </div>
              ) : qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="USDC Solana Deposit QR Code"
                  className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] object-contain rounded-lg"
                />
              ) : (
                <div className="w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] flex items-center justify-center text-xs text-gray-400">
                  Address unavailable
                </div>
              )}
            </div>

            {/* 5. Actual deposit wallet address in a readable, copyable format */}
            <div className="w-full">
              <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between gap-2">
                <span className="font-mono text-xs sm:text-sm font-semibold text-gray-900 truncate select-all text-left">
                  {depositAddress || 'Generating wallet address...'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(depositAddress, 'Deposit Address')}
                  disabled={!depositAddress}
                  className="h-8 px-3 shrink-0 text-xs bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  aria-label="Copy deposit address"
                >
                  {copiedField === 'Deposit Address' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span>{copiedField === 'Deposit Address' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 6. Concise supporting description */}
            <p className="text-xs text-gray-400 max-w-xs leading-normal">
              Only send SPL USDC on Solana to this address. Minimum deposit is 1 USDC.
            </p>
          </div>
        )}
      </div>

      {/* 3. Fixed Opaque Action Footer: Always visible above bottom navigation and safe areas */}
      <div className="shrink-0 bg-white dark:bg-[#1a1b1c] border-t border-[#DADDE1] dark:border-[#2f3032] pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
        {renderFooterActions()}
      </div>
    </div>
  );

  // Responsive presentation: Mobile Bottom Sheet (Drawer) vs Desktop Modal (Dialog)
  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && handleModalClose()}
        repositionInputs={false}
      >
        <DrawerContent className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-t-2xl max-h-[90dvh] flex flex-col p-5 pb-0 border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Add funds</DrawerTitle>
          <DrawerDescription className="sr-only">
            Fund your MyArteLab wallet balance
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-2xl max-h-[85vh] sm:max-w-[460px] flex flex-col p-6 pb-0 border border-[#DADDE1] dark:border-[#2f3032] shadow-xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Add funds</DialogTitle>
        <DialogDescription className="sr-only">
          Fund your MyArteLab wallet balance
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
