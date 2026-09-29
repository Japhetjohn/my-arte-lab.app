import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from '@/components/shared/WalletCard';
import { AddFundsModal } from '@/components/wallet/AddFundsModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import type { Transaction } from '@/types';
import { toast } from 'sonner';

export function Wallet() {
  const {
    transactions,
    isLoading,
    error,
    totalBalanceUSD,
    availableBalance,
    pendingWithdrawal,
    escrowBalance,
    incomingEarnings,
    solanaAddress,
    fetchWallet,
    fetchTransactions,
  } = useWallet();
  
  // Get user role from auth context
  const { user } = useAuth();
  const userRole = user?.role || 'client';
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Filter to only show USDC transactions, exclude internal platform_fee transactions
  const usdcTransactions = transactions.filter(
    (t) => (t.currency === 'USDC' || t.currency === 'USD') && (t.type as string) !== 'platform_fee'
  );

  const renderTransaction = (transaction: Transaction) => {
    const txId = transaction.id || transaction._id || 'tx';
    const isCredit = transaction.type === 'deposit' || transaction.type === 'earning' || transaction.type === 'refund';
    const isDebit = transaction.type === 'withdrawal' || transaction.type === 'payment';
    const displayAmount = Math.abs(parseFloat(String(transaction.amount)) || 0);
    const currency = transaction.currency || 'USDC';
    const status = transaction.status || 'completed';
    
    let statusBadgeClass = 'text-gray-400';
    if (status === 'completed') statusBadgeClass = 'text-emerald-600 font-medium';
    else if (status === 'processing' || status === 'pending') statusBadgeClass = 'text-amber-600 font-medium';
    else if (status === 'failed' || status === 'reversed' || status === 'cancelled') statusBadgeClass = 'text-red-600 font-medium';

    return (
      <div
        key={txId}
        className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isCredit
                ? 'bg-[#F3E8FF] text-[#8A2BE2]'
                : isDebit
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isCredit ? (
              <ArrowDownLeft className="w-5 h-5" />
            ) : (
              <ArrowUpRight className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{transaction.description || transaction.type}</p>
            <p className="text-xs text-gray-500">
              {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '—'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`font-semibold ${
              isCredit ? 'text-[#8A2BE2]' : isDebit ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {isCredit ? '+' : isDebit ? '−' : ''}
            {displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </p>
          <p className={`text-xs capitalize ${statusBadgeClass}`}>{status}</p>
        </div>
      </div>
    );
  };

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
        availableBalance={availableBalance}
        pendingWithdrawal={pendingWithdrawal}
        escrowBalance={escrowBalance}
        incomingEarnings={incomingEarnings}
        solanaAddress={solanaAddress}
        userRole={userRole as 'client' | 'creator'}
        onAddFunds={() => setIsAddFundsOpen(true)}
        onWithdraw={() => setIsWithdrawOpen(true)}
      />

      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => {
          setIsAddFundsOpen(false);
          fetchWallet();
        }}
        solanaAddress={solanaAddress}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          fetchWallet();
        }}
        availableBalance={availableBalance}
        onSuccess={() => {
          fetchWallet();
          fetchTransactions();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex w-full overflow-x-auto scrollbar-hide lg:w-auto lg:inline-flex">
              <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
              <TabsTrigger value="deposits" className="flex-shrink-0">Deposits</TabsTrigger>
              <TabsTrigger value="payments" className="flex-shrink-0">Payments</TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex-shrink-0">Withdrawals</TabsTrigger>
              <TabsTrigger value="earnings" className="flex-shrink-0">Earnings</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {usdcTransactions.length > 0 ? (
                usdcTransactions.map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
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
                  image="/images/empty-wallet.png"
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
                  image="/images/empty-wallet.png"
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
                  image="/images/empty-wallet.png"
                  title="No withdrawals yet"
                  description="Your USDC withdrawals will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="earnings" className="mt-4">
              {usdcTransactions.filter((t) => t.type === 'earning').length > 0 ? (
                usdcTransactions
                  .filter((t) => t.type === 'earning')
                  .map(renderTransaction)
              ) : (
                <EmptyState
                  image="/images/empty-wallet.png"
                  title="No earnings yet"
                  description="Your earnings will appear here when projects are completed"
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
