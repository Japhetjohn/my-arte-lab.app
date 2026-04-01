import { z } from 'zod';

// Deposit schemas
export const cryptoDepositSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('USDC'),
});

export type CryptoDepositFormData = z.infer<typeof cryptoDepositSchema>;

export const fiatDepositSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('NGN'),
});

export type FiatDepositFormData = z.infer<typeof fiatDepositSchema>;

// Withdrawal schemas
export const bankWithdrawalSchema = z.object({
  method: z.literal('bank'),
  bankId: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  saveAsBeneficiary: z.boolean().optional(),
  beneficiaryName: z.string().optional(),
});

export const mobileMoneyWithdrawalSchema = z.object({
  method: z.literal('mobile_money'),
  provider: z.enum(['mtn', 'airtel', 'glo', '9mobile']),
  phoneNumber: z.string().min(11, 'Phone number must be at least 11 digits').max(11, 'Phone number must be 11 digits'),
  amount: z.number().positive('Amount must be greater than 0'),
});

export const cryptoWithdrawalSchema = z.object({
  method: z.literal('crypto'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  network: z.literal('solana'),
  amount: z.number().positive('Amount must be greater than 0'),
});

export const withdrawalSchema = z.discriminatedUnion('method', [
  bankWithdrawalSchema,
  mobileMoneyWithdrawalSchema,
  cryptoWithdrawalSchema,
]);

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>;
export type BankWithdrawalData = z.infer<typeof bankWithdrawalSchema>;
export type MobileMoneyWithdrawalData = z.infer<typeof mobileMoneyWithdrawalSchema>;
export type CryptoWithdrawalData = z.infer<typeof cryptoWithdrawalSchema>;

// Account verification schema
export const accountVerificationSchema = z.object({
  bankId: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(10, 'Account number must be 10 digits'),
});

export type AccountVerificationFormData = z.infer<typeof accountVerificationSchema>;

// Beneficiary schema
export const beneficiarySchema = z.object({
  name: z.string().min(1, 'Beneficiary name is required'),
  bankId: z.string().min(1, 'Please select a bank'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
});

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;

// Types for wallet
export interface WalletAsset {
  id: string;
  currency: string;
  balance: number;
  usdEquivalent: number;
  icon?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'earning' | 'refund';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  usdEquivalent?: number;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  logo?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
}

export interface WithdrawalMethod {
  id: string;
  type: 'bank' | 'mobile_money' | 'crypto';
  name: string;
  icon: string;
  description: string;
  fee: number;
  minAmount: number;
  maxAmount: number;
  processingTime: string;
}

export const WITHDRAWAL_METHODS: WithdrawalMethod[] = [
  {
    id: 'bank',
    type: 'bank',
    name: 'Bank Transfer',
    icon: 'Building2',
    description: 'Transfer to your bank account',
    fee: 0.01,
    minAmount: 1000,
    maxAmount: 10000000,
    processingTime: '1-2 business days',
  },
  {
    id: 'mobile_money',
    type: 'mobile_money',
    name: 'Mobile Money',
    icon: 'Smartphone',
    description: 'Send to mobile money wallet',
    fee: 0.015,
    minAmount: 100,
    maxAmount: 500000,
    processingTime: 'Instant',
  },
  {
    id: 'crypto',
    type: 'crypto',
    name: 'Crypto (Solana)',
    icon: 'Bitcoin',
    description: 'Withdraw to Solana wallet',
    fee: 0.005,
    minAmount: 10,
    maxAmount: 1000000,
    processingTime: '5-30 minutes',
  },
];
