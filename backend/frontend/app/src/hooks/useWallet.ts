import { useState, useCallback, useEffect, useRef } from 'react';
import { walletService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { WalletAsset, Transaction } from '@/lib/validations/walletSchemas';

export interface WalletPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface WalletState {
  assets: WalletAsset[];
  transactions: Transaction[];
  isLoading: boolean;
  isWalletLoading: boolean;
  isTransactionsLoading: boolean;
  isLoadingMoreTransactions: boolean;
  error: string | null;
  walletError: string | null;
  transactionsError: string | null;
  balance: number;
  usdcBalance: number;
  pendingWithdrawal: number;
  availableBalance: number;
  escrowBalance: number;
  incomingEarnings: number;
  solanaAddress: string | null;
  userCountry: {
    countryCode: string;
    countryName: string;
    defaultCurrency: string;
  } | null;
  paymentCapabilities: any | null;
  isInitialLoad: boolean;
  pagination: WalletPagination | null;
}

const getCacheKey = (userId?: string) => `wallet_balance_cache_${userId || 'default'}`;

const loadCachedBalance = (userId?: string) => {
  if (typeof window === 'undefined' || !userId) {
    return {
      balance: 0,
      usdcBalance: 0,
      pendingWithdrawal: 0,
      availableBalance: 0,
      escrowBalance: 0,
      incomingEarnings: 0,
      hasCache: false,
    };
  }
  try {
    const cached = localStorage.getItem(getCacheKey(userId));
    if (cached) {
      const { balance, usdcBalance, pendingWithdrawal, availableBalance, escrowBalance, incomingEarnings, timestamp, cachedUserId } = JSON.parse(cached);
      // Ensure cache belongs to this user and is less than 12 hours old
      if (cachedUserId === userId && Date.now() - timestamp < 12 * 60 * 60 * 1000) {
        return {
          balance: balance || 0,
          usdcBalance: usdcBalance || balance || 0,
          pendingWithdrawal: pendingWithdrawal || 0,
          availableBalance: availableBalance !== undefined ? availableBalance : Math.max(0, (balance || 0) - (pendingWithdrawal || 0)),
          escrowBalance: escrowBalance || 0,
          incomingEarnings: incomingEarnings || 0,
          hasCache: true,
        };
      }
    }
  } catch {
    // Ignore cache parse errors
  }
  return {
    balance: 0,
    usdcBalance: 0,
    pendingWithdrawal: 0,
    availableBalance: 0,
    escrowBalance: 0,
    incomingEarnings: 0,
    hasCache: false,
  };
};

const saveCachedBalance = (
  userId: string | undefined,
  balance: number,
  usdcBalance: number,
  pendingWithdrawal: number,
  availableBalance: number,
  escrowBalance: number,
  incomingEarnings: number
) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(
      getCacheKey(userId),
      JSON.stringify({
        cachedUserId: userId,
        balance,
        usdcBalance,
        pendingWithdrawal,
        availableBalance,
        escrowBalance,
        incomingEarnings,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore storage quota errors
  }
};

export function useWallet() {
  const { user } = useAuth();
  const userId = user?.id;
  const cached = loadCachedBalance(userId);

  const [state, setState] = useState<WalletState>({
    assets: [],
    transactions: [],
    isLoading: !cached.hasCache,
    isWalletLoading: true,
    isTransactionsLoading: true,
    isLoadingMoreTransactions: false,
    error: null,
    walletError: null,
    transactionsError: null,
    balance: cached.balance,
    usdcBalance: cached.usdcBalance,
    pendingWithdrawal: cached.pendingWithdrawal,
    availableBalance: cached.availableBalance,
    escrowBalance: cached.escrowBalance,
    incomingEarnings: cached.incomingEarnings,
    solanaAddress: null,
    userCountry: null,
    paymentCapabilities: null,
    isInitialLoad: true,
    pagination: null,
  });

  const activeUserIdRef = useRef(userId);

  // Clear or load state when user identity changes
  useEffect(() => {
    activeUserIdRef.current = userId;
    if (userId) {
      const userCached = loadCachedBalance(userId);
      setState((prev) => ({
        ...prev,
        balance: userCached.balance,
        usdcBalance: userCached.usdcBalance,
        pendingWithdrawal: userCached.pendingWithdrawal,
        availableBalance: userCached.availableBalance,
        escrowBalance: userCached.escrowBalance,
        incomingEarnings: userCached.incomingEarnings,
        walletError: null,
        transactionsError: null,
        error: null,
      }));
    }
  }, [userId]);

  const fetchWallet = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((prev) => ({
        ...prev,
        isWalletLoading: true,
        walletError: null,
        error: prev.transactionsError,
      }));
    }
    try {
      const response = await walletService.getWallet();
      const walletData = response.data?.data?.wallet;
      const userCountry = response.data?.data?.userCountry || null;
      const paymentCapabilities = response.data?.data?.paymentCapabilities || null;

      const newBalance = typeof walletData?.balance === 'number' ? walletData.balance : parseFloat(walletData?.balance) || 0;
      const newUsdcBalance = typeof walletData?.usdcBalance === 'number' ? walletData.usdcBalance : newBalance;
      const newPendingWithdrawal = typeof walletData?.pendingWithdrawal === 'number' ? walletData.pendingWithdrawal : parseFloat(walletData?.pendingWithdrawal) || 0;
      const newAvailableBalance = typeof walletData?.availableBalance === 'number'
        ? walletData.availableBalance
        : Math.max(0, newBalance - newPendingWithdrawal);
      const newEscrowBalance = typeof walletData?.escrowBalance === 'number' ? walletData.escrowBalance : parseFloat(walletData?.escrowBalance) || 0;
      const newIncomingEarnings = typeof walletData?.incomingEarnings === 'number' ? walletData.incomingEarnings : parseFloat(walletData?.incomingEarnings) || 0;
      const solanaAddress = walletData?.solanaAddress || null;

      saveCachedBalance(
        activeUserIdRef.current,
        newBalance,
        newUsdcBalance,
        newPendingWithdrawal,
        newAvailableBalance,
        newEscrowBalance,
        newIncomingEarnings
      );

      setState((prev) => ({
        ...prev,
        assets: walletData?.assets || [],
        balance: newBalance,
        usdcBalance: newUsdcBalance,
        pendingWithdrawal: newPendingWithdrawal,
        availableBalance: newAvailableBalance,
        escrowBalance: newEscrowBalance,
        incomingEarnings: newIncomingEarnings,
        solanaAddress,
        userCountry,
        paymentCapabilities,
        isWalletLoading: false,
        isLoading: prev.isTransactionsLoading,
        isInitialLoad: false,
        walletError: null,
        error: prev.transactionsError,
      }));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to fetch wallet';
      setState((prev) => ({
        ...prev,
        isWalletLoading: false,
        isLoading: prev.isTransactionsLoading,
        isInitialLoad: false,
        walletError: errorMsg,
        error: errorMsg,
      }));
    }
  }, []);

  const fetchTransactions = useCallback(async (params?: { page?: number; limit?: number; type?: string }) => {
    setState((prev) => ({
      ...prev,
      isTransactionsLoading: true,
      transactionsError: null,
      error: prev.walletError,
    }));
    try {
      const response = await walletService.getTransactions(params);
      const rawTransactions = response.data?.data?.transactions || [];
      const paginationData = response.data?.data?.pagination || null;

      const transactions = rawTransactions.map((tx: any) => ({
        ...tx,
        id: tx.id || tx._id,
        amount: parseFloat(tx.amount) || 0,
        currency: tx.currency || 'USDC',
        type: tx.type || 'deposit',
        status: tx.status || 'completed',
        description: tx.description || tx.type || 'Transaction',
        createdAt: tx.createdAt || new Date().toISOString(),
      }));

      setState((prev) => ({
        ...prev,
        transactions,
        pagination: paginationData,
        isTransactionsLoading: false,
        isLoading: prev.isWalletLoading,
        transactionsError: null,
        error: prev.walletError,
      }));
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to fetch transactions';
      setState((prev) => ({
        ...prev,
        isTransactionsLoading: false,
        isLoading: prev.isWalletLoading,
        transactionsError: errorMsg,
        error: errorMsg,
      }));
    }
  }, []);

  // Load more transactions (pagination)
  const loadMoreTransactions = useCallback(async () => {
    if (!state.pagination || state.isLoadingMoreTransactions) return;
    const nextPage = (state.pagination.currentPage || 1) + 1;
    if (nextPage > state.pagination.totalPages) return;

    setState((prev) => ({ ...prev, isLoadingMoreTransactions: true }));
    try {
      const response = await walletService.getTransactions({ page: nextPage, limit: state.pagination.itemsPerPage || 20 });
      const rawTransactions = response.data?.data?.transactions || [];
      const paginationData = response.data?.data?.pagination || null;

      const newTxList = rawTransactions.map((tx: any) => ({
        ...tx,
        id: tx.id || tx._id,
        amount: parseFloat(tx.amount) || 0,
        currency: tx.currency || 'USDC',
        type: tx.type || 'deposit',
        status: tx.status || 'completed',
        description: tx.description || tx.type || 'Transaction',
        createdAt: tx.createdAt || new Date().toISOString(),
      }));

      setState((prev) => {
        // Deduplicate
        const existingIds = new Set(prev.transactions.map((t) => t.id || (t as any)._id));
        const filteredNew = newTxList.filter((t: Transaction) => !existingIds.has(t.id || (t as any)._id));
        return {
          ...prev,
          transactions: [...prev.transactions, ...filteredNew],
          pagination: paginationData,
          isLoadingMoreTransactions: false,
        };
      });
    } catch {
      setState((prev) => ({ ...prev, isLoadingMoreTransactions: false }));
    }
  }, [state.pagination, state.isLoadingMoreTransactions]);

  const totalBalanceUSD = state.balance || 0;

  return {
    ...state,
    totalBalanceUSD,
    availableBalance: state.availableBalance,
    pendingWithdrawal: state.pendingWithdrawal,
    fetchWallet,
    fetchTransactions,
    loadMoreTransactions,
  };
}
