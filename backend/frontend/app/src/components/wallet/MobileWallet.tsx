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
  ChevronRight,
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
  onSelectTransaction?: (tx: Transaction) => void;
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
  onSelectTransaction,
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
    <div className="bg-white dark:bg-[#18191a] min-h-[calc(100vh-4rem)] max-w-xl mx-auto px-4 pt-2 pb-32 text-gray-900 dark:text-gray-100">
      {/* 1. Header: Quick Actions (Refresh) */}
      {onRefresh && (
        <header className="flex items-center justify-end pt-1 pb-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-95 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Refresh wallet"
            title="Refresh wallet"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-[#9747FF]')} />
          </button>
        </header>
      )}

      {/* 2. Available Balance & Action Buttons */}
      <section className="text-center pt-2 pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Available balance</p>
          {isWalletLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />}
        </div>
        <div className="flex items-baseline justify-center">
          <span className="text-2xl sm:text-3xl font-light text-gray-400 dark:text-gray-500 mr-0.5 align-baseline">$</span>
          <span className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{wholePart}</span>
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">.{decimalPart}</span>
          <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 dark:bg-[#9747FF]/15 border border-purple-200/60 dark:border-purple-800/60 px-2 py-0.5 rounded-md ml-1.5 align-baseline">
            USDC
          </span>
        </div>

        {/* Recoverable Wallet Error Banner */}
        {walletError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 text-center max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-1.5 text-red-700 dark:text-red-400 text-xs sm:text-sm font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>We couldn't load your wallet data</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300 mb-2">{walletError}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium hover:bg-red-50/50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Pending Withdrawal Reservation Notice */}
        {hasPendingWithdrawal && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 rounded-full text-xs font-medium text-amber-800 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC reserved for pending withdrawal
            </span>
          </div>
        )}

        {/* Action Buttons (Clean pills) */}
        <div className="flex items-center justify-center gap-3 max-w-xs mx-auto w-full mt-4">
          <button
            type="button"
            onClick={onAddFunds}
            className="flex-1 h-10 px-4 rounded-full bg-[#9747FF] hover:bg-[#8534f0] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer focus:outline-none"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Add funds</span>
          </button>

          <button
            type="button"
            onClick={onWithdraw}
            className="flex-1 h-10 px-4 rounded-full bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-[#DADDE1] dark:border-[#2f3032] active:scale-[0.98] text-gray-800 dark:text-gray-200 hover:border-[#9747FF] hover:text-[#9747FF] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdraw</span>
          </button>
        </div>
      </section>

      {/* 4. Escrow Section (Clean continuous stream with thin straight line dividers) */}
      <section className="py-4 border-b border-[#DADDE1] dark:border-[#2f3032]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              Escrow protection
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">Protected funds</span>
        </div>

        {hasEscrowActivity ? (
          <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
            {/* Client Escrow */}
            {escrowBalance > 0 && (
              <div className="py-3 px-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-[#9747FF]/15 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Held in escrow</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Released upon deliverable approval</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    ${escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[11px] text-[#9747FF] font-semibold">
                    In escrow
                  </span>
                </div>
              </div>
            )}

            {/* Creator Incoming Earnings */}
            {incomingEarnings > 0 && (
              <div className="py-3 px-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Incoming earnings</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Paid out upon approval</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm sm:text-base text-emerald-600">
                    ${incomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[11px] text-emerald-600 font-semibold">
                    Pending
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 px-1 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>No active escrow funds right now</span>
            <a
              href="/bookings"
              className="inline-flex items-center gap-1 font-semibold text-[#9747FF] hover:underline"
            >
              <span>View bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </section>

      {/* 5. Recent Transactions Section */}
      <section className="pt-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#DADDE1] dark:border-[#2f3032] mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">Recent transactions</h2>
            {isTransactionsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
            )}
          </div>
        </div>

        {/* Recoverable Transactions Error Banner */}
        {transactionsError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 text-center">
            <div className="flex items-center justify-center gap-1.5 text-red-700 dark:text-red-400 text-xs sm:text-sm font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>We couldn't load your transactions</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-300 mb-2">{transactionsError}</p>
            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium hover:bg-red-50/50 dark:hover:bg-gray-700 inline-flex items-center gap-1.5 cursor-pointer"
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
          </div>
        ) : groupedTransactions.length > 0 ? (
          <div className="space-y-4">
            {groupedTransactions.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {/* Group Header: Date on left, subtotal on right */}
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{group.label}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    ${group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Rows in this date group */}
                <div className="divide-y divide-[#DADDE1] dark:divide-[#2f3032]">
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
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectTransaction?.(tx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectTransaction?.(tx);
                          }
                        }}
                        className="flex items-center justify-between py-3.5 px-1 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] active:bg-gray-100/70 dark:active:bg-white/[0.04] transition-colors cursor-pointer group"
                        aria-label={`View details for ${meta.categoryName} of ${formatted.text}`}
                      >
                        {/* Left: Monochrome vector icon & Description (NO EMOJIS) */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-purple-100/60 dark:group-hover:bg-purple-950/40 border border-gray-200/60 dark:border-gray-700/60 group-hover:border-purple-200 flex items-center justify-center shrink-0 transition-colors">
                            {meta.isEscrow ? (
                              <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            ) : meta.isRefund ? (
                              <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : isCredit ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] text-sm sm:text-base truncate transition-colors"
                              title={tx.description || meta.categoryName}
                            >
                              {meta.categoryName}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {formattedDateTime}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount & Secondary indicator + Chevron */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <div className="text-right">
                            <p
                              className={cn(
                                'text-sm sm:text-base font-bold tracking-tight',
                                isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
                              )}
                            >
                              {isCredit ? '+' : '−'}
                              {formatted.text}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                              {status === 'completed' ? (
                                <span className="font-medium text-gray-500 dark:text-gray-400">{formatted.currencyBadge}</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold',
                                    status === 'pending' || status === 'processing'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-500'
                                  )}
                                >
                                  {status}
                                </span>
                              )}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#9747FF] group-hover:translate-x-0.5 transition-all shrink-0" />
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
                  className="px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />}
                  <span>{isLoadingMore ? 'Loading older transactions...' : 'Load older transactions'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 px-4 mt-2">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-2.5">
              <FolderOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">No transactions yet</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Deposits, withdrawals, and project payments will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
