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
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Transaction } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MobileWalletProps {
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

export function MobileWallet({
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
}: MobileWalletProps) {
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

  // Truncate address for clean display on narrow screens
  const displayAddress = useMemo(() => {
    if (!solanaAddress) return 'Generating address...';
    if (solanaAddress.length <= 14) return solanaAddress;
    return `${solanaAddress.slice(0, 6)}...${solanaAddress.slice(-6)}`;
  }, [solanaAddress]);

  // Formatted available balance split into whole and decimal parts for elegant typography
  const effectiveAvailable = availableBalance !== undefined ? availableBalance : Math.max(0, balance - pendingWithdrawal);
  const formattedBalance = effectiveAvailable.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const [wholePart, decimalPart] = formattedBalance.split('.');
  const hasPendingWithdrawal = pendingWithdrawal > 0;

  // Filter transactions including aliases
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

  // Group transactions by date (Today, Yesterday, or formatted date string)
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
      const isUsdc = (tx.currency || 'USDC').toUpperCase() === 'USDC' || (tx.currency || '').toUpperCase() === 'USD';
      if (isUsdc) {
        const amount = Math.abs(parseFloat(String(tx.amount)) || 0);
        groups[key].subtotal += amount;
      }
    });

    return Object.values(groups);
  }, [filteredTransactions]);

  // Determine category visual styling and illustration
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
    if (desc.includes('gift')) {
      return {
        emoji: '🎁',
        isCredit: false,
        categoryName: 'Gift',
      };
    }
    if (desc.includes('coffee')) {
      return {
        emoji: '☕',
        isCredit: false,
        categoryName: 'Coffee',
      };
    }
    if (desc.includes('snack') || desc.includes('food')) {
      return {
        emoji: '🍪',
        isCredit: false,
        categoryName: 'Snacks',
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
    <div className="bg-white min-h-[calc(100vh-4rem)] -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 p-4 sm:p-6 pb-32 text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      {/* 2.A: Compact Wallet Header */}
      <header className="flex items-center justify-between pt-1 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">My Wallet</h1>
          {userCountry && (
            <span className="inline-flex items-center text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {userCountry.countryCode === 'NG' ? '🇳🇬' : '📍'} {userCountry.countryName} ({userCountry.defaultCurrency})
            </span>
          )}
          <span className="text-[10px] font-semibold tracking-wide bg-purple-50 text-[#9747FF] border border-purple-200/60 px-2 py-0.5 rounded-full">
            USDC
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all"
              aria-label="Refresh wallet"
              title="Refresh wallet"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-[#9747FF]')} />
            </button>
          )}

          {/* Minimal circular action button inspired by Reference Image 1 top right */}
          <button
            type="button"
            onClick={onAddFunds}
            className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 active:scale-95 text-white flex items-center justify-center transition-all shadow-xs"
            aria-label="Add funds"
            title="Add funds"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2.B: Prominent Available Balance */}
      <section className="text-center pt-3 pb-2">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <p className="text-xs font-normal text-gray-400">Available balance</p>
          {isWalletLoading && <Loader2 className="w-3 h-3 animate-spin text-[#9747FF]" />}
        </div>
        <div className="flex items-baseline justify-center">
          <span className="text-2xl sm:text-3xl font-normal text-gray-400 mr-0.5 align-baseline">$</span>
          <span className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900">{wholePart}</span>
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">.{decimalPart}</span>
          <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 px-2 py-0.5 rounded-md ml-1.5 align-baseline">
            USDC
          </span>
        </div>

        {/* Recoverable Wallet Error Banner */}
        {walletError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50/90 border border-red-200/80 text-center max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-1.5 text-red-700 text-xs font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Failed to load wallet data</span>
            </div>
            <p className="text-[11px] text-red-600 mb-2">{walletError}</p>
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

        {/* Subtle Pending Withdrawal Reservation */}
        {hasPendingWithdrawal && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200/70 rounded-full text-[11px] text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              ${pendingWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC reserved for pending withdrawal
            </span>
          </div>
        )}
      </section>

      {/* 2.C: Wallet Address and Copy Functionality */}
      {solanaAddress && (
        <section className="mt-2 mb-4">
          <div className="bg-gray-50/90 border border-gray-200/70 rounded-full px-3 py-1.5 flex items-center justify-between gap-2 max-w-sm mx-auto shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 shrink-0">
                USDC on Solana:
              </span>
              <span className="font-mono text-xs text-gray-700 font-medium truncate">
                {displayAddress}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyAddress}
              className="p-1 px-2 rounded-full bg-white hover:bg-gray-100 active:scale-95 border border-gray-200/80 text-gray-700 transition-all flex items-center gap-1 shrink-0 text-xs font-medium"
              aria-label="Copy Solana wallet address"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-gray-500" />
                  <span className="text-[11px] text-gray-600 font-medium">Copy</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* 2.D: Primary Wallet Actions */}
      <section className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full mb-6">
        <button
          type="button"
          onClick={onAddFunds}
          className="h-11 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Add Funds</span>
        </button>

        <button
          type="button"
          onClick={onWithdraw}
          className="h-11 px-4 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.98] border border-gray-200 text-gray-800 font-medium text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4 text-gray-600" />
          <span>Withdraw</span>
        </button>
      </section>

      {/* 2.E: Escrow Section */}
      <section className="max-w-md mx-auto mb-6">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#9747FF]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Escrow Activity
            </h2>
          </div>
          <span className="text-[11px] text-gray-400">Protected Funds</span>
        </div>

        {hasEscrowActivity ? (
          <div className="space-y-2">
            {/* Client Escrow */}
            {escrowBalance > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-50 text-[#9747FF] flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-xs text-gray-900">Held in Escrow</p>
                    <p className="text-[11px] text-gray-400">Released to creator upon delivery</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-900">
                    ${escrowBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-[10px] text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded">
                    In Escrow
                  </span>
                </div>
              </div>
            )}

            {/* Creator Incoming Earnings */}
            {incomingEarnings > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-xs text-gray-900">Incoming Earnings</p>
                    <p className="text-[11px] text-gray-400">Paid out when client approves work</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-emerald-600">
                    ${incomingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-[10px] text-gray-400 font-normal">USDC</span>
                  </p>
                  <span className="inline-block text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                    Pending
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50/70 border border-dashed border-gray-200/80 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-gray-600">No active escrow funds</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Funds for booked projects are securely held in escrow until milestones are completed.
            </p>
            <a
              href="/bookings"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9747FF] hover:underline mt-1.5"
            >
              View Bookings <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        )}
      </section>

      {/* 2.F: Transaction History Section */}
      <section className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Transaction History</h2>
        </div>

        {/* Compact Horizontal Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3">
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

        {/* Recoverable Transactions Error Banner */}
        {transactionsError && (
          <div className="mb-3 p-3 rounded-xl bg-red-50/90 border border-red-200/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-red-700 text-xs font-semibold mb-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Failed to load transactions</span>
            </div>
            <p className="text-[11px] text-red-600 mb-2">{transactionsError}</p>
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

        {/* Grouped Chronological List replicating Screenshot 1 */}
        {isTransactionsLoading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#9747FF] mb-2" />
            <p className="text-xs text-gray-400">Loading transactions...</p>
          </div>
        ) : groupedTransactions.length > 0 ? (
          <div className="space-y-4">
            {groupedTransactions.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {/* Group Header: Date on left, subtotal on right (exactly as in Reference 1) */}
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs font-normal text-gray-400">{group.label}</span>
                  <span className="text-xs font-normal text-gray-400">
                    ${group.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Rows in this date group */}
                <div className="bg-white">
                  {group.items.map((tx) => {
                    const txId = tx.id || tx._id || `tx-${Math.random()}`;
                    const meta = getCategoryMeta(tx);
                    const isCredit = meta.isCredit;
                    const formatted = formatTxAmount(tx);
                    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
                    const formattedTime = txDate
                      ? txDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                      : '';
                    const status = tx.status || 'completed';

                    return (
                      <div
                        key={txId}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Left: Category Illustration (emoji inside rounded circle) */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gray-50 border border-gray-100/80 shrink-0">
                            {meta.emoji}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {tx.description || meta.categoryName}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formattedTime || meta.categoryName}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount & Secondary indicator */}
                        <div className="text-right shrink-0 ml-3">
                          <p
                            className={cn(
                              'text-sm font-semibold tracking-tight',
                              isCredit ? 'text-emerald-600' : 'text-gray-900'
                            )}
                          >
                            {isCredit ? '+' : '−'}
                            {formatted.text}
                          </p>
                          <p className="text-[11px] text-gray-400 capitalize mt-0.5">
                            {status === 'completed' ? (
                              formatted.currencyBadge
                            ) : (
                              <span
                                className={cn(
                                  status === 'pending' || status === 'processing'
                                    ? 'text-amber-600 font-medium'
                                    : 'text-red-500 font-medium'
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
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
            <p className="font-medium text-gray-800 text-sm">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              {activeFilter === 'all'
                ? 'Your transaction history will appear here'
                : `No ${activeFilter} recorded yet`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
