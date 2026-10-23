import { useEffect, useState } from 'react';
import { AddFundsModal } from '@/components/wallet/AddFundsModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { TransactionDetailsModal } from '@/components/wallet/TransactionDetailsModal';
import { MobileWallet } from '@/components/wallet/MobileWallet';
import { DesktopWallet } from '@/components/wallet/DesktopWallet';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import type { Transaction } from '@/types';

export function Wallet() {
  const {
    transactions,
    isWalletLoading,
    isTransactionsLoading,
    isLoadingMoreTransactions,
    isInitialLoad,
    error,
    walletError,
    transactionsError,
    totalBalanceUSD,
    availableBalance,
    pendingWithdrawal,
    escrowBalance,
    incomingEarnings,
    solanaAddress,
    userCountry,
    paymentCapabilities,
    pagination,
    fetchWallet,
    fetchTransactions,
    loadMoreTransactions,
  } = useWallet();
  
  // Get user role from auth context
  const { user } = useAuth();
  const userRole = user?.role || 'client';
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Exclude internal platform fees, keep all real user transactions (USDC, NGN, etc.)
  const displayTransactions = transactions.filter(
    (t) => (t.type as string) !== 'platform_fee'
  );

  const hasMoreTransactions = pagination ? pagination.currentPage < pagination.totalPages : false;

  // Handle fatal initial failure when no cached data exists
  if (isInitialLoad && walletError && totalBalanceUSD === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Unable to load wallet</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-4">{walletError}</p>
        <button
          type="button"
          onClick={() => {
            fetchWallet();
            fetchTransactions();
          }}
          className="px-4 py-2 bg-[#9747FF] text-white rounded-xl text-sm font-medium hover:bg-[#8534f0] transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Initial spinner only when there's zero cached data and initial request is in-flight
  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9747FF]" />
      </div>
    );
  }

  return (
    <>
      {/* Mobile view (< 1024px) - Clean minimalist fintech UI following Reference Screenshot 1 */}
      <div className="block lg:hidden">
        <MobileWallet
          balance={totalBalanceUSD}
          availableBalance={availableBalance}
          pendingWithdrawal={pendingWithdrawal}
          escrowBalance={escrowBalance}
          incomingEarnings={incomingEarnings}
          solanaAddress={solanaAddress}
          userCountry={userCountry}
          userRole={userRole as 'client' | 'creator'}
          transactions={displayTransactions}
          isWalletLoading={isWalletLoading}
          isTransactionsLoading={isTransactionsLoading}
          isLoadingMore={isLoadingMoreTransactions}
          hasMoreTransactions={hasMoreTransactions}
          walletError={walletError}
          transactionsError={transactionsError}
          onAddFunds={() => setIsAddFundsOpen(true)}
          onWithdraw={() => setIsWithdrawOpen(true)}
          onRefresh={() => {
            fetchWallet();
            fetchTransactions();
          }}
          onLoadMore={loadMoreTransactions}
          onSelectTransaction={setSelectedTransaction}
        />
      </div>

      {/* Desktop view (>= 1024px) - Clean, spacious 3-column layout matching Home & Bookings */}
      <div className="hidden lg:block pb-12">
        <DesktopWallet
          user={user}
          balance={totalBalanceUSD}
          availableBalance={availableBalance}
          pendingWithdrawal={pendingWithdrawal}
          escrowBalance={escrowBalance}
          incomingEarnings={incomingEarnings}
          solanaAddress={solanaAddress}
          userCountry={userCountry}
          userRole={userRole as 'client' | 'creator'}
          transactions={displayTransactions}
          isWalletLoading={isWalletLoading}
          isTransactionsLoading={isTransactionsLoading}
          isLoadingMore={isLoadingMoreTransactions}
          hasMoreTransactions={hasMoreTransactions}
          walletError={walletError}
          transactionsError={transactionsError}
          onAddFunds={() => setIsAddFundsOpen(true)}
          onWithdraw={() => setIsWithdrawOpen(true)}
          onRefresh={() => {
            fetchWallet();
            fetchTransactions();
          }}
          onLoadMore={loadMoreTransactions}
          onSelectTransaction={setSelectedTransaction}
        />
      </div>

      {/* Shared Modals - Preserving 100% of existing funding and withdrawal flows */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => {
          setIsAddFundsOpen(false);
          fetchWallet();
          fetchTransactions();
        }}
        solanaAddress={solanaAddress}
        userCountry={userCountry}
        paymentCapabilities={paymentCapabilities}
        onSuccess={() => {
          fetchWallet();
          fetchTransactions();
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          fetchWallet();
          fetchTransactions();
        }}
        availableBalance={availableBalance}
        solanaAddress={solanaAddress}
        userCountry={userCountry}
        paymentCapabilities={paymentCapabilities}
        onSuccess={() => {
          fetchWallet();
          fetchTransactions();
        }}
      />

      {/* Interactive Transaction Details Modal/Drawer */}
      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}
