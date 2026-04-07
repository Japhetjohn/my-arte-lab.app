import { useState, useCallback } from 'react';
import { hostfiWalletService } from '@/lib/api';
import { toast } from 'sonner';
import type { WalletAsset, Transaction, Bank, Beneficiary } from '@/lib/validations/walletSchemas';

interface WalletState {
  assets: WalletAsset[];
  transactions: Transaction[];
  banks: Bank[];
  beneficiaries: Beneficiary[];
  isLoading: boolean;
  error: string | null;
  balance: number;
  usdcBalance: number;
  isInitialLoad: boolean;
}

const CACHE_KEY = 'wallet_balance_cache';

// Load cached balance from localStorage
const loadCachedBalance = () => {
  if (typeof window === 'undefined') return { balance: 0, usdcBalance: 0 };
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { balance, usdcBalance, timestamp } = JSON.parse(cached);
      // Cache is valid for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return { balance, usdcBalance };
      }
    }
  } catch {
    // Ignore errors
  }
  return { balance: 0, usdcBalance: 0 };
};

// Save balance to localStorage
const saveCachedBalance = (balance: number, usdcBalance: number) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      balance,
      usdcBalance,
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
    banks: [],
    beneficiaries: [],
    isLoading: false,
    error: null,
    balance: cached.balance,
    usdcBalance: cached.usdcBalance,
    isInitialLoad: true,
  });

  const fetchWallet = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }
    try {
      const response = await hostfiWalletService.getWallet();
      console.log('Wallet response:', response.data);
      // Backend returns { success: true, data: { wallet: {...} } }
      const walletData = response.data?.data?.wallet;
      const newBalance = walletData?.balance || 0;
      const newUsdcBalance = walletData?.usdcBalance || 0;
      
      // Save to cache
      saveCachedBalance(newBalance, newUsdcBalance);
      
      setState((prev) => ({
        ...prev,
        assets: walletData?.assets || [],
        balance: newBalance,
        usdcBalance: newUsdcBalance,
        isLoading: false,
        isInitialLoad: false,
      }));
    } catch (error: any) {
      console.error('Fetch wallet error:', error);
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
      const response = await hostfiWalletService.getTransactions(params);
      // Backend returns { success: true, data: { transactions: [...] } }
      setState((prev) => ({
        ...prev,
        transactions: response.data?.data?.transactions || [],
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

  const fetchBanks = useCallback(async (countryCode: string = 'NG') => {
    try {
      const response = await hostfiWalletService.getBanks(countryCode);
      setState((prev) => ({
        ...prev,
        banks: response.data?.data?.banks || [],
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch banks');
    }
  }, []);

  const fetchBeneficiaries = useCallback(async () => {
    try {
      const response = await hostfiWalletService.getBeneficiaries();
      setState((prev) => ({
        ...prev,
        beneficiaries: response.data?.data?.beneficiaries || [],
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch beneficiaries');
    }
  }, []);

  const createCryptoAddress = useCallback(async () => {
    try {
      const response = await hostfiWalletService.createCryptoAddress();
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create crypto address');
      throw error;
    }
  }, []);

  const createFiatChannel = useCallback(async (currency: string = 'NGN') => {
    try {
      const response = await hostfiWalletService.createFiatChannel(currency);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create fiat channel');
      throw error;
    }
  }, []);

  const verifyAccount = useCallback(async (bankId: string, accountNumber: string) => {
    try {
      const response = await hostfiWalletService.verifyAccount({ bankId, accountNumber });
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify account');
      throw error;
    }
  }, []);

  const initiateWithdrawal = useCallback(async (data: any) => {
    try {
      const response = await hostfiWalletService.initiateWithdrawal(data);
      toast.success('Withdrawal initiated successfully!');
      // Refresh wallet after withdrawal
      setTimeout(() => {
        fetchWallet(false); // Don't show loading spinner
      }, 1000);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate withdrawal');
      throw error;
    }
  }, [fetchWallet]);

  const addBeneficiary = useCallback(async (data: any) => {
    try {
      const response = await hostfiWalletService.addBeneficiary(data);
      toast.success('Beneficiary added successfully!');
      await fetchBeneficiaries();
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add beneficiary');
      throw error;
    }
  }, [fetchBeneficiaries]);

  const deleteBeneficiary = useCallback(async (id: string) => {
    try {
      await hostfiWalletService.deleteBeneficiary(id);
      toast.success('Beneficiary deleted successfully!');
      await fetchBeneficiaries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete beneficiary');
      throw error;
    }
  }, [fetchBeneficiaries]);

  // Calculate total balance in USD
  const totalBalanceUSD = state.assets.reduce((sum, asset) => sum + (asset.usdEquivalent || 0), 0);

  // Get primary asset (USDC or first asset)
  const primaryAsset = state.assets.find((a) => a.currency === 'USDC') || state.assets[0];

  return {
    ...state,
    totalBalanceUSD: state.balance || totalBalanceUSD,
    primaryAsset,
    fetchWallet,
    fetchTransactions,
    fetchBanks,
    fetchBeneficiaries,
    createCryptoAddress,
    createFiatChannel,
    verifyAccount,
    initiateWithdrawal,
    addBeneficiary,
    deleteBeneficiary,
  };
}
