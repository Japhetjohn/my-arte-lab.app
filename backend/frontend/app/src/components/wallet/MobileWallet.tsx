import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  ShieldCheck,
  TrendingUp,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface MobileWalletProps {
  balance: number;
  availableBalance: number;
  pendingWithdrawal?: number;
  escrowBalance?: number;
  incomingEarnings?: number;
  solanaAddress?: string | null;
  userCountry?: {
    countryCode: string;
    countryName: string;
    defaultCurrency: string;
  } | null;
  userRole?: 'client' | 'creator';
  transactions: Transaction[];
  isLoading?: boolean;
  isWalletLoading?: boolean;
  isTransactionsLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreTransactions?: boolean;
  walletError?: string | null;
  transactionsError?: string | null;
  onAddFunds: () => void;
  onWithdraw: () => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
}

export function MobileWallet({
  balance,
  availableBalance,
  pendingWithdrawal = 0,
  escrowBalance = 0,
  incomingEarnings = 0,
  transactions = [],
  isWalletLoading = false,
  isTransactionsLoading = false,
  isLoadingMore = false,
  hasMoreTransactions = false,
  walletError,
  transactionsError,
  onAddFunds,
  onWithdraw,
  onRefresh,
  onLoadMore,
}: MobileWalletProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Formatted available balance split into whole and decimal parts for elegant typography
  const effectiveAvailable = availableBalance !== undefined ? availableBalance : Math.max(0, balance - pendingWithdrawal);
  const flooredAvailable = Math.floor(effectiveAvailable * 100) / 100;
  const formattedBalance = flooredAvailable.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [wholePart, decimalPart] = formattedBalance.split('.');
  const hasPendingWithdrawal = pendingWithdrawal > 0;

  // Group transactions by date (no filter tabs per specification)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; subtotal: number; items: Transaction[] } } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    transactions.forEach((tx) => {
      // Exclude internal platform fees
      if ((tx.type as string) === 'platform_fee') return;

      const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
      let key = 'Other';
      let label = 'Earlier';

      if (!isNaN(txDate.getTime())) {
        const isToday =
          txDate.getDate() === today.getDate() &&
          txDate.getMonth() === today.getMonth() &&
          txDate.getFullYear() === today.getFullYear();

        const isYesterday =
          txDate.getDate() === yesterday.getDate() &&
          txDate.getMonth() === yesterday.getMonth() &&
          txDate.getFullYear() === yesterday.getFullYear();

        if (isToday) {
          key = 'today';
          label = 'Today';
        } else if (isYesterday) {
          key = 'yesterday';
          label = 'Yesterday';
        } else {
          key = txDate.toISOString().split('T')[0];
          label = txDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: txDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
          });
        }
      }

      if (!groups[key]) {
        groups[key] = { label, subtotal: 0, items: [] };
      }
      groups[key].items.push(tx);
      const isUsdc = (tx.currency || 'USDC').toUpperCase() === 'USDC' || (tx.currency || '').toUpperCase() === 'USD';
      if (isUsdc) {
        const amount = Math.abs(parseFloat(String(tx.amount)) || 0);
        groups[key].subtotal += amount;
      }
    });

    return Object.values(groups);
  }, [transactions]);

  // Determine category metadata (pure vector icons, NO EMOJIS)
  const getCategoryMeta = (tx: Transaction) => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();

    if (type === 'deposit' || type === 'onramp' || desc.includes('deposit') || desc.includes('funding') || desc.includes('onramp')) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Deposit',
      };
    }
    if (type === 'withdrawal' || type === 'offramp' || desc.includes('withdraw') || desc.includes('offramp') || desc.includes('payout')) {
      return {
        isCredit: false,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Withdrawal',
      };
    }
    if (type === 'escrow' || type === 'booking' || type === 'payment' || desc.includes('escrow') || desc.includes('booking') || desc.includes('service')) {
      return {
        isCredit: false,
        isEscrow: true,
        isRefund: false,
        categoryName: 'Booking',
      };
    }
    if (type === 'refund' || type === 'reversal' || desc.includes('refund') || desc.includes('reversal')) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: true,
        categoryName: 'Refund',
      };
    }
    if (type === 'earning' || type === 'bonus' || desc.includes('earning')) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Earnings',
      };
    }
    return {
      isCredit: false,
      isEscrow: false,
      isRefund: false,
      categoryName: 'Payment',
    };
  };

  // Safe multi-currency formatter
  const formatTxAmount = (tx: Transaction) => {
    const currency = (tx.currency || 'USDC').toUpperCase();
    const amount = Math.abs(parseFloat(String(tx.amount)) || 0);
    const formattedNumber = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (currency === 'NGN') {
      return {
        text: `₦${formattedNumber}`,
        currencyBadge: 'NGN',
      };
    }
    if (currency === 'USDC' || currency === 'USD') {
      return {
        text: `$${formattedNumber}`,
        currencyBadge: 'USDC',
      };
    }
    return {
      text: `${formattedNumber}`,
      currencyBadge: currency,
    };
  };

  const hasEscrowActivity = escrowBalance > 0 || incomingEarnings > 0;

  return (
    <div className="bg-white min-h-[calc(100vh-4rem)] -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 p-4 sm:p-6 pb-32 text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Header: Quick Actions (Refresh) */}
      {onRefresh && (
        <header className="flex items-center justify-end pt-1 pb-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Refresh wallet"
            title="Refresh wallet"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-[#9747FF]')} />
          </button>
        </header>
      )}

      {/* 2. Available Balance Section */}
      <section className="text-center pt-2 pb-2">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <p className="text-sm font-medium text-gray-500">Available balance</p>
          {isWalletLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />}
        </div>
        <div className="flex items-baseline justify-center">
          <span className="text-2xl sm:text-3xl font-light text-gray-400 mr-0.5 align-baseline">$</span>
          <span className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900">{wholePart}</span>
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">.{decimalPart}</span>
          <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md ml-1.5 align-baseline">
            USDC
          </span>
        </div>

        {/* Recoverable Wallet Error Banner */}
        {walletError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50/90 border border-red-200/80 text-center max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-1.5 text-red-700 text-xs sm:text-sm font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Failed to load wallet data</span>
            </div>
            <p className="text-xs text-red-600 mb-2">{walletError}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Pending Withdrawal Reservation Notice */}
        {hasPendingWithdrawal && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200/70 rounded-full text-xs font-medium text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC reserved for pending withdrawal
            </span>
          </div>
        )}
      </section>

      {/* 3. Consistent Add Funds and Withdraw Buttons (Identical visual treatment, no visual competition) */}
      <section className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full mb-6 mt-4">
        <button
          type="button"
          onClick={onAddFunds}
          className="h-12 px-4 rounded-xl bg-gray-100 hover:bg-gray-200/80 active:scale-[0.98] border border-gray-200/70 text-gray-900 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4 text-gray-700" />
          <span>Add Funds</span>
        </button>

        <button
          type="button"
          onClick={onWithdraw}
          className="h-12 px-4 rounded-xl bg-gray-100 hover:bg-gray-200/80 active:scale-[0.98] border border-gray-200/70 text-gray-900 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4 text-gray-700" />
          <span>Withdraw</span>
        </button>
      </section>

      {/* 4. Escrow Section (Clean, no emojis) */}
      <section className="max-w-md mx-auto mb-6">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-600">
              Escrow Activity
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400">Protected Funds</span>
        </div>

        {hasEscrowActivity ? (
          <div className="space-y-2.5">
            {/* Client Escrow */}
            {escrowBalance > 0 && (
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Held in Escrow</p>
                    <p className="text-xs text-gray-500 mt-0.5">Released to creator upon delivery</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm sm:text-base text-gray-900">
                    ${escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-xs text-purple-700 font-semibold bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md mt-0.5">
                    In Escrow
                  </span>
                </div>
              </div>
            )}

            {/* Creator Incoming Earnings */}
            {incomingEarnings > 0 && (
              <div className="bg-white border border-gray-150 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Incoming Earnings</p>
                    <p className="text-xs text-gray-500 mt-0.5">Paid out when client approves work</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm sm:text-base text-emerald-600">
                    ${incomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md mt-0.5">
                    Pending
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50/70 border border-dashed border-gray-200/80 rounded-xl p-3.5 text-center">
            <p className="text-sm font-semibold text-gray-700">No active escrow funds</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Funds for booked projects are securely held in escrow until milestones are completed.
            </p>
            <a
              href="/bookings"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#9747FF] hover:underline mt-2"
            >
              <span>View Bookings</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </a>
          </div>
        )}
      </section>

      {/* 5. Recent Transactions Section (NO filter tabs, pure line icons, NO emojis) */}
      <section className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Recent Transactions</h2>
            {isTransactionsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
            )}
          </div>
        </div>

        {/* Recoverable Transactions Error Banner */}
        {transactionsError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50/90 border border-red-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-red-700 text-xs sm:text-sm font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Failed to load transactions</span>
            </div>
            <p className="text-xs text-red-600 mb-2">{transactionsError}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50/50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Grouped Chronological List */}
        {isTransactionsLoading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#9747FF] mb-2" />
            <p className="text-sm text-gray-500">Loading transactions...</p>
          </div>
        ) : groupedTransactions.length > 0 ? (
          <div className="space-y-4">
            {groupedTransactions.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {/* Group Header: Date on left, subtotal on right */}
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500">{group.label}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500">
                    ${group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Rows in this date group */}
                <div className="bg-white">
                  {group.items.map((tx) => {
                    const txId = tx.id || (tx as any)._id || `tx-${Math.random()}`;
                    const meta = getCategoryMeta(tx);
                    const isCredit = meta.isCredit;
                    const formatted = formatTxAmount(tx);
                    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
                    const formattedDateTime = txDate
                      ? `${txDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${txDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                      : '—';
                    const status = tx.status || 'completed';

                    return (
                      <div
                        key={txId}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Left: Monochrome vector icon & Description (NO EMOJIS) */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200/60 flex items-center justify-center shrink-0">
                            {meta.isEscrow ? (
                              <Lock className="w-4 h-4 text-purple-600" />
                            ) : meta.isRefund ? (
                              <RefreshCw className="w-4 h-4 text-emerald-600" />
                            ) : isCredit ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-gray-600" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="font-semibold text-gray-900 text-sm sm:text-base truncate"
                              title={tx.description || meta.categoryName}
                            >
                              {meta.categoryName}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                              {formattedDateTime}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount & Secondary indicator */}
                        <div className="text-right shrink-0 ml-3">
                          <p
                            className={cn(
                              'text-sm sm:text-base font-bold tracking-tight',
                              isCredit ? 'text-emerald-600' : 'text-gray-900'
                            )}
                          >
                            {isCredit ? '+' : '−'}
                            {formatted.text}
                          </p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">
                            {status === 'completed' ? (
                              <span className="font-medium text-gray-500">{formatted.currencyBadge}</span>
                            ) : (
                              <span
                                className={cn(
                                  'font-semibold',
                                  status === 'pending' || status === 'processing'
                                    ? 'text-amber-600'
                                    : 'text-red-500'
                                )}
                              >
                                {status}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pagination: Load More */}
            {hasMoreTransactions && onLoadMore && (
              <div className="text-center pt-2 pb-1">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />}
                  <span>{isLoadingMore ? 'Loading older transactions...' : 'Load older transactions'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-gray-50/50 rounded-2xl border border-gray-100 mt-2">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2.5 text-gray-400 shadow-2xs border border-gray-100">
              <FolderOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="font-semibold text-gray-900 text-base">No transactions found</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xs mx-auto">
              Your transaction history will appear here
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
