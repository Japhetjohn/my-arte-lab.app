import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Bitcoin, Building2, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/contexts/AuthContext';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositComplete?: () => void;
}

interface CryptoAddress {
  address: string;
  network: string;
  currency: string;
  instructions?: string;
}

interface FiatChannel {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  currency: string;
}

export function DepositModal({ isOpen, onClose, onDepositComplete }: DepositModalProps) {
  const [activeTab, setActiveTab] = useState('crypto');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Crypto deposit state
  const [cryptoAddress, setCryptoAddress] = useState<CryptoAddress | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Fiat deposit state
  const [fiatChannel, setFiatChannel] = useState<FiatChannel | null>(null);
  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('NGN');

  // Fetch existing crypto address when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'crypto') {
      // First check if user already has a stored address
      fetchExistingWalletAddress();
    }
  }, [isOpen, activeTab]);

  const fetchExistingWalletAddress = async () => {
    setIsLoading(true);
    try {
      // Get wallet info which includes the stored address
      const response = await api.get('/hostfi/wallet');
      const walletData = response.data?.data?.wallet;
      
      if (walletData?.address) {
        // Use existing stored address
        setCryptoAddress({
          address: walletData.address,
          network: walletData.network || 'Solana',
          currency: 'USDC',
          instructions: 'Send only USDC on Solana network to this address. Your wallet will be credited automatically.',
        });
        // Fetch QR code for the address directly with parameter to avoid 404 cache
        await fetchQRCode(walletData.address);
      } else {
        // No stored address, create new one
        await fetchCryptoAddress();
      }
    } catch (error) {
      // Fallback to creating new address
      await fetchCryptoAddress();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQRCode = async (addressStr?: string) => {
    try {
      const url = addressStr ? `/hostfi/wallet/qr-code?address=${addressStr}` : '/hostfi/wallet/qr-code';
      const response = await api.get(url);
      const qrCodeData = response.data?.data?.qrCode;
      if (qrCodeData) {
        setQrCode(qrCodeData);
      }
    } catch (error: any) {
      // 404 means no deposit address yet - this is normal, don't log error
      if (error.response?.status === 404) {
        // No deposit address yet - QR code will be fetched after address creation
        setQrCode(null);
      } else {
        // Other errors - log but don't block UI
        console.warn('QR code fetch failed:', error.response?.data?.message || 'Unknown error');
      }
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCryptoAddress(null);
      setQrCode(null);
      setFiatChannel(null);
      setFiatAmount('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  const fetchCryptoAddress = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/hostfi/collections/crypto/address');
      // Crypto address fetched
      
      const addressData = response.data?.data?.address;
      
      if (addressData) {
        setCryptoAddress({
          address: addressData.address,
          network: addressData.network || 'Solana',
          currency: addressData.currency || 'USDC',
          instructions: addressData.instructions || 'Send only USDC on Solana network to this address.',
        });
        // Fetch QR code after successfully creating address
        try {
          const qrResponse = await api.get(`/hostfi/wallet/qr-code?address=${addressData.address}`);
          const qrCodeData = qrResponse.data?.data?.qrCode;
          if (qrCodeData) {
            setQrCode(qrCodeData);
          }
        } catch (qrError) {
          // QR code fetch failed but address was created - not critical
          console.warn('Could not fetch QR code after address creation');
        }
      } else {
        toast.error('Invalid response from server');
      }
    } catch (error: any) {
      // Error handled by UI
      toast.error(error.response?.data?.message || 'Failed to get deposit address');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetFiatChannel = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/hostfi/collections/fiat/channel', {
        currency: fiatCurrency,
        amount: parseFloat(fiatAmount),
      });
      
      // Fiat channel fetched
      
      const channel = response.data?.data?.channel;
      
      if (channel) {
        setFiatChannel({
          bankName: channel.bankName,
          accountNumber: channel.accountNumber,
          accountName: channel.accountName,
          reference: channel.reference,
          currency: channel.currency,
        });
        toast.success('Bank account generated!');
      } else {
        toast.error('Invalid response from server');
      }
    } catch (error: any) {
      // Error handled by UI
      toast.error(error.response?.data?.message || 'Failed to generate account');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handlePaidClick = useCallback(async () => {
    // Show success toast with image
    toast.success(
      <div className="flex items-center gap-3">
        <img src="/images/payment-success.png" alt="Success" className="w-12 h-12 rounded-full" />
        <div>
          <p className="font-semibold">Deposit submitted!</p>
          <p className="text-xs text-gray-500">Your wallet will be credited shortly</p>
        </div>
      </div>,
      { duration: 4000 }
    );
    
    // Close modal immediately
    handleClose();
    
    // Trigger wallet refresh in background
    if (onDepositComplete) {
      onDepositComplete();
    }
  }, [onDepositComplete]);

  const handleClose = () => {
    setCryptoAddress(null);
    setFiatChannel(null);
    setFiatAmount('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>
            Deposit funds to your wallet using crypto or bank transfer.
          </DialogDescription>
        </DialogHeader>

        {isProcessing ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Processing Deposit</h3>
            <p className="text-sm text-gray-500">
              We&apos;re confirming your deposit. This usually takes 1-5 minutes.
              Please don&apos;t close this window.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking for funds...
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="crypto">
                <Bitcoin className="w-4 h-4 mr-2" />
                Crypto
              </TabsTrigger>
              <TabsTrigger value="fiat">
                <Building2 className="w-4 h-4 mr-2" />
                Bank Transfer
              </TabsTrigger>
            </TabsList>

            {/* Crypto Deposit */}
            <TabsContent value="crypto" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2] mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Generating your Solana USDC address...</p>
                </div>
              ) : cryptoAddress ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Important:</p>
                        <p>Send only USDC on Solana network. Sending other tokens may result in permanent loss.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-4 bg-white border rounded-lg">
                      {qrCode ? (
                        <img 
                          src={qrCode} 
                          alt="Deposit QR Code" 
                          className="w-40 h-40 object-contain"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-gray-100 flex items-center justify-center">
                          <div className="text-center">
                            <Bitcoin className="w-16 h-16 text-[#8A2BE2] mx-auto" />
                            <p className="text-xs text-gray-500 mt-2">USDC on Solana</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        value={cryptoAddress.address}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(cryptoAddress.address, 'Address')}
                      >
                        {copied === 'Address' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center space-y-1">
                    <p>Network: <span className="font-medium">{cryptoAddress.network}</span></p>
                    <p>Currency: <span className="font-medium">{cryptoAddress.currency}</span></p>
                  </div>

                  <Button
                    onClick={handlePaidClick}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    I&apos;ve Made the Transfer
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bitcoin className="w-12 h-12 text-[#8A2BE2]" />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Get your unique Solana USDC address for deposits
                  </p>
                  <Button
                    onClick={fetchCryptoAddress}
                    disabled={isLoading}
                    className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Bitcoin className="w-4 h-4 mr-2" />
                    )}
                    Get Deposit Address
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Fiat Deposit */}
            <TabsContent value="fiat" className="space-y-4">
              {!fiatChannel ? (
                <div className="space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Building2 className="w-12 h-12 text-[#8A2BE2]" />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Currency</Label>
                    <select
                      value={fiatCurrency}
                      onChange={(e) => setFiatCurrency(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      <option value="NGN">🇳🇬 NGN (Nigerian Naira)</option>
                      <option value="KES">🇰🇪 KES (Kenyan Shilling)</option>
                      <option value="GHS">🇬🇭 GHS (Ghanaian Cedi)</option>
                      <option value="ZAR">🇿🇦 ZAR (South African Rand)</option>
                      <option value="USD">🇺🇸 USD (US Dollar)</option>
                      <option value="EUR">🇪🇺 EUR (Euro)</option>
                      <option value="GBP">🇬🇧 GBP (British Pound)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={fiatAmount}
                      onChange={(e) => setFiatAmount(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Minimum: {fiatCurrency === 'NGN' ? '₦1,000' : fiatCurrency === 'KES' ? 'KSh 100' : fiatCurrency === 'GHS' ? 'GH₵ 10' : '$1'}
                    </p>
                  </div>

                  <Button
                    onClick={handleGetFiatChannel}
                    disabled={isLoading || !fiatAmount}
                    className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Building2 className="w-4 h-4 mr-2" />
                    )}
                    Generate Bank Account
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    A unique bank account will be generated for your deposit.
                    Funds will be credited to your wallet instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Note:</span> Transfer exactly the amount you specified. 
                      Your wallet will be credited automatically.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Bank Name</Label>
                      <div className="flex gap-2">
                        <Input value={fiatChannel.bankName} readOnly />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(fiatChannel.bankName, 'Bank')}
                        >
                          {copied === 'Bank' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Account Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={fiatChannel.accountNumber}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(fiatChannel.accountNumber, 'Account')}
                        >
                          {copied === 'Account' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Account Name</Label>
                      <Input value={fiatChannel.accountName} readOnly />
                    </div>
                  </div>

                  <Button
                    onClick={handlePaidClick}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    I&apos;ve Made the Transfer
                  </Button>

                  <div className="p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                    <p className="font-medium mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the account details above</li>
                      <li>Make a transfer from your bank app</li>
                      <li>Click &quot;I&apos;ve Made the Transfer&quot; when done</li>
                      <li>Your wallet will be credited automatically</li>
                    </ol>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
