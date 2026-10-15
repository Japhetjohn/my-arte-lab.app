import { useEffect, useState } from 'react';
import { AddFundsModal } from '@/components/wallet/AddFundsModal';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { MobileWallet } from '@/components/wallet/MobileWallet';
import { DesktopWallet } from '@/components/wallet/DesktopWallet';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
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
    userCountry,
    paymentCapabilities,
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

  if (isLoading) {
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
          transactions={usdcTransactions}
          isLoading={isLoading}
          onAddFunds={() => setIsAddFundsOpen(true)}
          onWithdraw={() => setIsWithdrawOpen(true)}
          onRefresh={() => {
            fetchWallet();
            fetchTransactions();
          }}
        />
      </div>

      {/* Desktop view (>= 1024px) - Clean, spacious, minimalist white aesthetic */}
      <div className="hidden lg:block pb-12">
        <DesktopWallet
          balance={totalBalanceUSD}
          availableBalance={availableBalance}
          pendingWithdrawal={pendingWithdrawal}
          escrowBalance={escrowBalance}
          incomingEarnings={incomingEarnings}
          solanaAddress={solanaAddress}
          userCountry={userCountry}
          userRole={userRole as 'client' | 'creator'}
          transactions={usdcTransactions}
          isLoading={isLoading}
          onAddFunds={() => setIsAddFundsOpen(true)}
          onWithdraw={() => setIsWithdrawOpen(true)}
          onRefresh={() => {
            fetchWallet();
            fetchTransactions();
          }}
        />
      </div>

      {/* Shared Modals - Preserving 100% of existing funding and withdrawal flows */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => {
          setIsAddFundsOpen(false);
          fetchWallet();
        }}
        solanaAddress={solanaAddress}
        userCountry={userCountry}
        paymentCapabilities={paymentCapabilities}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          fetchWallet();
        }}
        availableBalance={availableBalance}
        userCountry={userCountry}
        paymentCapabilities={paymentCapabilities}
        onSuccess={() => {
          fetchWallet();
          fetchTransactions();
        }}
      />
    </>
  );
}
