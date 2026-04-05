import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from '@/components/shared/WalletCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { DepositModal } from '@/components/wallet/DepositModal';
import { WithdrawalModal } from '@/components/wallet/WithdrawalModal';
import { useWallet } from '@/hooks/useWallet';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import type { Transaction } from '@/types';
import { toast } from 'sonner';

export function Wallet() {
  const {
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

  // Filter to only show USDC transactions
  const usdcTransactions = transactions.filter(
    (t) => t.currency === 'USDC' || t.currency === 'USD'
  );

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
          {Math.abs(transaction.amount).toLocaleString()} USDC
        </p>
        <p className="text-xs text-gray-400 capitalize">{transaction.status}</p>
      </div>
    </div>
  );

  if (isLoading) {
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
              {usdcTransactions.length > 0 ? (
                usdcTransactions.map(renderTransaction)
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No transactions yet"
                  description="Your USDC transaction history will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              {usdcTransactions.filter((t) => t.type === 'deposit').length > 0 ? (
                usdcTransactions
                  .filter((t) => t.type === 'deposit')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No deposits yet"
                  description="Your USDC deposits will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {usdcTransactions.filter((t) => t.type === 'payment').length > 0 ? (
                usdcTransactions
                  .filter((t) => t.type === 'payment')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No payments yet"
                  description="Your USDC payments will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-4">
              {usdcTransactions.filter((t) => t.type === 'withdrawal').length >
              0 ? (
                usdcTransactions
                  .filter((t) => t.type === 'withdrawal')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No withdrawals yet"
                  description="Your USDC withdrawals will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Deposit Modal */}
      <DepositModal 
        isOpen={addFundsOpen} 
        onClose={() => setAddFundsOpen(false)} 
        onDepositComplete={async () => {
          await fetchWallet();
          await fetchTransactions();
        }}
      />

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
