import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WalletCard } from '@/components/ui-custom/WalletCard';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { wallet as mockWallet } from '@/lib/data/mockData';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Bitcoin, Building2 } from 'lucide-react';
import type { Transaction } from '@/types';

export function Wallet() {
  const [wallet] = useState(mockWallet);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'crypto'>('bank');
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAddFunds = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setAddFundsOpen(false);
      setAmount('');
    }, 2000);
  };

  const handleWithdraw = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setWithdrawOpen(false);
      setAmount('');
    }, 2000);
  };

  const renderTransaction = (transaction: Transaction) => (
    <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          transaction.type === 'deposit' || transaction.type === 'earning'
            ? 'bg-green-100 text-green-600'
            : 'bg-red-100 text-red-600'
        }`}>
          {transaction.type === 'deposit' || transaction.type === 'earning' ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : (
            <ArrowUpRight className="w-5 h-5" />
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{transaction.description}</p>
          <p className="text-sm text-gray-500">
            {new Date(transaction.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${
          transaction.type === 'deposit' || transaction.type === 'earning'
            ? 'text-green-600'
            : 'text-red-600'
        }`}>
          {transaction.type === 'deposit' || transaction.type === 'earning' ? '+' : ''}
          ${Math.abs(transaction.amount).toFixed(2)}
        </p>
        <p className="text-xs text-gray-400 capitalize">{transaction.type}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>

      <WalletCard
        balance={wallet.balance}
        currency={wallet.currency}
        onAddFunds={() => setAddFundsOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {wallet.transactions.length > 0 ? (
                wallet.transactions.map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No transactions yet"
                  description="Your transaction history will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              {wallet.transactions.filter(t => t.type === 'deposit').length > 0 ? (
                wallet.transactions.filter(t => t.type === 'deposit').map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No deposits yet"
                  description="Your deposits will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {wallet.transactions.filter(t => t.type === 'payment').length > 0 ? (
                wallet.transactions.filter(t => t.type === 'payment').map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No payments yet"
                  description="Your payments will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="earnings" className="mt-4">
              {wallet.transactions.filter(t => t.type === 'earning').length > 0 ? (
                wallet.transactions.filter(t => t.type === 'earning').map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No earnings yet"
                  description="Your earnings will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Funds Dialog */}
      <Dialog open={addFundsOpen} onOpenChange={setAddFundsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
          </DialogHeader>
          {success ? (
            <div className="py-8 text-center">
              <img src="/images/payment-success.png" alt="Success" className="w-24 h-24 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
              <p className="text-gray-500">Funds have been added to your wallet</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className={`flex-1 ${paymentMethod === 'card' ? 'bg-[#8A2BE2]' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Card
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'crypto' ? 'default' : 'outline'}
                  className={`flex-1 ${paymentMethod === 'crypto' ? 'bg-[#8A2BE2]' : ''}`}
                  onClick={() => setPaymentMethod('crypto')}
                >
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Crypto
                </Button>
              </div>
              <div>
                <Label htmlFor="amount">Amount (USDC)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button 
                className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={handleAddFunds}
                disabled={!amount}
              >
                Add Funds
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
          </DialogHeader>
          {success ? (
            <div className="py-8 text-center">
              <img src="/images/success.png" alt="Success" className="w-24 h-24 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Withdrawal Initiated!</h3>
              <p className="text-gray-500">Your funds will be transferred shortly</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={withdrawMethod === 'bank' ? 'default' : 'outline'}
                  className={`flex-1 ${withdrawMethod === 'bank' ? 'bg-[#8A2BE2]' : ''}`}
                  onClick={() => setWithdrawMethod('bank')}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Bank
                </Button>
                <Button
                  type="button"
                  variant={withdrawMethod === 'crypto' ? 'default' : 'outline'}
                  className={`flex-1 ${withdrawMethod === 'crypto' ? 'bg-[#8A2BE2]' : ''}`}
                  onClick={() => setWithdrawMethod('crypto')}
                >
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Crypto
                </Button>
              </div>
              <div>
                <Label htmlFor="withdraw-amount">Amount (USDC)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500">
                Available: ${wallet.balance.toFixed(2)} USDC
              </p>
              <Button 
                className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) > wallet.balance}
              >
                Withdraw
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
