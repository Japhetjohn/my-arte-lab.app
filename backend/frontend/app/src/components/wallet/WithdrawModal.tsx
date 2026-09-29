import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { walletService } from '@/lib/api';
import {
  Loader2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  AlertCircle,
  Copy,
  CheckCircle2,
  Building2,
  Smartphone,
  RefreshCw,
  ArrowLeft,
  Search,
  Check,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

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
  createdAt?: string;
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess?: () => void;
}

const COUNTRY_NAMES: Record<string, string> = {
  NG: 'Nigeria',
  GH: 'Ghana',
  KE: 'Kenya',
  CD: 'DR Congo',
  UG: 'Uganda',
  CI: "Côte d'Ivoire",
  CM: 'Cameroon',
  SN: 'Senegal',
  RW: 'Rwanda',
  BJ: 'Benin',
  ML: 'Mali',
  TZ: 'Tanzania',
  ZM: 'Zambia',
  SL: 'Sierra Leone',
  MW: 'Malawi',
  LR: 'Liberia',
  GM: 'Gambia',
  EG: 'Egypt',
  BW: 'Botswana',
  ZA: 'South Africa',
};

const COMMON_MOBILE_NETWORKS: Record<string, string[]> = {
  GH: ['MTN', 'Vodafone', 'AirtelTigo'],
  KE: ['M-PESA', 'Airtel Money'],
  UG: ['MTN', 'Airtel'],
  CI: ['MTN', 'Orange', 'Moov'],
  SN: ['Orange', 'Free', 'Wave'],
  CM: ['MTN', 'Orange'],
  RW: ['MTN', 'Airtel'],
  TZ: ['M-PESA', 'Tigo Pesa', 'Airtel Money', 'Halopesa'],
};

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalance = 0,
  onSuccess
}: WithdrawModalProps) {
  // Step state: 1 = Configure (amount, corridor, channel, beneficiary), 2 = Review, 3 = Status / Tracking
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Corridor options
  const [corridors, setCorridors] = useState<WithdrawCorridor[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('NG');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('NGN');
  const [selectedChannel, setSelectedChannel] = useState<string>('BANK');
  const [amountUsdc, setAmountUsdc] = useState<string>('');

  // Institutions & Beneficiary
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [mobileNetwork, setMobileNetwork] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [bankSearch, setBankSearch] = useState<string>('');

  // Resolution & Quote
  const [isVerifyingAccount, setIsVerifyingAccount] = useState<boolean>(false);
  const [isAccountVerified, setIsAccountVerified] = useState<boolean>(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number | null>(null);

  // Loading states
  const [isLoadingCorridors, setIsLoadingCorridors] = useState<boolean>(false);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState<boolean>(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active withdrawal tracking
  const [activeWithdrawal, setActiveWithdrawal] = useState<ActiveWithdrawal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // 1. Fetch available withdrawal corridors when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setStep(1);
      setAmountUsdc('');
      setQuote(null);
      setActiveWithdrawal(null);
      setErrorMessage(null);
      setIsAccountVerified(false);
      setVerifiedName(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    let isMounted = true;
    const fetchOptions = async () => {
      setIsLoadingCorridors(true);
      setErrorMessage(null);
      try {
        const res = await walletService.getWithdrawOptions();
        const corridorsList = res.data?.data?.corridors || [];
        if (isMounted) {
          setCorridors(corridorsList);
          if (corridorsList.length > 0) {
            const initial = corridorsList.find((c: WithdrawCorridor) => c.country === 'NG') || corridorsList[0];
            setSelectedCountry(initial.country);
            setSelectedCurrency(initial.currencies?.[0] || 'NGN');
            const defaultChan = initial.channels?.includes('BANK') ? 'BANK' : (initial.channels?.[0] || 'BANK');
            setSelectedChannel(defaultChan);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.error || 'Unable to load supported withdrawal corridors.');
        }
      } finally {
        if (isMounted) setIsLoadingCorridors(false);
      }
    };

    fetchOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Fetch institutions whenever country or channel changes
  useEffect(() => {
    if (!isOpen || selectedChannel !== 'BANK') return;

    let isMounted = true;
    const fetchInstitutionsList = async () => {
      setIsLoadingInstitutions(true);
      try {
        const res = await walletService.getInstitutions(selectedCountry);
        const list = res.data?.data || [];
        if (isMounted) {
          setInstitutions(list);
          setSelectedBankCode('');
          setIsAccountVerified(false);
          setVerifiedName(null);
        }
      } catch (err: any) {
        console.warn('Failed to load institutions:', err.message);
        if (isMounted) setInstitutions([]);
      } finally {
        if (isMounted) setIsLoadingInstitutions(false);
      }
    };

    fetchInstitutionsList();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCountry, selectedChannel]);

  // 3. Quote countdown timer
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
      if (remainingSecs <= 0) {
        clearInterval(timerIntervalRef.current!);
      }
    };

    updateCountdown();
    timerIntervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [quote]);

  // 4. Polling for withdrawal status if in processing / reserved state
  useEffect(() => {
    if (step !== 3 || !activeWithdrawal?.reference) {
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
        console.warn('Polling status error:', err.message);
      }
    };

    // Poll every 4 seconds
    pollIntervalRef.current = setInterval(pollStatus, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [step, activeWithdrawal?.reference, onSuccess]);

  // Handle Country selection change
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setQuote(null);
    setErrorMessage(null);
    setIsAccountVerified(false);
    setVerifiedName(null);
    setSelectedBankCode('');
    setAccountNumber('');
    setMobileNumber('');
    setAccountName('');

    const corridor = corridors.find((c) => c.country === countryCode);
    if (corridor) {
      if (corridor.currencies.length > 0) {
        setSelectedCurrency(corridor.currencies[0]);
      }
      if (corridor.channels.length > 0) {
        const defaultChan = corridor.channels.includes('BANK') ? 'BANK' : corridor.channels[0];
        setSelectedChannel(defaultChan);
      }
    }
  };

  // Fetch Guaranteed Off-ramp Quote
  const handleFetchQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(amountUsdc);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid withdrawal amount greater than 0');
      return;
    }
    if (num > availableBalance) {
      toast.error(`Amount exceeds your available balance of $${availableBalance.toFixed(2)} USDC`);
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
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to fetch withdrawal quote';
      setErrorMessage(msg);
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // Account verification (lookup)
  const handleVerifyAccount = async () => {
    if (!selectedBankCode) {
      toast.error('Please select a destination bank');
      return;
    }
    if (!accountNumber || accountNumber.trim().length < 5) {
      toast.error('Please enter a valid account number');
      return;
    }

    setIsVerifyingAccount(true);
    setErrorMessage(null);

    try {
      const res = await walletService.resolveAccount({
        country: selectedCountry,
        bankCode: selectedBankCode,
        accountNumber: accountNumber.trim(),
      });

      const data = res.data?.data;
      const resolvedName = data?.account_name || data?.accountName || data?.holder_name;
      if (resolvedName) {
        setVerifiedName(resolvedName);
        setAccountName(resolvedName);
        setIsAccountVerified(true);
        toast.success(`Account verified: ${resolvedName}`);
      } else {
        setIsAccountVerified(true);
        setVerifiedName(accountName || 'Verified Account');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Could not verify account name. Please check account details.';
      toast.error(msg);
      setIsAccountVerified(false);
      setVerifiedName(null);
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Proceed to Step 2 (Review)
  const handleProceedToReview = async () => {
    const num = parseFloat(amountUsdc);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (num > availableBalance) {
      toast.error(`Amount exceeds your available balance of $${availableBalance.toFixed(2)} USDC`);
      return;
    }

    if (selectedChannel === 'BANK') {
      if (!selectedBankCode) {
        toast.error('Please select a destination bank');
        return;
      }
      if (!accountNumber.trim()) {
        toast.error('Please enter an account number');
        return;
      }
      if (!accountName.trim() && !verifiedName) {
        toast.error('Please verify or enter the account holder name');
        return;
      }
    } else if (selectedChannel === 'MOBILEMONEY') {
      if (!mobileNumber.trim()) {
        toast.error('Please enter a mobile phone number');
        return;
      }
      if (!accountName.trim()) {
        toast.error('Please enter recipient name');
        return;
      }
    }

    // Refresh quote if expired or missing
    if (!quote || (quoteSecondsLeft !== null && quoteSecondsLeft <= 0)) {
      await handleFetchQuote();
    }

    setStep(2);
  };

  // Step 2 -> Step 3: Initiate Withdrawal
  const handleInitiateWithdrawal = async () => {
    const num = parseFloat(amountUsdc);
    if (isNaN(num) || num <= 0) {
      toast.error('Invalid withdrawal amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const selectedBank = institutions.find((i) => i.code === selectedBankCode);
    const beneficiaryData: any = {
      holder_type: 'INDIVIDUAL',
      holder_name: verifiedName || accountName.trim() || 'Beneficiary',
    };

    if (selectedChannel === 'BANK') {
      beneficiaryData.account_number = accountNumber.trim();
      beneficiaryData.bank_code = selectedBankCode;
      beneficiaryData.bank_name = selectedBank?.name || 'Bank';
    } else if (selectedChannel === 'MOBILEMONEY') {
      beneficiaryData.mobile_number = mobileNumber.trim();
      beneficiaryData.mobile_network = mobileNetwork || 'DEFAULT';
    }

    try {
      const res = await walletService.initiateWithdrawal({
        amount: num,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: selectedChannel,
        beneficiary: beneficiaryData,
        narration: `MyArteLab Withdrawal to ${beneficiaryData.holder_name}`,
      });

      const data = res.data?.data;
      if (data) {
        setActiveWithdrawal({
          reference: data.reference,
          status: data.status,
          switchStatus: data.switchStatus,
          amount: data.amount || num,
          usdcAmount: data.amount || num,
          fiatAmount: data.fiatAmount,
          currency: data.currency || 'USDC',
          fiatCurrency: data.fiatCurrency,
          channel: data.channel,
          beneficiary: data.beneficiary || beneficiaryData,
          createdAt: data.createdAt,
        });

        setStep(3);
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

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${fieldName} copied to clipboard`);
  };

  const currentCorridor = corridors.find((c) => c.country === selectedCountry);
  const selectedBank = institutions.find((i) => i.code === selectedBankCode);
  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    inst.code.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#8A2BE2]/10 text-[#8A2BE2] flex items-center justify-center text-sm font-semibold">
              ↗
            </span>
            {step === 3 ? 'Withdrawal Status' : step === 2 ? 'Confirm Withdrawal' : 'Withdraw Funds'}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            {step === 3
              ? 'Real-time tracking of your payout settlement to your destination account.'
              : step === 2
              ? 'Review payout details and exchange rate before confirming.'
              : 'Withdraw USDC on Solana directly to your local bank or mobile money account.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {isLoadingCorridors ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
            <p className="text-sm text-gray-500">Loading supported payout corridors...</p>
          </div>
        ) : step === 1 ? (
          /* STEP 1: CONFIGURE WITHDRAWAL */
          <div className="space-y-4">
            {/* Available balance indicator */}
            <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Available for Withdrawal</p>
                <p className="text-lg font-bold text-[#8A2BE2]">
                  ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-semibold text-purple-600">USDC</span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAmountUsdc(String(availableBalance))}
                disabled={availableBalance <= 0}
                className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 font-medium"
              >
                Max Amount
              </Button>
            </div>

            {/* Country & Currency Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">Destination Country</Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-full h-10 text-xs">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {corridors.map((c) => (
                      <SelectItem key={c.country} value={c.country} className="text-xs">
                        {COUNTRY_NAMES[c.country] || c.country} ({c.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1 block">Payout Currency</Label>
                <Select
                  value={selectedCurrency}
                  onValueChange={(val) => {
                    setSelectedCurrency(val);
                    setQuote(null);
                  }}
                >
                  <SelectTrigger className="w-full h-10 text-xs">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {(currentCorridor?.currencies || [selectedCurrency]).map((curr) => (
                      <SelectItem key={curr} value={curr} className="text-xs font-medium">
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payout Channel Tabs (Bank vs Mobile Money) */}
            {currentCorridor?.channels && currentCorridor.channels.length > 1 && (
              <div>
                <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Payout Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  {currentCorridor.channels.map((chan) => (
                    <button
                      key={chan}
                      type="button"
                      onClick={() => {
                        setSelectedChannel(chan);
                        setQuote(null);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        selectedChannel === chan
                          ? 'border-[#8A2BE2] bg-purple-50 text-[#8A2BE2] shadow-sm font-semibold'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {chan === 'BANK' ? <Building2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      <span>{chan === 'BANK' ? 'Bank Transfer' : 'Mobile Money'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-semibold text-gray-700">Withdrawal Amount (USDC)</Label>
                <span className="text-[11px] text-gray-400">Settled from Solana</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amountUsdc}
                  onChange={(e) => {
                    setAmountUsdc(e.target.value);
                    setQuote(null);
                  }}
                  className="pl-7 pr-16 h-10 text-sm font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  USDC
                </span>
              </div>
            </div>

            {/* Live Quote Breakdown Section */}
            {amountUsdc && parseFloat(amountUsdc) > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#8A2BE2]" />
                    Guaranteed Rate & Payout
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFetchQuote()}
                    disabled={isLoadingQuote}
                    className="h-6 px-2 text-[11px] text-[#8A2BE2] hover:bg-purple-100 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingQuote ? 'animate-spin' : ''}`} />
                    <span>{isLoadingQuote ? 'Updating...' : 'Refresh'}</span>
                  </Button>
                </div>

                {isLoadingQuote ? (
                  <div className="py-3 flex justify-center items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#8A2BE2]" />
                    <span>Fetching live rate from Switch...</span>
                  </div>
                ) : quote ? (
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Rate:</span>
                      <span className="font-semibold text-gray-900">
                        1 USDC = {quote.rate?.toLocaleString()} {quote.destination?.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>You receive:</span>
                      <span className="font-bold text-emerald-700 text-sm">
                        {quote.destination?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        {quote.destination?.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-[11px] pt-1 border-t border-gray-200/60">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        Settlement: {quote.settlement || 'Fast'}
                      </span>
                      {quoteSecondsLeft !== null && (
                        <span className={quoteSecondsLeft < 15 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          Quote expires in {quoteSecondsLeft}s
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleFetchQuote()}
                      className="h-7 text-xs bg-[#8A2BE2] hover:bg-[#6B21A8] text-white"
                    >
                      Get Payout Quote
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Beneficiary Details Section */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Beneficiary Details</p>

              {selectedChannel === 'BANK' ? (
                <>
                  {/* Bank Selector */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Select Bank</Label>
                    {isLoadingInstitutions ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md text-xs text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A2BE2]" />
                        <span>Loading banks...</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedBankCode}
                        onValueChange={(val) => {
                          setSelectedBankCode(val);
                          setIsAccountVerified(false);
                          setVerifiedName(null);
                        }}
                      >
                        <SelectTrigger className="w-full h-10 text-xs">
                          <SelectValue placeholder="Search or select bank..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input
                                placeholder="Filter bank..."
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                                className="h-7 text-xs pl-8"
                              />
                            </div>
                          </div>
                          {filteredInstitutions.length > 0 ? (
                            filteredInstitutions.map((inst) => (
                              <SelectItem key={inst.code} value={inst.code} className="text-xs">
                                {inst.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-3 text-xs text-gray-400 text-center">No banks found</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Account Number & Lookup Button */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Account Number</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. 0123456789"
                        value={accountNumber}
                        onChange={(e) => {
                          setAccountNumber(e.target.value);
                          setIsAccountVerified(false);
                          setVerifiedName(null);
                        }}
                        className="h-10 text-xs font-mono"
                      />
                      {selectedCountry === 'NG' && (
                        <Button
                          type="button"
                          onClick={handleVerifyAccount}
                          disabled={isVerifyingAccount || !selectedBankCode || accountNumber.length < 9}
                          className="h-10 px-3 text-xs bg-[#8A2BE2] hover:bg-[#6B21A8] text-white shrink-0"
                        >
                          {isVerifyingAccount ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Account Name */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs font-semibold text-gray-700">Account Holder Name</Label>
                      {isAccountVerified && verifiedName && (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Verified by Switch
                        </span>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="Account holder's full legal name"
                      value={verifiedName || accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      readOnly={Boolean(isAccountVerified && verifiedName)}
                      className={`h-10 text-xs ${isAccountVerified && verifiedName ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-900' : ''}`}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Mobile Money Details */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Mobile Network / Provider</Label>
                    <Select value={mobileNetwork} onValueChange={setMobileNetwork}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Select network provider..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(COMMON_MOBILE_NETWORKS[selectedCountry] || ['MTN', 'Airtel', 'Vodafone', 'Orange']).map((net) => (
                          <SelectItem key={net} value={net} className="text-xs">
                            {net}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Mobile Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="e.g. +233..."
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Account / Recipient Name</Label>
                    <Input
                      type="text"
                      placeholder="Full name as registered with mobile network"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleProceedToReview}
                disabled={
                  !amountUsdc ||
                  parseFloat(amountUsdc) <= 0 ||
                  parseFloat(amountUsdc) > availableBalance ||
                  isLoadingQuote
                }
                className="w-full h-11 bg-[#8A2BE2] hover:bg-[#6B21A8] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          /* STEP 2: REVIEW & CONFIRM WITHDRAWAL */
          <div className="space-y-4">
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <div className="text-center pb-2 border-b border-purple-200/60">
                <p className="text-xs text-gray-500">You are withdrawing</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                  ${parseFloat(amountUsdc).toFixed(2)}{' '}
                  <span className="text-sm font-semibold text-[#8A2BE2]">USDC</span>
                </h3>
                <p className="text-xs font-semibold text-emerald-700 mt-1">
                  Recipient receives ≈ {quote?.destination?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {selectedCurrency}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Destination:</span>
                  <span className="font-semibold text-gray-900">
                    {COUNTRY_NAMES[selectedCountry] || selectedCountry} ({selectedCurrency})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Channel:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedChannel === 'BANK' ? 'Bank Transfer' : 'Mobile Money'}
                  </span>
                </div>
                {selectedChannel === 'BANK' ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-purple-100">
                      <span className="text-gray-500">Bank:</span>
                      <span className="font-semibold text-gray-900 text-right">{selectedBank?.name || selectedBankCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-purple-100">
                      <span className="text-gray-500">Account Number:</span>
                      <span className="font-mono font-semibold text-gray-900">{accountNumber}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between py-1 border-b border-purple-100">
                      <span className="text-gray-500">Network:</span>
                      <span className="font-semibold text-gray-900">{mobileNetwork}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-purple-100">
                      <span className="text-gray-500">Phone Number:</span>
                      <span className="font-mono font-semibold text-gray-900">{mobileNumber}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between py-1 border-b border-purple-100">
                  <span className="text-gray-500">Beneficiary Name:</span>
                  <span className="font-semibold text-gray-900 text-right">{verifiedName || accountName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Guaranteed Rate:</span>
                  <span className="font-semibold text-gray-900">
                    1 USDC = {quote?.rate?.toLocaleString()} {selectedCurrency}
                  </span>
                </div>
              </div>
            </div>

            {/* Safe Transfer Protection Notice */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Protected Transfer:</span> Your{' '}
                <span className="font-bold">${parseFloat(amountUsdc).toFixed(2)} USDC</span> is held safely
                during payout processing. If the bank or network transfer cannot be completed, funds automatically remain safe in your wallet.
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="flex-1 h-11 text-xs font-semibold rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Edit
              </Button>
              <Button
                type="button"
                onClick={handleInitiateWithdrawal}
                disabled={isSubmitting}
                className="flex-1 h-11 bg-[#8A2BE2] hover:bg-[#6B21A8] text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Withdraw</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 3: STATUS / REAL-TIME TRACKING */
          <div className="space-y-4">
            {/* Status Header Badge */}
            {activeWithdrawal?.status === 'completed' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Withdrawal Completed</h4>
                  <p className="text-xs text-emerald-700">Funds have been disbursed to your destination account.</p>
                </div>
              </div>
            ) : activeWithdrawal?.status === 'failed' || activeWithdrawal?.status === 'reversed' ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-900">Withdrawal {activeWithdrawal.status.toUpperCase()}</h4>
                  <p className="text-xs text-red-700">Your reserved balance has been safely refunded to your wallet.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Loader2 className="w-6 h-6 text-[#8A2BE2] animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-900">Processing Payout</h4>
                  <p className="text-xs text-purple-700">Switch is routing the payout to your destination account.</p>
                </div>
              </div>
            )}

            {/* Transaction Details Card */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Transaction Reference:</span>
                <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-900">
                  <span>{activeWithdrawal?.reference.slice(0, 14)}...</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(activeWithdrawal?.reference || '', 'Reference')}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">USDC Amount:</span>
                <span className="font-bold text-gray-900">
                  ${activeWithdrawal?.usdcAmount?.toFixed(2)} USDC
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Payout Amount:</span>
                <span className="font-bold text-emerald-700">
                  {activeWithdrawal?.fiatAmount?.toLocaleString()} {activeWithdrawal?.fiatCurrency}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="text-gray-500">Beneficiary:</span>
                <span className="font-semibold text-gray-900 text-right">
                  {activeWithdrawal?.beneficiary?.account_name || verifiedName || accountName}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-gray-500">Account / Destination:</span>
                <span className="font-mono text-gray-900 text-right">
                  {activeWithdrawal?.beneficiary?.bank_name || selectedBank?.name || activeWithdrawal?.beneficiary?.mobile_network} -{' '}
                  {activeWithdrawal?.beneficiary?.account_number || activeWithdrawal?.beneficiary?.mobile_number || accountNumber}
                </span>
              </div>
            </div>

            {/* Done button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={onClose}
                className="w-full h-11 bg-[#8A2BE2] hover:bg-[#6B21A8] text-white font-semibold text-sm rounded-xl shadow-md"
              >
                Close & View Wallet
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
