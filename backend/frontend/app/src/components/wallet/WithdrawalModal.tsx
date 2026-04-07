import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Bitcoin,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/contexts/AuthContext';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  currency?: string;
}

type Step = 'method' | 'bank' | 'crypto' | 'amount' | 'confirm';

interface Bank {
  id: string;
  name: string;
  code: string;
}

// Bank Select Component
interface BankSelectProps {
  banks: Bank[];
  selectedBank: Bank | null;
  onSelect: (bank: Bank) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function BankSelect({ banks, selectedBank, onSelect, searchValue, onSearchChange, isOpen, onToggle }: BankSelectProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  // Split banks into popular and others based on the sorted list
  const popularBanks = filteredBanks.slice(0, 15);
  const otherBanks = filteredBanks.slice(15);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label>Select Bank *</Label>
      
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#8A2BE2] focus:border-[#8A2BE2] flex items-center justify-between text-left hover:border-gray-400 transition-colors"
      >
        <span className={selectedBank ? 'text-gray-900 font-medium' : 'text-gray-500'}>
          {selectedBank ? selectedBank.name : 'Select a bank'}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="relative z-50">
          <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search banks..."
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 pr-8"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Banks List */}
            <div className="overflow-y-auto max-h-64">
              {banks.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No banks found
                </div>
              ) : (
                <>
                  {/* Popular Banks Section */}
                  {!searchValue && popularBanks.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Popular Banks
                      </div>
                      {popularBanks.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => onSelect(bank)}
                          className="w-full px-4 py-3 text-left hover:bg-[#8A2BE2]/5 hover:text-[#8A2BE2] transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium">{bank.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Other Banks Section */}
                  {!searchValue && otherBanks.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t">
                        Other Banks
                      </div>
                      {otherBanks.map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => onSelect(bank)}
                          className="w-full px-4 py-3 text-left hover:bg-[#8A2BE2]/5 hover:text-[#8A2BE2] transition-colors border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium">{bank.name}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Search Results */}
                  {searchValue && banks.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => onSelect(bank)}
                      className="w-full px-4 py-3 text-left hover:bg-[#8A2BE2]/5 hover:text-[#8A2BE2] transition-colors border-b border-gray-50 last:border-0"
                    >
                      <span className="font-medium">{bank.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance,
  currency = 'USDC',
}: WithdrawalModalProps) {
  const [step, setStep] = useState<Step>('method');
  const [isLoading, setIsLoading] = useState(false);
  
  // Bank withdrawal state
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [bankId, setBankId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);

  // Crypto state
  const [walletAddress, setWalletAddress] = useState('');

  // Amount state
  const [amount, setAmount] = useState('');

  // Top 10 Nigerian banks to show first
  const topBanks = useMemo(() => [
    'Access Bank',
    'First Bank of Nigeria',
    'Guaranty Trust Bank',
    'United Bank for Africa',
    'Zenith Bank',
    'Fidelity Bank',
    'Union Bank',
    'Stanbic IBTC Bank',
    'Sterling Bank',
    'Polaris Bank',
    'Wema Bank',
    'Ecobank Nigeria',
    'First City Monument Bank',
    'Heritage Bank',
    'Keystone Bank',
    'Unity Bank',
    'Globus Bank',
    'Parallex Bank',
    'Premium Trust Bank',
    'Providus Bank',
    'Signature Bank',
    'SunTrust Bank',
    'Titan Trust Bank',
    'Jaiz Bank',
    'Lotus Bank',
    'Norrenberger Bank',
  ], []);

  // Sort banks with top banks first
  const sortedBanks = useMemo(() => {
    if (!banks.length) return [];
    
    const topBankIds = new Set<string>();
    const otherBanks: Bank[] = [];
    
    // Find matching top banks
    const foundTopBanks: Bank[] = [];
    topBanks.forEach(topName => {
      const match = banks.find(b => 
        b.name.toLowerCase().includes(topName.toLowerCase()) ||
        topName.toLowerCase().includes(b.name.toLowerCase())
      );
      if (match && !topBankIds.has(match.id)) {
        foundTopBanks.push(match);
        topBankIds.add(match.id);
      }
    });
    
    // Add remaining banks
    banks.forEach(bank => {
      if (!topBankIds.has(bank.id)) {
        otherBanks.push(bank);
      }
    });
    
    return [...foundTopBanks, ...otherBanks];
  }, [banks, topBanks]);

  // Filter banks based on search
  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return sortedBanks;
    const search = bankSearch.toLowerCase();
    return sortedBanks.filter(b => b.name.toLowerCase().includes(search));
  }, [sortedBanks, bankSearch]);

  // Fetch banks when entering bank step
  useEffect(() => {
    if (step === 'bank' && banks.length === 0) {
      loadBanks();
    }
  }, [step]);

  const loadBanks = async () => {
    setBanksLoading(true);
    setBanksError('');
    try {
      const response = await api.get('/hostfi/banks/NG');
      let banksList = [];
      
      if (response.data?.data?.banks && Array.isArray(response.data.data.banks)) {
        banksList = response.data.data.banks;
      } else if (response.data?.banks && Array.isArray(response.data.banks)) {
        banksList = response.data.banks;
      } else if (Array.isArray(response.data)) {
        banksList = response.data;
      }
      
      setBanks(banksList);
      
      if (banksList.length === 0) {
        setBanksError('No banks available. Please try again later.');
      }
    } catch (error: any) {
      setBanksError(error.response?.data?.message || 'Failed to load banks. Please try again.');
      toast.error('Failed to load banks');
    } finally {
      setBanksLoading(false);
    }
  };

  // Verify account when bank and account number are entered
  useEffect(() => {
    const verify = async () => {
      if (bankId && accountNumber.length === 10 && !accountName && !isVerifying) {
        setIsVerifying(true);
        try {
          const response = await api.post('/hostfi/withdrawal/verify-account', {
            country: 'NG',
            bankId,
            accountNumber,
          });
          
          const accountInfo = response.data?.data?.account || response.data?.account;
          if (accountInfo?.accountName) {
            setAccountName(accountInfo.accountName);
            toast.success('Account verified!');
          }
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to verify account');
          setAccountName('');
        } finally {
          setIsVerifying(false);
        }
      }
    };
    
    const timeout = setTimeout(verify, 800);
    return () => clearTimeout(timeout);
  }, [bankId, accountNumber]);

  const handleBankNext = () => {
    if (!bankId || !accountNumber) {
      toast.error('Please select bank and enter account number');
      return;
    }
    if (!accountName) {
      toast.error('Please wait for account verification');
      return;
    }
    setStep('amount');
  };

  const handleCryptoNext = () => {
    if (!walletAddress || walletAddress.length < 32) {
      toast.error('Please enter a valid Solana wallet address');
      return;
    }
    setStep('amount');
  };

  const handleMaxAmount = () => {
    setAmount(availableBalance.toString());
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
    if (numAmount < 1) {
      toast.error(`Minimum withdrawal is 1 ${currency}`);
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const payload: any = {
        amount: parseFloat(amount),
        currency,
      };

      if (bankId) {
        payload.methodId = 'BANK_TRANSFER';
        payload.recipient = {
          bankId,
          accountNumber,
          accountName,
          bankName,
          country: 'NG',
          type: 'BANK',
        };
      } else {
        payload.methodId = 'CRYPTO';
        payload.recipient = {
          walletAddress,
          address: walletAddress,
          type: 'CRYPTO',
          network: 'SOL',
        };
      }

      await api.post('/hostfi/withdrawal/initiate', payload);
      
      toast.success('Withdrawal initiated successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('method');
    setBankId('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setBankSearch('');
    setWalletAddress('');
    setAmount('');
    setBanksError('');
    onClose();
  };

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Choose how you want to withdraw your funds</p>
      <div className="space-y-3">
        <button
          onClick={() => setStep('bank')}
          className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#8A2BE2] hover:bg-[#8A2BE2]/5 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-[#8A2BE2]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Bank Transfer</p>
              <p className="text-sm text-gray-500">Withdraw to your Nigerian bank account</p>
              <p className="text-xs text-green-600 mt-1 font-medium">No fee • Min: 1 USDC</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>

        <button
          onClick={() => setStep('crypto')}
          className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#8A2BE2] hover:bg-[#8A2BE2]/5 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Bitcoin className="w-6 h-6 text-[#8A2BE2]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Crypto (Solana USDC)</p>
              <p className="text-sm text-gray-500">Withdraw to Solana wallet</p>
              <p className="text-xs text-green-600 mt-1 font-medium">No fee • Min: 1 USDC</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );

  const renderBankForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('method')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <span className="font-semibold">Bank Transfer</span>
      </div>

      {banksLoading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2] mb-2" />
          <p className="text-sm text-gray-500">Loading banks...</p>
        </div>
      ) : banksError ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{banksError}</p>
              <Button variant="outline" size="sm" onClick={loadBanks} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Bank Select Dropdown */}
          <BankSelect
            banks={filteredBanks}
            selectedBank={banks.find(b => b.id === bankId) || null}
            onSelect={(bank) => {
              setBankId(bank.id);
              setBankName(bank.name);
              setAccountName('');
              setBankSearch('');
            }}
            searchValue={bankSearch}
            onSearchChange={setBankSearch}
            isOpen={isBankDropdownOpen}
            onToggle={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
          />

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number *</Label>
            <Input
              id="accountNumber"
              type="text"
              placeholder="Enter 10 digit account number"
              value={accountNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setAccountNumber(value);
                if (value.length !== 10) setAccountName('');
              }}
              maxLength={10}
              className="py-2.5"
            />
          </div>

          {isVerifying && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying account...
            </div>
          )}

          {accountName && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">Account Name:</span> {accountName}
              </p>
            </div>
          )}

          <Button
            onClick={handleBankNext}
            disabled={!bankId || !accountNumber || !accountName}
            className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white py-2.5 mt-4"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </>
      )}
    </div>
  );

  const renderCryptoForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('method')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <span className="font-semibold">Crypto Withdrawal</span>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <span className="font-medium">Important:</span> Only Solana (SOL) wallet addresses are supported. 
          Make sure your wallet supports USDC on Solana.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="walletAddress">Solana Wallet Address *</Label>
        <Input
          id="walletAddress"
          placeholder="Enter Solana address (e.g., 7xKXtg2...)"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="py-2.5 font-mono text-sm"
        />
      </div>

      <Button
        onClick={handleCryptoNext}
        disabled={!walletAddress || walletAddress.length < 32}
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white py-2.5 mt-4"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderAmountForm = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setStep(bankId ? 'bank' : 'crypto')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <span className="font-semibold">Enter Amount</span>
      </div>

      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-500">Available Balance</p>
        <p className="text-2xl font-bold text-gray-900">
          {availableBalance.toLocaleString()} {currency}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount to Withdraw *</Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="py-2.5 pr-20"
            min="1"
            max={availableBalance}
            step="0.01"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMaxAmount}
              className="h-7 text-xs bg-[#8A2BE2]/10 text-[#8A2BE2] hover:bg-[#8A2BE2]/20 px-2"
            >
              MAX
            </Button>
            <span className="text-gray-500 font-medium text-sm">{currency}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Min: 1 {currency} • Max: {availableBalance.toLocaleString()} {currency}
        </p>
      </div>

      {amount && parseFloat(amount) > 0 && (
        <div className="p-4 border border-gray-200 rounded-xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span>{parseFloat(amount).toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Fee</span>
            <span className="text-green-600 font-medium">FREE</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>You Receive</span>
            <span className="text-[#8A2BE2]">{parseFloat(amount).toLocaleString()} {currency}</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleAmountNext}
        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance || parseFloat(amount) < 1}
        className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white py-2.5 mt-4"
      >
        Review
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderConfirmation = () => {
    const numAmount = parseFloat(amount);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('amount')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <span className="font-semibold">Confirm Withdrawal</span>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Method</span>
            <span className="font-medium">{bankId ? 'Bank Transfer' : 'Crypto (Solana)'}</span>
          </div>

          {bankId ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium">{bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Account Name</span>
                <span className="font-medium">{accountName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Account Number</span>
                <span className="font-medium">{accountNumber}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Wallet Address</span>
              <span className="font-medium font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
              </span>
            </div>
          )}

          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-medium">{numAmount.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fee</span>
              <span className="text-green-600 font-medium">FREE</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total to Receive</span>
              <span className="text-[#8A2BE2]">{numAmount.toLocaleString()} {currency}</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Please verify all details. Withdrawals cannot be reversed once processed.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white py-2.5"
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'method' && 'Withdraw Funds'}
            {step === 'bank' && 'Bank Transfer'}
            {step === 'crypto' && 'Crypto Withdrawal'}
            {step === 'amount' && 'Enter Amount'}
            {step === 'confirm' && 'Confirm'}
          </DialogTitle>
        </DialogHeader>

        {step === 'method' && renderMethodSelection()}
        {step === 'bank' && renderBankForm()}
        {step === 'crypto' && renderCryptoForm()}
        {step === 'amount' && renderAmountForm()}
        {step === 'confirm' && renderConfirmation()}
      </DialogContent>
    </Dialog>
  );
}
