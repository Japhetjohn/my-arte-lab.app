import { useState, useCallback } from 'react';
import { walletService } from '@/lib/api';
import type { WalletAsset, Transaction } from '@/lib/validations/walletSchemas';

interface WalletState {
  assets: WalletAsset[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  balance: number;
  usdcBalance: number;
  pendingWithdrawal: number;
  availableBalance: number;
  escrowBalance: number;
  incomingEarnings: number;
  solanaAddress: string | null;
  isInitialLoad: boolean;
}

const CACHE_KEY = 'wallet_balance_cache';

const loadCachedBalance = () => {
  if (typeof window === 'undefined') return { balance: 0, usdcBalance: 0, pendingWithdrawal: 0, availableBalance: 0, escrowBalance: 0, incomingEarnings: 0 };
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { balance, usdcBalance, pendingWithdrawal, availableBalance, escrowBalance, incomingEarnings, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return {
          balance: balance || 0,
          usdcBalance: usdcBalance || balance || 0,
          pendingWithdrawal: pendingWithdrawal || 0,
          availableBalance: availableBalance !== undefined ? availableBalance : Math.max(0, (balance || 0) - (pendingWithdrawal || 0)),
          escrowBalance: escrowBalance || 0,
          incomingEarnings: incomingEarnings || 0
        };
      }
    }
  } catch {
    // Ignore errors
  }
  return { balance: 0, usdcBalance: 0, pendingWithdrawal: 0, availableBalance: 0, escrowBalance: 0, incomingEarnings: 0 };
};

const saveCachedBalance = (balance: number, usdcBalance: number, pendingWithdrawal: number, availableBalance: number, escrowBalance: number, incomingEarnings: number) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      balance,
      usdcBalance,
      pendingWithdrawal,
      availableBalance,
      escrowBalance,
      incomingEarnings,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore errors
  }
};

export function useWallet() {
  const cached = loadCachedBalance();
  
  const [state, setState] = useState<WalletState>({
    assets: [],
    transactions: [],
    isLoading: false,
    error: null,
    balance: cached.balance,
    usdcBalance: cached.usdcBalance,
    pendingWithdrawal: cached.pendingWithdrawal,
    availableBalance: cached.availableBalance,
    escrowBalance: cached.escrowBalance,
    incomingEarnings: cached.incomingEarnings,
    solanaAddress: null,
    isInitialLoad: true,
  });

  const fetchWallet = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const response = await walletService.getWallet();
      const walletData = response.data?.data?.wallet;
      const newBalance = walletData?.balance || 0;
      const newUsdcBalance = walletData?.usdcBalance || newBalance;
      const newPendingWithdrawal = walletData?.pendingWithdrawal || 0;
      const newAvailableBalance = walletData?.availableBalance !== undefined 
        ? walletData.availableBalance 
        : Math.max(0, newBalance - newPendingWithdrawal);
      const newEscrowBalance = walletData?.escrowBalance || 0;
      const newIncomingEarnings = walletData?.incomingEarnings || 0;
      const solanaAddress = walletData?.solanaAddress || null;
      
      saveCachedBalance(newBalance, newUsdcBalance, newPendingWithdrawal, newAvailableBalance, newEscrowBalance, newIncomingEarnings);
      
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
        isLoading: false,
        isInitialLoad: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isInitialLoad: false,
        error: error.response?.data?.message || 'Failed to fetch wallet',
      }));
    }
  }, []);

  const fetchTransactions = useCallback(async (params?: { page?: number; limit?: number; type?: string }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await walletService.getTransactions(params);
      const rawTransactions = response.data?.data?.transactions || [];
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
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch transactions',
      }));
    }
  }, []);

  const totalBalanceUSD = state.balance || 0;

  return {
    ...state,
    totalBalanceUSD,
    availableBalance: state.availableBalance,
    pendingWithdrawal: state.pendingWithdrawal,
    fetchWallet,
    fetchTransactions,
  };
}
