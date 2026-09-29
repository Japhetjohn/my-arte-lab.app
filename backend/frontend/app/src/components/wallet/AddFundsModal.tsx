import { useState, useEffect } from 'react';
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
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

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
};

export function AddFundsModal({ isOpen, onClose, solanaAddress }: AddFundsModalProps) {
  const [corridors, setCorridors] = useState<FundingCorridor[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('NG');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('NGN');
  const [amount, setAmount] = useState<string>('10000');
  const [isLoadingCorridors, setIsLoadingCorridors] = useState<boolean>(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [activeFunding, setActiveFunding] = useState<ActiveFunding | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load supported funding corridors from Switch via backend
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCorridors = async () => {
      setIsLoadingCorridors(true);
      setErrorMessage(null);
      try {
        const res = await walletService.getFundingOptions();
        const corridorsList = res.data?.data?.corridors || [];
        if (isMounted) {
          setCorridors(corridorsList);
          if (corridorsList.length > 0) {
            const initial = corridorsList.find((c: FundingCorridor) => c.country === 'NG') || corridorsList[0];
            setSelectedCountry(initial.country);
            setSelectedCurrency(initial.currencies?.[0] || 'NGN');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.response?.data?.error || 'Unable to load supported funding options.');
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
  }, [isOpen]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setQuote(null);
    setActiveFunding(null);
    setErrorMessage(null);
    const corridor = corridors.find((c) => c.country === countryCode);
    if (corridor && corridor.currencies.length > 0) {
      setSelectedCurrency(corridor.currencies[0]);
    }
  };

  const handleFetchQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsLoadingQuote(true);
    setErrorMessage(null);

    try {
      const res = await walletService.getQuote({
        amount: parsedAmount,
        country: selectedCountry,
        currency: selectedCurrency,
      });

      const quoteData = res.data?.data;
      if (quoteData) {
        setQuote(quoteData);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch quote';
      setErrorMessage(errorMsg);
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleInitiateFunding = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    setIsInitiating(true);
    setErrorMessage(null);

    try {
      const res = await walletService.initiateFunding({
        amount: parsedAmount,
        country: selectedCountry,
        currency: selectedCurrency,
        channel: quote?.channel || 'BANK'
      });

      const fundingData = res.data?.data;
      if (fundingData) {
        setActiveFunding(fundingData);
        toast.success('Payment instructions generated successfully');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to initiate funding';
      setErrorMessage(errorMsg);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!activeFunding?.reference) return;

    setIsCheckingStatus(true);
    try {
      const res = await walletService.getFundingStatus(activeFunding.reference);
      const updated = res.data?.data;
      if (updated) {
        setActiveFunding(prev => prev ? { ...prev, status: updated.status, switchStatus: updated.switchStatus } : null);
        if (updated.status === 'completed') {
          toast.success('Deposit confirmed! Settlement recorded.');
        } else if (updated.status === 'processing') {
          toast.info('Deposit received! Switch is processing the transfer.');
        } else {
          toast.info(`Current status: ${updated.status || 'Pending payment'}`);
        }
      }
    } catch (err: any) {
      toast.error('Could not refresh status at this moment.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const currentCorridor = corridors.find((c) => c.country === selectedCountry);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-3">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#8A2BE2]/10 text-[#8A2BE2] flex items-center justify-center text-sm font-semibold">
              $
            </span>
            {activeFunding ? 'Deposit Instructions' : 'Add Funds to MyArteLab'}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            {activeFunding 
              ? 'Transfer the exact amount below to fund your wallet with USDC on Solana.'
              : 'Fund your MyArteLab balance with local fiat currency settled in USDC on Solana.'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingCorridors ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
            <p className="text-sm text-gray-500">Loading supported payment corridors...</p>
          </div>
        ) : activeFunding ? (
          /* STEP 2: PAYMENT INSTRUCTIONS VIEW */
          <div className="space-y-4">
            {/* Status Header Badge */}
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                <span className="text-xs font-bold text-amber-900 uppercase">
                  {activeFunding.status === 'processing' ? 'Processing Deposit' : 'Awaiting Payment'}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-800">
                Ref: {activeFunding.reference.slice(0, 8)}...
              </span>
            </div>

            {/* Amount Alert */}
            <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-xl text-center space-y-1">
              <p className="text-xs text-purple-700 font-medium">Exact Amount to Pay</p>
              <h2 className="text-2xl font-black text-gray-900 font-mono tracking-tight">
                {activeFunding.deposit.amount.toLocaleString()} {activeFunding.fiatCurrency}
              </h2>
              <p className="text-xs text-gray-500">
                Settles ≈ <strong className="text-purple-700">{activeFunding.quotedUsdcAmount.toFixed(4)} USDC</strong> on Solana
              </p>
            </div>

            {/* Bank Transfer Details Card */}
            {activeFunding.deposit.accountNumber && (
              <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 pb-2 border-b border-gray-100">
                  <Building2 className="w-4 h-4 text-[#8A2BE2]" />
                  <span>Beneficiary Bank Account</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500">Bank Name</span>
                    <span className="font-semibold text-gray-900">{activeFunding.deposit.bankName || 'Sandbox Bank'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 bg-gray-50 px-2.5 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Account Number</p>
                      <p className="font-mono text-sm font-bold text-gray-900 tracking-wider">
                        {activeFunding.deposit.accountNumber}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(activeFunding.deposit.accountNumber!, 'Account Number')}
                      className="h-8 px-2.5 text-xs text-[#8A2BE2] hover:bg-[#8A2BE2]/10"
                    >
                      {copiedField === 'Account Number' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedField === 'Account Number' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-semibold text-gray-900">{activeFunding.deposit.accountName || 'Switch Checkout'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 bg-gray-50 px-2.5 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Reference / Memo</p>
                      <p className="font-mono text-xs font-medium text-gray-800 truncate max-w-[200px]">
                        {activeFunding.reference}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(activeFunding.reference, 'Reference')}
                      className="h-8 px-2.5 text-xs text-[#8A2BE2] hover:bg-[#8A2BE2]/10"
                    >
                      {copiedField === 'Reference' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedField === 'Reference' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                {activeFunding.deposit.instructions && activeFunding.deposit.instructions.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 space-y-1">
                    {activeFunding.deposit.instructions.map((inst, idx) => (
                      <p key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#8A2BE2] font-bold">•</span>
                        <span>{inst}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
                className="w-full h-11 bg-[#8A2BE2] hover:bg-[#7823c9] text-white font-semibold flex items-center justify-center gap-2"
              >
                {isCheckingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Transfer Status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Check Deposit Status</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveFunding(null)}
                className="w-full h-10 text-xs text-gray-600 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Amount or Country</span>
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 1: QUOTE CONFIGURATION VIEW */
          <div className="space-y-5">
            {/* Country Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-500">Select Country</Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select Country" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {corridors.map((c) => (
                    <SelectItem key={c.country} value={c.country}>
                      {COUNTRY_NAMES[c.country] ? `${COUNTRY_NAMES[c.country]} (${c.country})` : c.country}
                      {c.currencies?.[0] ? ` — ${c.currencies[0]}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency & Amount Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-gray-500">
                Amount to Deposit ({selectedCurrency})
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setQuote(null);
                    setErrorMessage(null);
                  }}
                  placeholder="Enter amount"
                  className="h-11 pr-16 text-base font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {selectedCurrency}
                </span>
              </div>
              {currentCorridor?.channels && currentCorridor.channels.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Supported Rails: {currentCorridor.channels.join(', ')}
                </p>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Quote Breakdown Card */}
            {quote && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                  <div className="text-xs text-purple-700 font-medium flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                    <span>Guaranteed Rate</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-900">
                    1 USDC ≈ {quote.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {quote.source.currency}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-xs text-gray-500">You Pay</p>
                    <p className="text-sm font-bold text-gray-900">
                      {quote.source.amount.toLocaleString()} {quote.source.currency}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="text-right">
                    <p className="text-xs text-gray-500">You Receive</p>
                    <p className="text-base font-extrabold text-[#8A2BE2]">
                      {quote.destination.amount.toFixed(4)} USDC
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">on Solana</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200/60 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>Speed: <strong>{quote.settlement}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <ShieldCheck className="w-3 h-3 text-green-600" />
                    <span>Rail: <strong>{quote.channel}</strong></span>
                  </div>
                </div>

                {solanaAddress && (
                  <div className="pt-2 text-[10px] text-gray-500 font-mono truncate border-t border-purple-200/40">
                    Destination: {solanaAddress}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {!quote ? (
                <Button
                  type="button"
                  onClick={handleFetchQuote}
                  disabled={isLoadingQuote}
                  className="w-full h-11 bg-[#8A2BE2] hover:bg-[#7823c9] text-white font-semibold flex items-center justify-center gap-2"
                >
                  {isLoadingQuote ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Calculating Rate...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Guaranteed Quote</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleInitiateFunding}
                  disabled={isInitiating}
                  className="w-full h-11 bg-[#8A2BE2] hover:bg-[#7823c9] text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Payment Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
