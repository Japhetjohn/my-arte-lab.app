import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from '@/components/shared/WalletCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { DepositModal } from '@/components/wallet/DepositModal';
import { WithdrawalModal } from '@/components/wallet/WithdrawalModal';
import { useWallet } from '@/hooks/useWallet';
import { ArrowDownLeft, ArrowUpRight, Loader2, Wallet as WalletIcon } from 'lucide-react';
import type { Transaction } from '@/types';
import { toast } from 'sonner';

export function Wallet() {
  const {
    assets,
    transactions,
    isLoading,
    error,
    totalBalanceUSD,

    fetchWallet,
    fetchTransactions,
  } = useWallet();

  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const renderTransaction = (transaction: Transaction) => (
    <div
      key={transaction.id}
      className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            transaction.type === 'deposit' || transaction.type === 'earning'
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}
        >
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
        <p
          className={`font-semibold ${
            transaction.type === 'deposit' || transaction.type === 'earning'
              ? 'text-green-600'
              : 'text-red-600'
          }`}
        >
          {transaction.type === 'deposit' || transaction.type === 'earning'
            ? '+'
            : ''}
          {Math.abs(transaction.amount).toLocaleString()} {transaction.currency}
        </p>
        <p className="text-xs text-gray-400 capitalize">{transaction.status}</p>
      </div>
    </div>
  );

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#8A2BE2]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>

      <WalletCard
        balance={totalBalanceUSD}
        currency="USDC"
        onAddFunds={() => setAddFundsOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
      />

      {/* Assets Overview */}
      {assets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#8A2BE2]/10 rounded-full flex items-center justify-center">
                      <WalletIcon className="w-5 h-5 text-[#8A2BE2]" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {asset.currency}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${asset.usdEquivalent?.toLocaleString() || '0.00'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {asset.balance?.toLocaleString() || '0.00'}
                    </p>
                    <p className="text-xs text-gray-400">{asset.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {transactions.length > 0 ? (
                transactions.map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No transactions yet"
                  description="Your transaction history will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              {transactions.filter((t) => t.type === 'deposit').length > 0 ? (
                transactions
                  .filter((t) => t.type === 'deposit')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No deposits yet"
                  description="Your deposits will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {transactions.filter((t) => t.type === 'payment').length > 0 ? (
                transactions
                  .filter((t) => t.type === 'payment')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No payments yet"
                  description="Your payments will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-4">
              {transactions.filter((t) => t.type === 'withdrawal').length >
              0 ? (
                transactions
                  .filter((t) => t.type === 'withdrawal')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No withdrawals yet"
                  description="Your withdrawals will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Deposit Modal */}
      <DepositModal isOpen={addFundsOpen} onClose={() => setAddFundsOpen(false)} />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={totalBalanceUSD}
        currency="USDC"
      />
    </div>
  );
}
