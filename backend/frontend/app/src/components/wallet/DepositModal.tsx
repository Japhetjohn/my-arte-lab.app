import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Bitcoin, Building2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/contexts/AuthContext';
import { SuccessModal } from '@/components/modals/SuccessModal';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [activeTab, setActiveTab] = useState('crypto');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Crypto deposit state
  const [cryptoAddress, setCryptoAddress] = useState<CryptoAddress | null>(null);

  // Fiat deposit state
  const [fiatChannel, setFiatChannel] = useState<FiatChannel | null>(null);
  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('NGN');

  // Fetch existing crypto address when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'crypto' && !cryptoAddress) {
      fetchCryptoAddress();
    }
  }, [isOpen, activeTab]);

  const fetchCryptoAddress = async () => {
    setIsLoading(true);
    try {
      // Try to get existing addresses first
      const response = await api.get('/hostfi/collections/crypto/addresses');
      const addresses = response.data?.addresses || [];
      
      // Find USDC on Solana address
      const usdcAddress = addresses.find(
        (addr: any) => addr.currency === 'USDC' && addr.network === 'SOL'
      );

      if (usdcAddress) {
        setCryptoAddress({
          address: usdcAddress.address,
          network: 'Solana',
          currency: 'USDC',
          instructions: 'Send only USDC on Solana network to this address.',
        });
      } else {
        // Create new address if none exists
        const createResponse = await api.post('/hostfi/collections/crypto/address');
        const newAddress = createResponse.data?.address;
        if (newAddress) {
          setCryptoAddress({
            address: newAddress.address,
            network: newAddress.network || 'Solana',
            currency: newAddress.currency || 'USDC',
            instructions: newAddress.instructions || 'Send only USDC on Solana network to this address.',
          });
        }
      }
    } catch (error: any) {
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
      
      const channel = response.data?.channel;
      if (channel) {
        setFiatChannel({
          bankName: channel.bankName,
          accountNumber: channel.accountNumber,
          accountName: channel.accountName,
          reference: channel.reference,
          currency: channel.currency,
        });
        toast.success('Bank account generated!');
      }
    } catch (error: any) {
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

  const handleClose = () => {
    setCryptoAddress(null);
    setFiatChannel(null);
    setFiatAmount('');
    setShowSuccess(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
          </DialogHeader>

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
              ) : !cryptoAddress ? (
                <div className="text-center py-6">
                  <img
                    src="/images/crypto-deposit.png"
                    alt="Crypto Deposit"
                    className="w-24 h-24 mx-auto mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
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
              ) : (
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
                      {/* QR Code display */}
                      <div className="w-40 h-40 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <Bitcoin className="w-16 h-16 text-[#8A2BE2] mx-auto" />
                          <p className="text-xs text-gray-500 mt-2">Scan to copy</p>
                        </div>
                      </div>
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
                        onClick={() =>
                          copyToClipboard(cryptoAddress.address, 'Address')
                        }
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

                  {cryptoAddress.instructions && (
                    <p className="text-xs text-gray-500 text-center">
                      {cryptoAddress.instructions}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Fiat Deposit */}
            <TabsContent value="fiat" className="space-y-4">
              {!fiatChannel ? (
                <div className="space-y-4">
                  <img
                    src="/images/bank-transfer.png"
                    alt="Bank Transfer"
                    className="w-24 h-24 mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />

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
                      Use the reference number when making the transfer.
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
                          onClick={() =>
                            copyToClipboard(fiatChannel.bankName, 'Bank')
                          }
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
                          onClick={() =>
                            copyToClipboard(fiatChannel.accountNumber, 'Account')
                          }
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

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Reference (Important!)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={fiatChannel.reference}
                          readOnly
                          className="font-mono bg-yellow-50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            copyToClipboard(fiatChannel.reference, 'Reference')
                          }
                        >
                          {copied === 'Reference' ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
                    <p className="font-medium mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy the account details above</li>
                      <li>Make a transfer from your bank app</li>
                      <li>Include the reference number in the transfer description</li>
                      <li>Your wallet will be credited automatically</li>
                    </ol>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleClose}
        title="Deposit Initiated!"
        message="Your deposit has been initiated. Funds will appear in your wallet once confirmed."
        actionLabel="Done"
        onAction={handleClose}
      />
    </>
  );
}
