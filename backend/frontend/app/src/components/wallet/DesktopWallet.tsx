import { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DesktopWalletProps {
  balance: number;
  availableBalance: number;
  pendingWithdrawal: number;
  escrowBalance: number;
  incomingEarnings: number;
  solanaAddress: string | null;
  userCountry: {
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

type FilterTab = 'all' | 'deposits' | 'payments' | 'withdrawals' | 'earnings';

export function DesktopWallet({
  balance,
  availableBalance,
  pendingWithdrawal = 0,
  escrowBalance = 0,
  incomingEarnings = 0,
  solanaAddress,
  userCountry,
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
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Safe clipboard copy with fallback
  const handleCopyAddress = async () => {
    if (!solanaAddress) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(solanaAddress);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = solanaAddress;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) throw new Error('Copy command failed');
      }
      setCopied(true);
      toast.success('Solana address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy address. Please copy it manually.');
    }
  };

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

  // Filtered transactions including onramp/offramp/bonus aliases
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const type = (t.type || '').toLowerCase();
      if (type === 'platform_fee') return false;
      if (activeFilter === 'deposits') return type === 'deposit' || type === 'onramp';
      if (activeFilter === 'payments') return type === 'payment' || type === 'escrow' || type === 'verification';
      if (activeFilter === 'withdrawals') return type === 'withdrawal' || type === 'offramp';
      if (activeFilter === 'earnings') return type === 'earning' || type === 'bonus';
      return true;
    });
  }, [transactions, activeFilter]);

  // Grouped chronological transactions
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; subtotal: number; items: Transaction[] } } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    filteredTransactions.forEach((tx) => {
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
      const amount = Math.abs(parseFloat(String(tx.amount)) || 0);
      groups[key].subtotal += amount;
    });

    return Object.values(groups);
  }, [filteredTransactions]);

  // Determine category icon and styling
  const getCategoryMeta = (tx: Transaction) => {
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();

    if (type === 'deposit' || type === 'onramp' || desc.includes('deposit') || desc.includes('funding')) {
      return {
        emoji: '💳',
        isCredit: true,
        categoryName: 'Deposit',
      };
    }
    if (type === 'earning' || type === 'bonus' || desc.includes('earning') || desc.includes('payout')) {
      return {
        emoji: '💰',
        isCredit: true,
        categoryName: 'Earnings',
      };
    }
    if (type === 'refund' || type === 'reversal' || desc.includes('refund') || desc.includes('reversal')) {
      return {
        emoji: '🔄',
        isCredit: true,
        categoryName: 'Refund',
      };
    }
    if (type === 'withdrawal' || type === 'offramp' || desc.includes('withdraw')) {
      return {
        emoji: '🏦',
        isCredit: false,
        categoryName: 'Withdrawal',
      };
    }
    if (desc.includes('escrow') || type === 'escrow') {
      return {
        emoji: '🔒',
        isCredit: false,
        categoryName: 'Escrow Payment',
      };
    }
    return {
      emoji: '🛍️',
      isCredit: false,
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
    <div className="bg-white border border-gray-100/90 rounded-2xl p-6 lg:p-8 shadow-xs space-y-8 text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      {/* 2.A: Page Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-900">My Wallet</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your balance, escrow payments, and transactions.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {userCountry && (
            <span className="inline-flex items-center text-xs font-medium bg-gray-100/80 text-gray-600 px-3 py-1 rounded-full border border-gray-200/50">
              {userCountry.countryCode === 'NG' ? '🇳🇬' : '📍'} {userCountry.countryName} ({userCountry.defaultCurrency})
            </span>
          )}

          <span className="text-xs font-semibold tracking-wide bg-purple-50 text-[#9747FF] border border-purple-200/60 px-2.5 py-1 rounded-full">
            USDC
          </span>

          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer ml-1"
              title="Refresh wallet"
              aria-label="Refresh wallet"
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-[#9747FF]')} />
            </button>
          )}
        </div>
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

      {/* 2.B & 2.D: Balance Overview & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5">
            Available Balance
          </p>
          <div className="flex items-baseline">
            <span className="text-3xl font-light text-gray-400 mr-1 align-baseline">$</span>
            <span className="text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">{wholePart}</span>
            <span className="text-3xl font-semibold tracking-tight text-gray-900">.{decimalPart}</span>
            <span className="text-sm font-semibold text-[#9747FF] bg-purple-50 border border-purple-200/60 px-2.5 py-0.5 rounded-md ml-2.5 align-baseline">
              USDC
            </span>
          </div>

          {/* Pending Withdrawal Reservation Note */}
          {hasPendingWithdrawal && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-50/90 border border-amber-200/70 rounded-full text-xs text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>
                <strong>${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC</strong> reserved for pending withdrawal (Total: ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC)
              </span>
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onAddFunds}
            className="h-11 px-5 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] active:scale-[0.98] text-white font-medium text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Add Funds</span>
          </button>

          <button
            type="button"
            onClick={onWithdraw}
            className="h-11 px-5 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.98] border border-gray-200 text-gray-800 font-medium text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-gray-600" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* 2.C: Wallet Address Section */}
      {isWalletLoading && !solanaAddress ? (
        <div className="h-12 bg-gray-50/70 border border-gray-150 animate-pulse rounded-xl" />
      ) : solanaAddress ? (
        <div className="bg-gray-50/70 border border-gray-200/70 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 shrink-0">
              USDC on Solana:
            </span>
            <span className="font-mono text-xs text-gray-700 font-medium truncate select-all">
              {solanaAddress}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyAddress}
            className="h-8 px-3 rounded-lg bg-white hover:bg-gray-100 active:scale-95 border border-gray-200/80 text-xs font-medium text-gray-700 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
            aria-label="Copy Solana wallet address"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span>Copy Address</span>
              </>
            )}
          </button>
        </div>
      ) : null}

      {/* 2.E: Escrow Overview Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Escrow Activity</h2>
          </div>
          <span className="text-xs text-gray-400">Milestone and project protection</span>
        </div>

        {hasEscrowActivity ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Held in Escrow (Client funds held for active bookings) */}
            {escrowBalance > 0 && (
              <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
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
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5" />
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
          <div className="bg-gray-50/70 border border-dashed border-gray-200/80 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">No active escrow funds</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Payments for active bookings are held securely in escrow until milestones are completed.
                </p>
              </div>
            </div>

            <a
              href="/bookings"
              className="text-xs font-medium text-[#9747FF] hover:text-[#8534f0] flex items-center gap-1 hover:underline shrink-0 ml-4"
            >
              View Bookings <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 2.F: Transaction History Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 tracking-tight">Transaction History</h2>
            {isTransactionsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9747FF]" />
            )}
          </div>

          {/* Compact Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {(['all', 'deposits', 'payments', 'withdrawals', 'earnings'] as const).map((tab) => {
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 capitalize cursor-pointer',
                    isActive
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200/70 text-gray-600'
                  )}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transactions Error notice */}
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
                    const txId = tx.id || tx._id || `tx-${Math.random()}`;
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
                        {/* Left: Icon & Description */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gray-50 border border-gray-150 shrink-0">
                            {meta.emoji}
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
              {activeFilter === 'all'
                ? 'Your transaction history will appear here'
                : `No ${activeFilter} recorded in your account yet`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
