import { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
  ChevronDown,
  Building2,
  X,
  Landmark,
  Wallet,
  Search,
  Check,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface WithdrawCorridor {
  country: string;
  currencies: string[];
  continent?: string | null;
  channels: string[];
  defaultChannel: string;
  settlementTime?: Record<string, string>;
  payoutLimit?: Record<string, any>;
}

interface WithdrawQuote {
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

interface Institution {
  id?: string;
  name: string;
  code: string;
  logo?: string;
}

interface TopBankDefinition {
  name: string;
  code: string;
  aliases: string[];
}

// Top 10 priority commercial & neo-banks for Nigeria
const NIGERIA_TOP_BANKS: TopBankDefinition[] = [
  { name: 'Access Bank', code: '000014', aliases: ['access'] },
  { name: 'GTBank (Guaranty Trust Bank)', code: '000013', aliases: ['guaranty trust', 'gtbank', 'gtb'] },
  { name: 'Zenith Bank', code: '000015', aliases: ['zenith'] },
  { name: 'United Bank for Africa (UBA)', code: '000004', aliases: ['united bank for africa', 'uba'] },
  { name: 'First Bank of Nigeria', code: '000016', aliases: ['first bank'] },
  { name: 'Kuda Bank', code: '090267', aliases: ['kuda'] },
  { name: 'OPay', code: '100004', aliases: ['opay', 'paycom'] },
  { name: 'PalmPay', code: '100033', aliases: ['palmpay'] },
  { name: 'Moniepoint', code: '090405', aliases: ['moniepoint'] },
  { name: 'Fidelity Bank', code: '000007', aliases: ['fidelity'] },
];

interface ActiveWithdrawal {
  reference: string;
  status: string;
  switchStatus?: string;
  amount: number;
  usdcAmount: number;
  fiatAmount: number;
  currency: string;
  fiatCurrency: string;
  channel: string;
  beneficiary: {
    account_number?: string;
    account_name?: string;
    bank_name?: string;
    bank_code?: string;
    mobile_number?: string;
    mobile_network?: string;
  };
  failureReason?: string;
  createdAt?: string;
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance?: number;
  solanaAddress?: string | null;
  userCountry?: {
    countryCode: string | null;
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

type WithdrawStep =
  | 'select-method'
  | 'bank-amount'
  | 'bank-details'
  | 'bank-review'
  | 'bank-status'
  | 'wallet-amount'
  | 'wallet-review';

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalance = 0,
  solanaAddress,
  userCountry,
  paymentCapabilities,
  onSuccess,
}: WithdrawModalProps) {
  const isMobile = useIsMobile();

  // Navigation state machine matching AddFundsModal
  const [step, setStep] = useState<WithdrawStep>('select-method');
  const [selectedMethod, setSelectedMethod] = useState<'bank' | 'crypto'>('bank');

  // Corridors & Bank funding state
  const [corridors, setCorridors] = useState<WithdrawCorridor[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>(
    userCountry?.countryCode || 'NG'
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    userCountry?.defaultCurrency || 'NGN'
  );
  const [selectedChannel, setSelectedChannel] = useState<string>('BANK');
  const [amountUsdc, setAmountUsdc] = useState<string>('');

  // Institutions & Beneficiary state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [bankSearch, setBankSearch] = useState<string>('');
  const [isBankPickerOpen, setIsBankPickerOpen] = useState<boolean>(false);
  const bankDropdownRef = useRef<HTMLDivElement | null>(null);

  // Verification & Quote state
  const [isVerifyingAccount, setIsVerifyingAccount] = useState<boolean>(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationReqIdRef = useRef<number>(0);
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number | null>(null);

  // External Wallet state
  const [walletAmount, setWalletAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [isSubmittingSolana, setIsSubmittingSolana] = useState<boolean>(false);

  // Status & Transaction Tracking
  const [isLoadingCorridors, setIsLoadingCorridors] = useState<boolean>(false);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState<boolean>(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeWithdrawal, setActiveWithdrawal] = useState<ActiveWithdrawal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Mobile virtual keyboard & viewport recovery effect (identical to AddFundsModal)
  useEffect(() => {
    if (!isOpen) return;

    const resetViewport = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
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

  // Click outside listener to automatically dismiss bank dropdown
  useEffect(() => {
    if (!isBankPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target as Node)) {
        setIsBankPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBankPickerOpen]);

  // Load supported withdrawal corridors on open
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep('select-method');
      setSelectedMethod('bank');
      setAmountUsdc('');
      setWalletAmount('');
      setDestinationAddress('');
      setSelectedBankCode('');
      setAccountNumber('');
      setAccountName('');
      setVerifiedName(null);
      setVerificationError(null);
      setQuote(null);
      setActiveWithdrawal(null);
      setErrorMessage(null);
      setCopiedField(null);
      setIsBankPickerOpen(false);
      setBankSearch('');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    // Pre-populate last used external Solana address if available
    try {
      const saved = localStorage.getItem('myartelab_last_solana_withdraw_addr');
      if (saved && !destinationAddress) {
        setDestinationAddress(saved);
      }
    } catch (_) {}

    let isMounted = true;
    const fetchCorridors = async () => {
      setIsLoadingCorridors(true);
      try {
        const res = await walletService.getWithdrawOptions();
        const corridorsList = res.data?.data?.corridors || [];
        if (isMounted) {
          setCorridors(corridorsList);
          const targetCountry = userCountry?.countryCode || 'NG';
          const match = corridorsList.find((c: WithdrawCorridor) => c.country === targetCountry);
          if (match && match.currencies?.length > 0) {
            setSelectedCountry(match.country);
            setSelectedCurrency(userCountry?.defaultCurrency || match.currencies[0] || 'NGN');
            const defaultChan = match.channels?.includes('BANK') ? 'BANK' : (match.channels?.[0] || 'BANK');
            setSelectedChannel(defaultChan);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[WithdrawModal] Could not fetch corridors:', err.message);
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

  // Determine if bank off-ramp is genuinely supported for the user's country
  const isBankSupported = useMemo(() => {
    const isExplicitlyBlocked =
      paymentCapabilities?.offramp?.supported === false ||
      paymentCapabilities?.offramp?.operationalStatus === 'BLOCKED_PROVIDER';

    if (isExplicitlyBlocked) return false;

    // Check if the corridor is in Switch's supported off-ramp corridors with BANK channel
    return corridors.some(
      (c) => c.country === selectedCountry && c.channels?.includes('BANK')
    );
  }, [paymentCapabilities, corridors, selectedCountry]);

  // Auto-switch method if bank is unsupported
  useEffect(() => {
    if (isOpen && !isLoadingCorridors && !isBankSupported) {
      setSelectedMethod('crypto');
    }
  }, [isOpen, isLoadingCorridors, isBankSupported]);

  // Fetch institutions list when opening bank-details
  useEffect(() => {
    if (!isOpen || (step !== 'bank-details' && step !== 'bank-amount')) return;
    if (institutions.length > 0) return;

    let isMounted = true;
    const fetchInstitutionsList = async () => {
      setIsLoadingInstitutions(true);
      try {
        const res = await walletService.getInstitutions(selectedCountry);
        const list = res.data?.data || [];
        if (isMounted) {
          setInstitutions(list);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('[WithdrawModal] Failed to load institutions:', err.message);
          setInstitutions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingInstitutions(false);
        }
      }
    };

    fetchInstitutionsList();
    return () => {
      isMounted = false;
    };
  }, [isOpen, step, selectedCountry, institutions.length]);

  // Automatic account resolution when account number reaches required digits and bank is chosen
  useEffect(() => {
    if (step !== 'bank-details') return;
    const cleanAcc = accountNumber.trim();
    const isRequiredLength = selectedCountry === 'NG' ? cleanAcc.length === 10 : cleanAcc.length >= 8;

    // Immediately clear previous verification and error when inputs change
    setVerifiedName(null);
    setAccountName('');
    setVerificationError(null);

    if (selectedBankCode && isRequiredLength) {
      const currentReqId = ++verificationReqIdRef.current;
      setIsVerifyingAccount(true);

      walletService
        .resolveAccount({
          country: selectedCountry,
          bankCode: selectedBankCode,
          accountNumber: cleanAcc,
        })
        .then((res) => {
          // Guard against race conditions from out-of-order responses
          if (verificationReqIdRef.current !== currentReqId) return;

          const data = res.data?.data;
          const resolved = data?.account_name || data?.accountName || data?.holder_name;
          if (resolved) {
            setVerifiedName(resolved);
            setAccountName(resolved);
            setVerificationError(null);
          } else {
            setVerifiedName(null);
            setAccountName('');
            setVerificationError("We couldn't verify this account. Please check the bank and account number.");
          }
        })
        .catch((err) => {
          if (verificationReqIdRef.current !== currentReqId) return;
          console.warn('[WithdrawModal] Could not resolve account:', err.message);
          setVerifiedName(null);
          setAccountName('');
          const errorDetail = err.response?.data?.error || err.response?.data?.message;
          setVerificationError(
            errorDetail && typeof errorDetail === 'string' && errorDetail.length < 100
              ? errorDetail
              : "We couldn't verify this account. Please check the bank and account number."
          );
        })
        .finally(() => {
          if (verificationReqIdRef.current === currentReqId) {
            setIsVerifyingAccount(false);
          }
        });
    } else {
      verificationReqIdRef.current++;
      setIsVerifyingAccount(false);
    }
  }, [accountNumber, selectedBankCode, selectedCountry, step]);

  // Quote countdown timer
  useEffect(() => {
    if (!quote?.expiry) {
      setQuoteSecondsLeft(null);
      return;
    }

    const expiryTime = new Date(quote.expiry).getTime();
    const updateCountdown = () => {
      const remainingMs = expiryTime - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setQuoteSecondsLeft(remainingSecs);
      if (remainingSecs <= 0 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };

    updateCountdown();
    timerIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [quote]);

  // Real-time status polling for in-flight bank withdrawal
  useEffect(() => {
    if (step !== 'bank-status' || !activeWithdrawal?.reference) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await walletService.getWithdrawalStatus(activeWithdrawal.reference);
        const data = res.data?.data;
        if (data) {
          setActiveWithdrawal((prev) => (prev ? { ...prev, ...data } : null));

          if (data.status === 'completed') {
            toast.success('Withdrawal completed successfully!');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (onSuccess) onSuccess();
          } else if (data.status === 'failed' || data.status === 'reversed') {
            toast.error(data.failureReason || 'Withdrawal could not be completed. Reserved balance refunded.');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (onSuccess) onSuccess();
          }
        }
      } catch (err: any) {
        console.warn('[WithdrawModal] Polling error:', err.message);
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, activeWithdrawal?.reference, onSuccess]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Close handler with full state reset
  const handleModalClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    onClose();
  };

  // Back button handler preserving form data
  const handleBack = () => {
    setErrorMessage(null);
    switch (step) {
      case 'bank-amount':
        setStep('select-method');
        break;
      case 'bank-details':
        setStep('bank-amount');
        break;
      case 'bank-review':
        setStep('bank-details');
        break;
      case 'bank-status':
        handleModalClose();
        break;
      case 'wallet-amount':
        setStep('select-method');
        break;
      case 'wallet-review':
        setStep('wallet-amount');
        break;
      default:
        setStep('select-method');
    }
  };

  // Header Title
  const getHeaderTitle = () => {
    switch (step) {
      case 'select-method':
        return 'Withdraw';
      case 'bank-amount':
        return 'Withdraw to Bank';
      case 'bank-details':
        return 'Bank Account Details';
      case 'bank-review':
        return 'Review Withdrawal';
      case 'bank-status':
        return 'Withdrawal Status';
      case 'wallet-amount':
        return 'Send to External Wallet';
      case 'wallet-review':
        return 'Review Transfer';
      default:
        return 'Withdraw';
    }
  };

  // Bank flow: Validate amount and advance to bank-details
  const handleProceedFromBankAmount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(amountUsdc);
    if (isNaN(num) || num < 1) {
      setErrorMessage('Minimum withdrawal amount is 1 USDC');
      return;
    }
    if (num > availableBalance) {
      setErrorMessage(`Amount exceeds your available balance of $${availableBalance.toFixed(2)} USDC`);
      return;
    }
    setErrorMessage(null);
    setStep('bank-details');
  };

  // Bank flow: Request quote and advance to review
  const handleProceedToBankReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(amountUsdc);

    if (!selectedBankCode) {
      setErrorMessage('Please select your destination bank');
      return;
    }
    const cleanAcc = accountNumber.trim();
    const reqLen = selectedCountry === 'NG' ? 10 : 8;
    if (!cleanAcc || cleanAcc.length < reqLen) {
      setErrorMessage(
        selectedCountry === 'NG'
          ? 'Please enter a valid 10-digit account number'
          : 'Please enter a valid account number'
      );
      return;
    }
    if (!verifiedName) {
      setErrorMessage('Please verify your account holder name before continuing');
      return;
    }

    setIsLoadingQuote(true);
    setErrorMessage(null);

    try {
      const res = await walletService.getWithdrawQuote({
        amount: num,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: selectedChannel,
      });

      const quoteData = res.data?.data;
      if (quoteData) {
        setQuote(quoteData);
        setStep('bank-review');
      } else {
        setErrorMessage('Unable to retrieve payout exchange rate quote.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to fetch withdrawal quote';
      setErrorMessage(msg);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Bank flow: Submit authoritative withdrawal
  const handleConfirmBankWithdrawal = async () => {
    const num = parseFloat(amountUsdc);
    if (isNaN(num) || num <= 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const selectedBank = institutions.find((i) => i.code === selectedBankCode);
    const beneficiaryData = {
      holder_type: 'INDIVIDUAL',
      holder_name: verifiedName || accountName.trim() || 'Beneficiary',
      account_number: accountNumber.trim(),
      bank_code: selectedBankCode,
      bank_name: selectedBank?.name || 'Bank',
    };

    try {
      const res = await walletService.initiateWithdrawal({
        amount: num,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: selectedChannel,
        beneficiary: beneficiaryData,
        idempotencyKey: `wth-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        narration: `MyArteLab Withdrawal to ${beneficiaryData.holder_name}`,
      });

      const data = res.data?.data;
      if (data) {
        setActiveWithdrawal({
          reference: data.reference,
          status: data.status || 'processing',
          switchStatus: data.switchStatus,
          amount: data.amount || num,
          usdcAmount: data.amount || num,
          fiatAmount: data.fiatAmount,
          currency: data.currency || 'USDC',
          fiatCurrency: data.fiatCurrency || selectedCurrency,
          channel: data.channel || 'BANK',
          beneficiary: data.beneficiary || beneficiaryData,
          createdAt: data.createdAt,
        });

        setStep('bank-status');
        toast.success('Withdrawal initiated! Balance reserved.');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to initiate withdrawal';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // External wallet flow: Handle reading from clipboard
  const handlePasteAddress = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('Clipboard access not supported. Please paste manually.');
        return;
      }
      const text = await navigator.clipboard.readText();
      const clean = text?.trim();
      if (!clean) {
        toast.error('Clipboard is empty.');
        return;
      }
      setDestinationAddress(clean);
      setErrorMessage(null);

      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
        toast.error('Pasted text is not a valid Solana address (32–44 Base58 characters).');
      } else if (solanaAddress && clean.toLowerCase() === solanaAddress.toLowerCase()) {
        toast.error('Cannot withdraw to your own deposit address.');
      } else {
        toast.success('Address pasted');
      }
    } catch (_) {
      toast.error('Clipboard permission denied. Please paste manually.');
    }
  };

  // External wallet flow: Validate and advance to review
  const handleProceedToWalletReview = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(walletAmount);
    const cleanAddr = destinationAddress.trim();

    if (isNaN(num) || num < 1) {
      setErrorMessage('Minimum withdrawal amount is 1 USDC');
      return;
    }
    if (num > availableBalance) {
      setErrorMessage(`Amount exceeds your available balance of $${availableBalance.toFixed(2)} USDC`);
      return;
    }
    if (!cleanAddr) {
      setErrorMessage('Please enter a destination Solana address');
      return;
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddr)) {
      setErrorMessage('Please enter a valid Solana wallet address (32–44 Base58 characters)');
      return;
    }
    if (solanaAddress && cleanAddr.toLowerCase() === solanaAddress.toLowerCase()) {
      setErrorMessage('Destination address cannot be your own MyArteLab deposit address');
      return;
    }

    setErrorMessage(null);
    setStep('wallet-review');
  };

  // External wallet flow: Submit on-chain Solana transfer
  const handleConfirmSolanaWithdrawal = async () => {
    const num = parseFloat(walletAmount);
    const cleanAddr = destinationAddress.trim();

    if (isNaN(num) || num < 1) {
      setErrorMessage('Minimum withdrawal amount is 1 USDC');
      toast.error('Minimum withdrawal amount is 1 USDC');
      return;
    }
    if (num > availableBalance) {
      const msg = `Amount exceeds your available balance of $${availableBalance.toFixed(2)} USDC`;
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    if (!cleanAddr || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddr)) {
      const msg = 'Please provide a valid Solana wallet address (32–44 Base58 characters)';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }
    if (solanaAddress && cleanAddr.toLowerCase() === solanaAddress.toLowerCase()) {
      const msg = 'Destination address cannot be your own MyArteLab deposit address';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setIsSubmittingSolana(true);
    setErrorMessage(null);

    try {
      const res = await walletService.withdrawSolana({
        amount: num,
        solanaAddress: cleanAddr,
      });

      if (res.data?.success) {
        try {
          localStorage.setItem('myartelab_last_solana_withdraw_addr', cleanAddr);
        } catch (_) {}

        toast.success(res.data?.message || 'Withdrawal sent successfully.');
        handleModalClose();
        if (onSuccess) onSuccess();
      } else {
        const errorMsg = res.data?.error || 'Failed to process withdrawal';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Withdrawal failed. Please check your address and balance.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingSolana(false);
    }
  };

  // Top 10 priority banks for Nigeria
  const topBanks = useMemo(() => {
    if (selectedCountry !== 'NG' || institutions.length === 0) return [];
    const result: Institution[] = [];
    const usedCodes = new Set<string>();

    for (const def of NIGERIA_TOP_BANKS) {
      let match = institutions.find((inst) => inst.code === def.code);
      if (!match) {
        match = institutions.find((inst) =>
          def.aliases.some((alias) => inst.name.toLowerCase().includes(alias))
        );
      }
      if (match && !usedCodes.has(match.code)) {
        usedCodes.add(match.code);
        result.push(match);
      }
    }
    return result;
  }, [institutions, selectedCountry]);

  // Remaining supported banks sorted alphabetically
  const otherBanks = useMemo(() => {
    if (selectedCountry !== 'NG') {
      return [...institutions].sort((a, b) => a.name.localeCompare(b.name));
    }
    const topCodes = new Set(topBanks.map((b) => b.code));
    return institutions
      .filter((inst) => !topCodes.has(inst.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [institutions, selectedCountry, topBanks]);

  // Filtered banks across the entire directory when searching
  const searchResults = useMemo(() => {
    if (!bankSearch.trim()) return [];
    const q = bankSearch.trim().toLowerCase();
    return institutions
      .filter(
        (inst) =>
          inst.name.toLowerCase().includes(q) ||
          inst.code.toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [institutions, bankSearch]);

  const selectedBank = institutions.find((i) => i.code === selectedBankCode);

  // Render Persistent Action Footer
  const renderFooterActions = () => {
    switch (step) {
      case 'select-method':
        return (
          <button
            type="button"
            onClick={() => {
              if (selectedMethod === 'bank') setStep('bank-amount');
              else if (selectedMethod === 'crypto') setStep('wallet-amount');
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
            onClick={handleProceedFromBankAmount}
            disabled={!amountUsdc || parseFloat(amountUsdc) < 1 || parseFloat(amountUsdc) > availableBalance}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <span>Continue</span>
          </button>
        );

      case 'bank-details': {
        const cleanAcc = accountNumber.trim();
        const isAccValid = selectedCountry === 'NG' ? cleanAcc.length === 10 : cleanAcc.length >= 8;
        return (
          <button
            type="button"
            onClick={handleProceedToBankReview}
            disabled={
              isLoadingQuote ||
              isVerifyingAccount ||
              !selectedBankCode ||
              !isAccValid ||
              !verifiedName
            }
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {isLoadingQuote ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Getting Quote...</span>
              </>
            ) : isVerifyingAccount ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Account...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        );
      }

      case 'bank-review':
        return (
          <button
            type="button"
            onClick={handleConfirmBankWithdrawal}
            disabled={isSubmitting || (quoteSecondsLeft !== null && quoteSecondsLeft <= 0)}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming Withdrawal...</span>
              </>
            ) : (
              <span>Confirm Withdrawal</span>
            )}
          </button>
        );

      case 'bank-status':
        return (
          <button
            type="button"
            onClick={handleModalClose}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Done
          </button>
        );

      case 'wallet-amount': {
        const num = parseFloat(walletAmount || '0');
        const cleanAddr = destinationAddress.trim();
        const isValidAddr =
          /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddr) &&
          (!solanaAddress || cleanAddr.toLowerCase() !== solanaAddress.toLowerCase());
        const isValidAmount = !isNaN(num) && num >= 1 && num <= availableBalance;

        return (
          <button
            type="button"
            onClick={handleProceedToWalletReview}
            disabled={!isValidAmount || !isValidAddr}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <span>Continue</span>
          </button>
        );
      }

      case 'wallet-review':
        return (
          <button
            type="button"
            onClick={handleConfirmSolanaWithdrawal}
            disabled={isSubmittingSolana}
            className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            {isSubmittingSolana ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Confirm Send</span>
            )}
          </button>
        );

      default:
        return null;
    }
  };

  // Structured content with separated Header, Scrollable Body, and Fixed Footer
  const content = (
    <div className="flex flex-col h-full max-h-[90dvh] sm:max-h-[85vh] overflow-hidden text-gray-900">
      {/* 1. Header Bar: Back button, Title, Close button */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 pt-1 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          {step !== 'select-method' && step !== 'bank-status' && (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">{getHeaderTitle()}</h2>
        </div>
        <button
          type="button"
          onClick={handleModalClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-4 px-0.5 space-y-4">
        {/* Step 1: Choose How to Withdraw */}
        {step === 'select-method' && (
          <div className="space-y-3">
            {/* Available balance callout */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/80 rounded-xl border border-gray-100 text-xs text-gray-600 mb-1">
              <span>Available to withdraw</span>
              <span className="font-semibold text-gray-900">
                ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>

            {/* Option 1: Withdraw to Bank */}
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
                  <span className="text-base font-semibold text-gray-900">Withdraw to Bank</span>
                  {!isBankSupported && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                      {isLoadingCorridors ? 'Loading...' : 'Unavailable'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Payout directly to your registered local bank account.
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

            {/* Option 2: Withdraw to External Wallet */}
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
                  <span className="text-base font-semibold text-gray-900">Withdraw to External Wallet</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                  Send USDC directly to an external Solana wallet address.
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

        {/* Step: Bank Amount Input */}
        {step === 'bank-amount' && (
          <form onSubmit={handleProceedFromBankAmount} className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-gray-500 font-medium">Available balance</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">
                  ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const maxVal = Math.floor(availableBalance * 100) / 100;
                    setAmountUsdc(String(maxVal > 0 ? maxVal : ''));
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-[#9747FF] hover:text-[#8535ed] bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="py-6 text-center bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Withdrawal Amount
              </p>
              <div className="inline-flex items-baseline justify-center">
                <span className="text-3xl font-light text-gray-400 mr-1.5">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountUsdc}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setAmountUsdc(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0.00"
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 bg-transparent text-center focus:outline-none w-auto max-w-[280px]"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Asset: <span className="font-semibold text-gray-700">USDC</span>
              </p>
            </div>

            <div className="p-3 bg-gray-50/70 border border-gray-100 rounded-xl text-xs text-gray-500 flex items-center justify-between">
              <span>Payout Destination</span>
              <span className="font-semibold text-gray-700">{selectedCountry === 'NG' ? 'Nigerian Bank (NGN)' : `${selectedCountry} Bank`}</span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        )}

        {/* Step: Bank Account Details */}
        {step === 'bank-details' && (
          <form onSubmit={handleProceedToBankReview} className="space-y-4">
            {/* Amount confirmation chip */}
            <div className="flex items-center justify-between p-3 bg-gray-50/70 border border-gray-100 rounded-xl text-xs">
              <span className="text-gray-500">Withdrawing:</span>
              <span className="font-bold text-gray-900">${parseFloat(amountUsdc || '0').toFixed(2)} USDC</span>
            </div>

            {/* 1. Bank Selection Dropdown / Selector (Anchored Overlay) */}
            <div className="space-y-1.5 relative" ref={bankDropdownRef}>
              <label className="text-xs font-semibold text-gray-700">Select bank</label>
              <button
                type="button"
                onClick={() => setIsBankPickerOpen((prev) => !prev)}
                className="w-full h-11 px-3.5 bg-white border border-gray-200 rounded-xl text-left text-sm flex items-center justify-between hover:border-gray-300 focus:outline-none focus:border-[#9747FF] focus:ring-1 focus:ring-[#9747FF] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <span className={selectedBank ? 'font-medium text-gray-900 truncate' : 'text-gray-400'}>
                    {selectedBank ? selectedBank.name : 'Select bank'}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0',
                    isBankPickerOpen && 'rotate-180 text-gray-600'
                  )}
                />
              </button>

              {isBankPickerOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                  {/* Search Input Header */}
                  <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        placeholder="Search banks"
                        autoFocus
                        className="w-full h-9 pl-9 pr-8 text-xs bg-white rounded-lg border border-gray-200 focus:outline-none focus:border-[#9747FF] focus:ring-1 focus:ring-[#9747FF] placeholder:text-gray-400"
                      />
                      {bankSearch && (
                        <button
                          type="button"
                          onClick={() => setBankSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Options List */}
                  <div className="max-h-60 overflow-y-auto overscroll-contain text-xs divide-y divide-gray-50">
                    {isLoadingInstitutions ? (
                      <div className="py-8 text-center text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#9747FF]" />
                        <span>Loading supported banks...</span>
                      </div>
                    ) : bankSearch.trim() ? (
                      /* Search active: Direct flat list */
                      searchResults.length > 0 ? (
                        searchResults.map((inst) => (
                          <button
                            key={inst.code}
                            type="button"
                            onClick={() => {
                              setSelectedBankCode(inst.code);
                              setIsBankPickerOpen(false);
                              setBankSearch('');
                              setVerifiedName(null);
                              setAccountName('');
                              setVerificationError(null);
                            }}
                            className={cn(
                              'w-full px-3.5 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors',
                              selectedBankCode === inst.code && 'bg-purple-50/60 text-[#9747FF] font-semibold'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 text-[10px]">
                                <Building2 className="w-3 h-3" />
                              </div>
                              <span className="truncate">{inst.name}</span>
                            </div>
                            {selectedBankCode === inst.code && <Check className="w-3.5 h-3.5 text-[#9747FF] shrink-0" />}
                          </button>
                        ))
                      ) : (
                        <div className="py-8 px-4 text-center">
                          <p className="text-xs font-semibold text-gray-700">No banks found matching "{bankSearch}"</p>
                          <p className="text-[11px] text-gray-400 mt-1">Please check the spelling or search with a different bank name.</p>
                        </div>
                      )
                    ) : (
                      /* Default state: Popular Banks first, then All Supported Banks */
                      <>
                        {topBanks.length > 0 && (
                          <div>
                            <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                              Popular Banks
                            </div>
                            {topBanks.map((inst) => (
                              <button
                                key={`top-${inst.code}`}
                                type="button"
                                onClick={() => {
                                  setSelectedBankCode(inst.code);
                                  setIsBankPickerOpen(false);
                                  setBankSearch('');
                                  setVerifiedName(null);
                                  setAccountName('');
                                  setVerificationError(null);
                                }}
                                className={cn(
                                  'w-full px-3.5 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors',
                                  selectedBankCode === inst.code && 'bg-purple-50/60 text-[#9747FF] font-semibold'
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-5 h-5 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0 text-[10px] font-bold">
                                    ★
                                  </div>
                                  <span className="truncate">{inst.name}</span>
                                </div>
                                {selectedBankCode === inst.code && <Check className="w-3.5 h-3.5 text-[#9747FF] shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}

                        <div>
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                            All Supported Banks
                          </div>
                          {otherBanks.map((inst) => (
                            <button
                              key={`other-${inst.code}`}
                              type="button"
                              onClick={() => {
                                setSelectedBankCode(inst.code);
                                setIsBankPickerOpen(false);
                                setBankSearch('');
                                setVerifiedName(null);
                                setAccountName('');
                                setVerificationError(null);
                              }}
                              className={cn(
                                'w-full px-3.5 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between cursor-pointer transition-colors',
                                selectedBankCode === inst.code && 'bg-purple-50/60 text-[#9747FF] font-semibold'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 text-[10px]">
                                  <Building2 className="w-3 h-3" />
                                </div>
                                <span className="truncate">{inst.name}</span>
                              </div>
                              {selectedBankCode === inst.code && <Check className="w-3.5 h-3.5 text-[#9747FF] shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Account Number Form Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Account number</label>
                {accountNumber.length > 0 && (
                  <span
                    className={cn(
                      'text-[11px] font-medium transition-colors',
                      selectedCountry === 'NG'
                        ? accountNumber.length === 10
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                        : accountNumber.length >= 8
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    )}
                  >
                    {selectedCountry === 'NG'
                      ? `${accountNumber.length}/10 digits`
                      : `${accountNumber.length} digits`}
                  </span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={selectedCountry === 'NG' ? 10 : 20}
                value={accountNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAccountNumber(val);
                  setErrorMessage(null);
                }}
                placeholder={selectedCountry === 'NG' ? '10-digit account number' : 'Enter account number'}
                className="w-full h-11 px-3.5 bg-white border border-gray-200 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:border-[#9747FF] focus:ring-1 focus:ring-[#9747FF] placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400"
              />
            </div>

            {/* 3. Automatic Account Verification (Read-only Account Name) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Account name</label>
                {verifiedName && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={isVerifyingAccount ? '' : verifiedName || ''}
                  placeholder={isVerifyingAccount ? 'Verifying account...' : 'Account name will appear after verification'}
                  className={cn(
                    'w-full h-11 px-3.5 rounded-xl text-sm font-medium transition-colors select-none cursor-default pr-10',
                    verifiedName
                      ? 'bg-emerald-50/50 border border-emerald-200/80 text-emerald-950 font-semibold tracking-wide uppercase'
                      : 'bg-gray-50/80 border border-gray-200 text-gray-500 placeholder:text-gray-400 placeholder:font-normal placeholder:normal-case'
                  )}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  {isVerifyingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#9747FF]" />
                  ) : verifiedName ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : null}
                </div>
              </div>
              {verificationError && (
                <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{verificationError}</span>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        )}

        {/* Step: Bank Review Quote */}
        {step === 'bank-review' && quote && (
          <div className="space-y-4">
            {/* Prominent Net Payout Card */}
            <div className="text-center py-5 bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                You Will Receive
              </p>
              <div className="flex items-baseline justify-center mt-1">
                <span className="text-2xl font-light text-gray-400 mr-1">
                  {getCurrencySymbol(quote.destination.currency)}
                </span>
                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {quote.destination.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-semibold text-gray-500 ml-2">
                  {quote.destination.currency}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Direct deposit to local bank account</p>
            </div>

            {/* Breakdown Card */}
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Withdrawal Amount</span>
                <span className="font-semibold text-gray-900">${quote.source.amount.toFixed(2)} USDC</span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Exchange Rate</span>
                <span className="font-semibold text-gray-900">
                  1 USDC ≈ {quote.rate.toLocaleString('en-US', { maximumFractionDigits: 2 })} {quote.destination.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Processing Time</span>
                <span className="font-semibold text-gray-900">Instant to 15 minutes</span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Bank</span>
                <span className="font-semibold text-gray-900 truncate max-w-[200px] text-right">
                  {selectedBank?.name || 'Local Bank'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Account Number</span>
                <span className="font-mono font-semibold text-gray-900">
                  {accountNumber.length > 4 ? `••••${accountNumber.slice(-4)}` : accountNumber}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Account Name</span>
                <span className="font-semibold text-gray-900 uppercase truncate max-w-[200px] text-right">
                  {verifiedName || accountName}
                </span>
              </div>
            </div>

            {quoteSecondsLeft !== null && (
              <div className="flex items-center justify-between px-2 text-[11px] text-gray-400">
                <span>Quote guaranteed for</span>
                <span className={cn('font-mono font-semibold', quoteSecondsLeft < 15 ? 'text-amber-600' : 'text-gray-600')}>
                  {quoteSecondsLeft}s
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Bank Status / Tracking */}
        {step === 'bank-status' && activeWithdrawal && (
          <div className="space-y-5 text-center py-2">
            <div className="flex justify-center pt-2">
              {activeWithdrawal.status === 'completed' ? (
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : activeWithdrawal.status === 'failed' || activeWithdrawal.status === 'reversed' ? (
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-[#9747FF]">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                {activeWithdrawal.status === 'completed'
                  ? 'Withdrawal Completed'
                  : activeWithdrawal.status === 'failed' || activeWithdrawal.status === 'reversed'
                  ? 'Withdrawal Failed'
                  : 'Withdrawal Processing'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                {activeWithdrawal.status === 'completed'
                  ? 'Funds have been delivered to your bank account.'
                  : activeWithdrawal.status === 'failed' || activeWithdrawal.status === 'reversed'
                  ? activeWithdrawal.failureReason || 'Payout could not be completed. Your balance was refunded.'
                  : 'Your payout is being processed by the banking network. Balance reserved.'}
              </p>
            </div>

            {/* Details Summary */}
            <div className="bg-white border border-gray-150 rounded-2xl divide-y divide-gray-100 text-left text-xs sm:text-sm shadow-2xs overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-500 font-medium">Reference</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-gray-900">{activeWithdrawal.reference}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeWithdrawal.reference, 'Reference')}
                    className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {copiedField === 'Reference' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-500 font-medium">Amount</span>
                <span className="font-semibold text-gray-900">${activeWithdrawal.usdcAmount.toFixed(2)} USDC</span>
              </div>

              {activeWithdrawal.fiatAmount > 0 && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-500 font-medium">Local Payout</span>
                  <span className="font-bold text-gray-900">
                    {getCurrencySymbol(activeWithdrawal.fiatCurrency)}
                    {activeWithdrawal.fiatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {activeWithdrawal.fiatCurrency}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-gray-500 font-medium">Destination</span>
                <span className="font-semibold text-gray-900 text-right truncate max-w-[200px]">
                  {activeWithdrawal.beneficiary?.bank_name} ••••{activeWithdrawal.beneficiary?.account_number?.slice(-4)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step: External Wallet Amount & Address Input (Screen 1) */}
        {step === 'wallet-amount' && (
          <form onSubmit={handleProceedToWalletReview} className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-gray-500 font-medium">Available balance</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">
                  ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const maxVal = Math.floor(availableBalance * 100) / 100;
                    setWalletAmount(String(maxVal > 0 ? maxVal : ''));
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold text-[#9747FF] hover:text-[#8535ed] bg-purple-50 hover:bg-purple-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Prominent Amount Card */}
            <div className="py-6 text-center bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Withdrawal Amount
              </p>
              <div className="inline-flex items-baseline justify-center">
                <span className="text-3xl font-light text-gray-400 mr-1.5">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={walletAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setWalletAmount(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0.00"
                  className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 bg-transparent text-center focus:outline-none w-auto max-w-[280px]"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Asset: <span className="font-semibold text-gray-700">USDC (SPL Token)</span>
              </p>
            </div>

            {/* Destination Solana Wallet Address Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700">Destination Solana Address</label>
                <span className="text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-full">
                  Solana Mainnet
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => {
                    setDestinationAddress(e.target.value.trim());
                    setErrorMessage(null);
                  }}
                  placeholder="Enter or paste Solana address"
                  className="w-full h-11 pl-3.5 pr-20 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-[#9747FF] focus:ring-1 focus:ring-[#9747FF]"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {destinationAddress ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDestinationAddress('');
                        setErrorMessage(null);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                      title="Clear address"
                      aria-label="Clear address"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handlePasteAddress}
                    className="px-2.5 py-1 text-xs font-semibold text-[#9747FF] bg-purple-50 hover:bg-purple-100/80 rounded-lg transition-colors cursor-pointer"
                  >
                    Paste
                  </button>
                </div>
              </div>

              {/* Address validation feedback */}
              {destinationAddress && (
                <div className="pt-0.5 px-0.5">
                  {/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(destinationAddress) ? (
                    solanaAddress && destinationAddress.toLowerCase() === solanaAddress.toLowerCase() ? (
                      <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Cannot withdraw to your own deposit address
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        Valid Solana address format (Base58)
                      </p>
                    )
                  ) : (
                    <p className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Address must be 32–44 Base58 characters
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Network Note / Warning */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Only send to a <strong className="font-semibold">Solana</strong> address supporting SPL USDC. Transfers sent through other networks will be permanently lost.
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        )}

        {/* Step: External Wallet Review & Confirmation (Screen 2) */}
        {step === 'wallet-review' && (
          <div className="space-y-4">
            <div className="text-center py-5 bg-gray-50/60 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Total Transfer
              </p>
              <div className="flex items-baseline justify-center mt-1">
                <span className="text-2xl font-light text-gray-400 mr-1">$</span>
                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
                  {parseFloat(walletAmount || '0').toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md ml-2">
                  USDC
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Settles on Solana Mainnet</p>
            </div>

            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 font-medium">Asset</span>
                <span className="font-semibold text-gray-900">USDC (SPL Token)</span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Network</span>
                <span className="font-semibold text-gray-900">Solana Mainnet</span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Network Fee</span>
                <span className="font-semibold text-emerald-600">0.00 USDC (Free!)</span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Destination</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-gray-900" title={destinationAddress}>
                    {destinationAddress.length > 10
                      ? `${destinationAddress.slice(0, 4)}...${destinationAddress.slice(-4)}`
                      : destinationAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(destinationAddress, 'Address')}
                    className="p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    aria-label="Copy destination address"
                  >
                    {copiedField === 'Address' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-gray-100 pt-2">
                <span className="text-gray-500 font-medium">Recipient Receives</span>
                <span className="font-bold text-gray-900">${parseFloat(walletAmount || '0').toFixed(2)} USDC</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Transfers on Solana are permanent and irreversible. Please ensure the destination wallet supports SPL USDC.
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
      </div>

      {/* 3. Fixed Opaque Action Footer: Always visible above bottom navigation and safe areas */}
      {renderFooterActions() && (
        <div className="shrink-0 bg-white border-t border-gray-100 pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
          {renderFooterActions()}
        </div>
      )}
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
        <DrawerContent className="bg-white rounded-t-3xl max-h-[90dvh] flex flex-col p-5 pb-0 border-none shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Withdraw Funds</DrawerTitle>
          <DrawerDescription className="sr-only">
            Withdraw from your MyArteLab wallet
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
        className="bg-white rounded-2xl max-h-[85vh] sm:max-w-[460px] flex flex-col p-6 pb-0 border border-gray-100 shadow-xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Withdraw Funds</DialogTitle>
        <DialogDescription className="sr-only">
          Withdraw from your MyArteLab wallet
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
