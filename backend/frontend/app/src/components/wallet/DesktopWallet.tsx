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

interface DesktopWalletProps {
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

export function DesktopWallet({
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

  // Formatted available balance
  const effectiveAvailable = availableBalance !== undefined ? availableBalance : Math.max(0, balance - pendingWithdrawal);
  const formattedBalance = effectiveAvailable.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [wholePart, decimalPart] = formattedBalance.split('.');
  const hasPendingWithdrawal = pendingWithdrawal > 0;

  // Grouped chronological transactions (no filter tabs per specification)
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

    if (type === 'deposit' || type === 'onramp' || desc.includes('deposit') || desc.includes('funding')) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Deposit',
      };
    }
    if (type === 'earning' || type === 'bonus' || desc.includes('earning') || desc.includes('payout')) {
      return {
        isCredit: true,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Earnings',
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
    if (type === 'withdrawal' || type === 'offramp' || desc.includes('withdraw')) {
      return {
        isCredit: false,
        isEscrow: false,
        isRefund: false,
        categoryName: 'Withdrawal',
      };
    }
    if (desc.includes('escrow') || type === 'escrow') {
      return {
        isCredit: false,
        isEscrow: true,
        isRefund: false,
        categoryName: 'Escrow Payment',
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
    <div className="bg-white border border-gray-150 rounded-2xl p-6 lg:p-8 shadow-2xs space-y-7 text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Header: Refresh as the only action (No redundant title, no currency badges, no plus button) */}
      <div className="flex items-center justify-end">
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
            title="Refresh wallet"
            aria-label="Refresh wallet"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-[#9747FF]')} />
          </button>
        )}
      </div>

      {/* Recoverable Error Banner */}
      {walletError && (
        <div className="p-3.5 bg-red-50/80 border border-red-200/80 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{walletError}</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 bg-white hover:bg-gray-50 border border-red-200 text-red-700 rounded-lg font-medium transition-all cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* 2. Simplified Balance Section & Consistent Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Available Balance
            </p>
            {isWalletLoading && <Loader2 className="w-3 h-3 animate-spin text-[#9747FF]" />}
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-light text-gray-400 mr-1 align-baseline">$</span>
            <span className="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">{wholePart}</span>
            <span className="text-3xl font-semibold tracking-tight text-gray-900">.{decimalPart}</span>
            <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md ml-2 align-baseline">
              USDC
            </span>
          </div>

          {/* Pending Withdrawal Reservation Notice */}
          {hasPendingWithdrawal && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/90 border border-amber-200/70 rounded-full text-xs text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC reserved for pending withdrawal
              </span>
            </div>
          )}
        </div>

        {/* Consistent Add Funds and Withdraw Buttons (Identical visual treatment, no visual competition) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onAddFunds}
            className="h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200/80 active:scale-[0.98] border border-gray-200/70 text-gray-900 font-medium text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-gray-700" />
            <span>Add Funds</span>
          </button>

          <button
            type="button"
            onClick={onWithdraw}
            className="h-11 px-5 rounded-xl bg-gray-100 hover:bg-gray-200/80 active:scale-[0.98] border border-gray-200/70 text-gray-900 font-medium text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-gray-700" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* 3. Escrow Overview Section (Clean, no emojis) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Escrow Activity</h2>
          </div>
          <span className="text-xs text-gray-400">Protected Funds</span>
        </div>

        {hasEscrowActivity ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Escrow */}
            {escrowBalance > 0 && (
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Held in Escrow</p>
                    <p className="text-xs text-gray-400 mt-0.5">Protected until milestone delivery is approved</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-base text-gray-900">
                    ${escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60 mt-1">
                    Active Escrow
                  </span>
                </div>
              </div>
            )}

            {/* Creator Incoming Earnings */}
            {incomingEarnings > 0 && (
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Incoming Earnings</p>
                    <p className="text-xs text-gray-400 mt-0.5">Will be released to your wallet upon client approval</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-base text-emerald-600">
                    ${incomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 mt-1">
                    Pending Approval
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50/50 border border-dashed border-gray-200/80 rounded-xl p-4 text-center">
            <p className="text-xs font-medium text-gray-700">No active escrow funds</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Funds for booked projects are securely held in escrow until milestones are completed.
            </p>
            <a
              href="/bookings"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9747FF] hover:underline mt-2"
            >
              <span>View Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 4. Recent Transactions Section (NO filter tabs, pure line icons, NO emojis) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Recent Transactions</h2>
            {isTransactionsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
            )}
          </div>
        </div>

        {/* Transactions Error Notice */}
        {transactionsError && (
          <div className="p-3 bg-red-50/70 border border-red-200/70 rounded-xl text-xs text-red-600 flex items-center justify-between">
            <span>{transactionsError}</span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="underline font-medium hover:text-red-800"
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
            <p className="text-xs text-gray-400">Loading transactions...</p>
          </div>
        ) : groupedTransactions.length > 0 ? (
          <div className="space-y-6">
            {groupedTransactions.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {/* Date Group Header */}
                <div className="flex items-center justify-between py-1.5 px-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    Total: ${group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </span>
                </div>

                {/* Rows in Date Group */}
                <div className="divide-y divide-gray-100">
                  {group.items.map((tx) => {
                    const txId = tx.id || (tx as any)._id || `tx-${Math.random()}`;
                    const meta = getCategoryMeta(tx);
                    const isCredit = meta.isCredit;
                    const formatted = formatTxAmount(tx);
                    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
                    const formattedDateTime = txDate
                      ? txDate.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : '—';
                    const status = tx.status || 'completed';

                    return (
                      <div
                        key={txId}
                        className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50/60 transition-colors rounded-lg"
                      >
                        {/* Left: Monochrome vector icon & Description (NO EMOJIS) */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {tx.description || meta.categoryName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formattedDateTime}
                            </p>
                          </div>
                        </div>

                        {/* Middle: Status Badge */}
                        <div className="hidden sm:block shrink-0 px-6">
                          <span
                            className={cn(
                              'text-xs font-medium px-2.5 py-0.5 rounded-full capitalize',
                              status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : status === 'pending' || status === 'processing'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-red-50 text-red-700 border border-red-200/60'
                            )}
                          >
                            {status}
                          </span>
                        </div>

                        {/* Right: Amount with Currency Badge */}
                        <div className="text-right shrink-0 min-w-[120px]">
                          <p
                            className={cn(
                              'text-sm font-semibold tracking-tight',
                              isCredit ? 'text-emerald-600' : 'text-gray-900'
                            )}
                          >
                            {isCredit ? '+' : '−'}
                            {formatted.text}{' '}
                            <span className="text-xs font-normal text-gray-400">{formatted.currencyBadge}</span>
                          </p>

                          <p className="text-[11px] text-gray-400 sm:hidden capitalize mt-0.5">
                            {status}
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
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />}
                  <span>{isLoadingMore ? 'Loading older transactions...' : 'Load older transactions'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-gray-50/40 rounded-2xl border border-gray-100 mt-2">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto mb-2.5 text-gray-400 shadow-2xs border border-gray-100">
              <FolderOpen className="w-5 h-5 stroke-[1.5]" />
            </div>
            <p className="font-medium text-gray-800 text-sm">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Your transaction history will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
