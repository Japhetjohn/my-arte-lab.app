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
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    assets: [],
    transactions: [],
    banks: [],
    beneficiaries: [],
    isLoading: false,
    error: null,
  });

  const fetchWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await hostfiWalletService.getWallet();
      setState((prev) => ({
        ...prev,
        assets: response.data.assets || [],
        isLoading: false,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch wallet',
      }));
    }
  }, []);

  const fetchTransactions = useCallback(async (params?: { page?: number; limit?: number; type?: string }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await hostfiWalletService.getTransactions(params);
      setState((prev) => ({
        ...prev,
        transactions: response.data.transactions || [],
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
        banks: response.data.banks || [],
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
        beneficiaries: response.data.beneficiaries || [],
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
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate withdrawal');
      throw error;
    }
  }, []);

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
  const totalBalanceUSD = state.assets.reduce((sum, asset) => sum + asset.usdEquivalent, 0);

  // Get primary asset (USDC or first asset)
  const primaryAsset = state.assets.find((a) => a.currency === 'USDC') || state.assets[0];

  return {
    ...state,
    totalBalanceUSD,
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
