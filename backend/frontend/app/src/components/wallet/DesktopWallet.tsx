import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Users,
  Calendar,
  Wallet,
  Settings as SettingsIcon,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAvatarUrl } from '@/lib/imageUrl';
import { VerifiedBadge } from '@/components/shared/VerifiedBadge';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

interface DesktopWalletProps {
  user?: any;
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

export function DesktopWallet({
  user,
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
}: DesktopWalletProps) {
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

  // Formatted user display names
  const userDisplayName =
    user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Creative Member';
  const userUsername = user?.email ? user.email.split('@')[0] : 'member';

  // Formatted available balance
  const effectiveAvailable =
    availableBalance !== undefined ? availableBalance : Math.max(0, balance - pendingWithdrawal);
  const flooredAvailable = Math.floor(effectiveAvailable * 100) / 100;
  const formattedBalance = flooredAvailable.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [wholePart, decimalPart] = formattedBalance.split('.');
  const hasPendingWithdrawal = pendingWithdrawal > 0;

  // Grouped chronological transactions
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; subtotal: number; items: Transaction[] } } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    transactions.forEach((tx) => {
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
      const isUsdc =
        (tx.currency || 'USDC').toUpperCase() === 'USDC' || (tx.currency || '').toUpperCase() === 'USD';
      if (isUsdc) {
        const amount = Math.abs(parseFloat(String(tx.amount)) || 0);
        groups[key].subtotal += amount;
      }
    });

    return Object.values(groups);
  }, [transactions]);

  // Determine category metadata
  const getCategoryMeta = (tx: Transaction) => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();

    if (
      type === 'deposit' ||
      type === 'onramp' ||
      desc.includes('deposit') ||
      desc.includes('funding') ||
      desc.includes('onramp')
    ) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Deposit',
      };
    }
    if (
      type === 'withdrawal' ||
      type === 'offramp' ||
      desc.includes('withdraw') ||
      desc.includes('offramp') ||
      desc.includes('payout')
    ) {
      return {
        isCredit: false,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Withdrawal',
      };
    }
    if (
      type === 'escrow' ||
      type === 'booking' ||
      type === 'payment' ||
      desc.includes('escrow') ||
      desc.includes('booking') ||
      desc.includes('service')
    ) {
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

  // Multi-currency formatter
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

  return (
    <div className="w-full relative">
      {/* 3-Column Standardized Desktop Layout with continuous ash-grey dividers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            LEFT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Profile summary & platform navigation matching Home and Bookings
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* User Profile Mini Summary */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            {user ? (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center border-2 border-[#9747FF]/20 mb-3">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={userDisplayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#9747FF] font-bold text-xl">
                      {(userDisplayName || 'C')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">
                    {userDisplayName}
                  </h3>
                  {user.isVerified && (
                    <VerifiedBadge className="w-4 h-4 shrink-0 inline-block align-middle" showTooltip={false} />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  @{userUsername}
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] text-xs font-semibold mt-2.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{user.category || (user.role === 'creator' ? 'Verified Creator' : 'Creative Member')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Join MyArteLab</p>
                <Button asChild size="sm" className="mt-2 rounded-full bg-[#9747FF] hover:bg-[#8534f0] text-white">
                  <a href="/login">Sign in</a>
                </Button>
              </div>
            )}
          </div>

          {/* Quick Platform Navigation Menu */}
          <div className="pb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">
              Menu
            </div>
            <nav className="space-y-1">
              <a
                href="/home"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Home</span>
              </a>

              <a
                href="/creators"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Browse creators</span>
              </a>

              <a
                href="/bookings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Bookings</span>
              </a>

              <a
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-[#9747FF] bg-purple-50/80 dark:bg-purple-950/30 transition-colors"
              >
                <Wallet className="w-4 h-4 text-[#9747FF]" />
                <span>Wallet</span>
              </a>

              <a
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-[#9747FF] dark:hover:text-[#9747FF] hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Settings</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* =========================================================================
            CENTER COLUMN (col-span-1 lg:col-span-6)
            Balance, Actions, and Transaction History
           ========================================================================= */}
        <section className="col-span-1 lg:col-span-6 w-full max-w-xl mx-auto flex flex-col gap-0">
          {/* Recoverable Error Banner */}
          {walletError && (
            <div className="p-3.5 mb-5 bg-red-50/80 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 rounded-xl flex items-center justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{walletError}</span>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium transition-all cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* 1. Main Wallet Balance & Action Buttons */}
          <div className="pb-6 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Available balance
                  </span>
                  {isWalletLoading && <Loader2 className="w-3 h-3 animate-spin text-[#9747FF]" />}
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      title="Refresh wallet"
                      aria-label="Refresh wallet"
                    >
                      <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin text-[#9747FF]')} />
                    </button>
                  )}
                </div>
                <div className="flex items-baseline">
                  <span className="text-2xl sm:text-3xl font-light text-gray-400 dark:text-gray-500 mr-1">$</span>
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    {wholePart}
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                    .{decimalPart}
                  </span>
                  <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/60 px-2 py-0.5 rounded-md ml-2 align-baseline">
                    USDC
                  </span>
                </div>

                {/* Pending Withdrawal Reservation Notice */}
                {hasPendingWithdrawal && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 rounded-full text-xs font-medium text-amber-800 dark:text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>
                      ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC reserved for pending withdrawal
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Consistent Add Funds and Withdraw Buttons (Clean pill treatment) */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onAddFunds}
                  className="h-10 px-5 rounded-full bg-[#9747FF] hover:bg-[#8534f0] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer focus:outline-none"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Add funds</span>
                </button>

                <button
                  type="button"
                  onClick={onWithdraw}
                  className="h-10 px-5 rounded-full bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04] border border-[#DADDE1] dark:border-[#2f3032] active:scale-[0.98] text-gray-800 dark:text-gray-200 hover:border-[#9747FF] hover:text-[#9747FF] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Withdraw</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Transaction History Section */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">Recent transactions</h2>
                {isTransactionsLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {transactions.length} total
              </span>
            </div>

            {/* Transactions Error Notice */}
            {transactionsError && (
              <div className="p-3 bg-red-50/70 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center justify-between">
                <span>{transactionsError}</span>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="underline font-medium hover:text-red-800 dark:hover:text-red-200"
                  >
                    Reload
                  </button>
                )}
              </div>
            )}

            {/* Transaction Rows */}
            {isTransactionsLoading && transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#9747FF] mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading transactions...</p>
              </div>
            ) : groupedTransactions.length > 0 ? (
              <div className="space-y-6">
                {groupedTransactions.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    {/* Date Group Header */}
                    <div className="flex items-center justify-between py-1.5 px-2">
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {group.label}
                      </span>
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                        Total: ${group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                      </span>
                    </div>

                    {/* Continuous rows separated by thin ash-grey dividers */}
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
                            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] active:bg-gray-100/70 dark:active:bg-white/[0.04] transition-colors cursor-pointer group"
                            aria-label={`View details for ${meta.categoryName} of ${formatted.text}`}
                          >
                            {/* Left: Monochrome vector icon & Description */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                                  className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-[#9747FF] text-sm truncate transition-colors"
                                  title={tx.description || meta.categoryName}
                                >
                                  {meta.categoryName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {formattedDateTime}
                                </p>
                              </div>
                            </div>

                            {/* Middle: Status Badge */}
                            <div className="hidden sm:block shrink-0 px-6">
                              <span
                                className={cn(
                                  'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                                  status === 'completed'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                    : status === 'pending' || status === 'processing'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60'
                                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/50'
                                )}
                              >
                                {status}
                              </span>
                            </div>

                            {/* Right: Amount with Currency Badge + Chevron */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right min-w-[90px]">
                                <p
                                  className={cn(
                                    'text-sm font-bold tracking-tight',
                                    isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
                                  )}
                                >
                                  {isCredit ? '+' : '−'}
                                  {formatted.text}{' '}
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatted.currencyBadge}</span>
                                </p>

                                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 sm:hidden capitalize mt-0.5">
                                  {status}
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
                  <div className="text-center pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onLoadMore}
                      disabled={isLoadingMore}
                      className="px-5 py-2 border-gray-200 dark:border-[#2f3032] hover:border-[#9747FF] text-gray-700 dark:text-gray-300 hover:text-[#9747FF] rounded-xl text-xs font-semibold shadow-xs"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-2 text-[#9747FF]" />
                          <span>Loading older transactions...</span>
                        </>
                      ) : (
                        <span>Load older transactions</span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-14 px-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center mx-auto mb-2.5">
                  <Wallet className="w-5 h-5 stroke-[1.75]" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">No transactions yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  Deposits, withdrawals, and project payments will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            RIGHT COLUMN (lg:col-span-3, hidden on mobile/tablet)
            Security Guarantee, Account Metrics & Platform Shortcuts
           ========================================================================= */}
        <aside className="hidden lg:flex flex-col gap-6 lg:col-span-3 sticky top-20">
          {/* Escrow Guarantee Callout */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
              <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">Escrow protection</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
              Funds are held safely in escrow and released only after you review and approve deliverables.
            </p>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Funds are never released without your approval</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Direct bank deposits and on-chain USDC payouts</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9747FF] shrink-0 mt-0.5" />
                <span>Unreleased escrow funds return to your wallet if a project is cancelled</span>
              </div>
            </div>
          </div>

          {/* Account Financial Overview */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Account overview
            </h4>
            <div className="space-y-3">
              {escrowBalance > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">In escrow</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">${escrowBalance.toFixed(2)} USDC</span>
                </div>
              )}
              {incomingEarnings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Incoming</span>
                  <span className="font-semibold text-emerald-600">${incomingEarnings.toFixed(2)} USDC</span>
                </div>
              )}
              {hasPendingWithdrawal && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Pending withdrawal</span>
                  <span className="font-semibold text-amber-600">${pendingWithdrawal.toFixed(2)} USDC</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total transactions</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{transactions.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Platform Shortcuts */}
          <div className="pb-5 border-b border-[#DADDE1] dark:border-[#2f3032]">
            <div className="space-y-1">
              <a
                href="/bookings"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#9747FF]" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Bookings</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
              </a>

              <a
                href="/creators"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-100/70 dark:hover:bg-[#1e1f20] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#9747FF]" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Browse creators</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#9747FF] transition-colors" />
              </a>
            </div>
          </div>

          <div className="px-1 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} MyArteLab Inc.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
