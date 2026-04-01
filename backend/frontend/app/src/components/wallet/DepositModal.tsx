import { useState } from 'react';
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
}

interface FiatChannel {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
  expiresAt: string;
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

  const handleGetCryptoAddress = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/hostfi/collections/crypto/address');
      setCryptoAddress(response.data);
      toast.success('Deposit address generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate address');
      // Mock data for demo
      setCryptoAddress({
        address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'Solana',
        currency: 'USDC',
      });
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
      setFiatChannel(response.data);
      toast.success('Bank account generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate account');
      // Mock data for demo
      setFiatChannel({
        bankName: 'Wema Bank',
        accountNumber: '1234567890',
        accountName: 'MyArtelab - John Doe',
        reference: 'MYA123456789',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
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
              {!cryptoAddress ? (
                <div className="text-center py-6">
                  <img
                    src="/images/crypto-deposit.png"
                    alt="Crypto Deposit"
                    className="w-24 h-24 mx-auto mb-4"
                  />
                  <p className="text-sm text-gray-500 mb-4">
                    Generate a Solana USDC address to deposit funds
                  </p>
                  <Button
                    onClick={handleGetCryptoAddress}
                    disabled={isLoading}
                    className="bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Bitcoin className="w-4 h-4 mr-2" />
                    )}
                    Generate Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Important:</p>
                        <p>Send only USDC on Solana network. Other tokens may be lost.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-4 bg-white border rounded-lg">
                      {/* QR Code placeholder */}
                      <div className="w-40 h-40 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="grid grid-cols-5 gap-1 w-32 h-32">
                            {Array.from({ length: 25 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-full aspect-square ${
                                  Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'
                                }`}
                              />
                            ))}
                          </div>
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

                  <div className="text-xs text-gray-500 text-center">
                    Network: {cryptoAddress.network} • Currency:{' '}
                    {cryptoAddress.currency}
                  </div>
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
                  />

                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="flex gap-2">
                      <select
                        value={fiatCurrency}
                        onChange={(e) => setFiatCurrency(e.target.value)}
                        className="px-3 py-2 border rounded-lg bg-white"
                      >
                        <option value="NGN">NGN</option>
                        <option value="USD">USD</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                      />
                    </div>
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
                    Generate Account
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    A unique bank account will be generated for your deposit
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Note:</span> This account expires in 24 hours.
                      Transfer exactly the amount you specified.
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
                      <Label className="text-xs text-gray-500">Reference</Label>
                      <div className="flex gap-2">
                        <Input
                          value={fiatChannel.reference}
                          readOnly
                          className="font-mono"
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

                  <div className="text-xs text-gray-500">
                    Expires: {new Date(fiatChannel.expiresAt).toLocaleString()}
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
