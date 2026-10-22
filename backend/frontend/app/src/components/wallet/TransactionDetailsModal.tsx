import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/components/ui/sonner';
import { walletService } from '@/lib/api';
import type { Transaction } from '@/types';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDetailsModalProps) {
  const isMobile = useIsMobile();
  const [enrichedTx, setEnrichedTx] = useState<Transaction | null>(transaction);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Synchronize with selected transaction and fetch authoritative backend details
  useEffect(() => {
    if (!isOpen || !transaction) {
      setEnrichedTx(null);
      return;
    }

    setEnrichedTx(transaction);

    const txId = transaction.transactionId || transaction.id || transaction._id;
    if (!txId) return;

    let isMounted = true;
    walletService.getTransactionDetails(txId)
      .then((res) => {
        if (isMounted && res.data?.data) {
          setEnrichedTx(res.data.data);
        }
      })
      .catch(() => {
        // Retain initial transaction data if endpoint fails
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) {
    return null;
  }

  const currentTx = enrichedTx || transaction;

  // Format currency and amount
  const rawAmount = Number(currentTx.amount) || 0;
  const currency = (currentTx.currency || 'USDC').toUpperCase();
  const isDeposit = currentTx.type === 'deposit' || currentTx.type === 'transfer_in' || currentTx.type === 'earning';
  const isWithdrawal = currentTx.type === 'withdrawal' || currentTx.type === 'transfer_out' || currentTx.type === 'payment';

  const formatAmountString = () => {
    const sign = isDeposit ? '+' : isWithdrawal ? '-' : '';
    if (currency === 'NGN') {
      return `${sign}₦${rawAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${sign}$${rawAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  // Human-readable transaction type title
  const getTypeLabel = () => {
    switch (currentTx.type) {
      case 'deposit':
        return currentTx.paymentMethod === 'solana_direct' || currentTx.blockchainNetwork === 'SOLANA'
          ? 'Solana USDC Deposit'
          : 'Wallet Deposit';
      case 'withdrawal':
        return currentTx.paymentMethod === 'bank_transfer'
          ? 'Bank Withdrawal'
          : 'Wallet Withdrawal';
      case 'transfer_in':
        return 'Transfer Received';
      case 'transfer_out':
        return 'Transfer Sent';
      case 'payment':
        return 'Payment';
      case 'earning':
        return 'Creator Earning';
      case 'escrow':
        return 'Escrow Hold';
      case 'refund':
        return 'Refund';
      default:
        return 'Transaction';
    }
  };

  // Status message
  const statusStr = (currentTx.status || '').toLowerCase();
  const isCompleted = statusStr === 'completed' || statusStr === 'success';
  const isProcessing = statusStr === 'processing' || statusStr === 'reserved';
  const isFailed = statusStr === 'failed' || statusStr === 'cancelled' || statusStr === 'reversed';

  const getResultMessage = () => {
    if (isCompleted) {
      return 'Transaction completed successfully.';
    }
    if (isProcessing) {
      return 'Transaction is currently processing and will settle shortly.';
    }
    if (isFailed) {
      return currentTx.errorMessage || 'Transaction could not be completed. Any reserved balance was restored.';
    }
    return 'Transaction is pending confirmation.';
  };

  // Copy to clipboard helper matching AddFundsModal pattern
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Date formatting
  const dateObj = currentTx.createdAt || currentTx.completedAt ? new Date(currentTx.completedAt || currentTx.createdAt) : null;
  const formattedDate = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  // On-chain Solana explorer link
  const rawSig = currentTx.transactionHash || currentTx.metadata?.signature || (currentTx.blockchainNetwork === 'SOLANA' && currentTx.reference?.length && currentTx.reference.length > 40 ? currentTx.reference : null);
  const solanaSignature = (rawSig && /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(rawSig)) ? rawSig : null;

  // Structured content matching AddFundsModal layout
  const content = (
    <div className="flex flex-col h-full max-h-[90dvh] sm:max-h-[85vh] overflow-hidden text-gray-900 dark:text-gray-100">
      {/* 1. Header Bar: Title and Close Button */}
      <div className="shrink-0 flex items-center justify-between pb-3.5 pt-1 border-b border-[#DADDE1] dark:border-[#2f3032] bg-white dark:bg-[#1a1b1c]">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            Transaction Details
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Body: Content scrolls freely while Header & Footer stay fixed */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-4 px-0.5 space-y-4">
        {/* Top Summary Card (Reusing AddFundsModal quote card styling) */}
        <div className="text-center py-4 bg-gray-50/60 dark:bg-[#121212] rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
            {getTypeLabel()}
          </p>

          <div className="flex items-baseline justify-center mt-1">
            <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              {formatAmountString()}
            </span>
            <span className="text-xs font-semibold text-[#9747FF] bg-purple-50 dark:bg-[#9747FF]/15 border border-purple-200/60 dark:border-purple-800/60 px-2 py-0.5 rounded-md ml-2">
              {currency}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center pt-1">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </span>
            ) : isProcessing ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                Processing
              </span>
            ) : isFailed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200/70">
                <AlertCircle className="w-3.5 h-3.5" />
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/70">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </span>
            )}
          </div>

          {/* Result / Success message */}
          <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto px-2 pt-1 leading-relaxed">
            {getResultMessage()}
          </p>
        </div>

        {/* Structured Details Card (Reusing AddFundsModal recipient details card styling) */}
        <div className="bg-white dark:bg-[#121212] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-2xs divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden text-sm">
          {/* Reference */}
          {(currentTx.reference || currentTx.transactionId) && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">Reference</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px] sm:max-w-[200px]" title={currentTx.reference || currentTx.transactionId}>
                  {currentTx.reference || currentTx.transactionId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentTx.reference || currentTx.transactionId || '', 'Reference')}
                  className="h-7 px-2.5 text-xs text-[#9747FF] hover:bg-purple-50 rounded-md flex items-center gap-1 font-semibold transition-colors cursor-pointer shrink-0"
                  aria-label="Copy reference"
                >
                  {copiedField === 'Reference' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedField === 'Reference' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Date & Time */}
          {formattedDate && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Date & Time</span>
              <span className="text-gray-900 font-semibold text-right">
                {formattedDate}
              </span>
            </div>
          )}

          {/* Payment Method / Channel */}
          {currentTx.paymentMethod && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Payment Method</span>
              <span className="text-gray-900 font-semibold text-right">
                {currentTx.paymentMethod === 'bank_transfer'
                  ? 'Bank Transfer'
                  : currentTx.paymentMethod === 'solana_direct'
                  ? 'Solana Mainnet (Direct)'
                  : currentTx.paymentMethod.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {/* Destination Bank Name (for bank withdrawals) */}
          {currentTx.beneficiary?.bankName && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Destination Bank</span>
              <span className="text-gray-900 font-semibold text-right">
                {currentTx.beneficiary.bankName}
              </span>
            </div>
          )}

          {/* Masked Account Number (for bank withdrawals) */}
          {currentTx.beneficiary?.accountNumberMasked && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Account Number</span>
              <span className="font-mono text-gray-900 font-bold text-right tracking-wider">
                {currentTx.beneficiary.accountNumberMasked}
              </span>
            </div>
          )}

          {/* Account Holder Name (for bank withdrawals) */}
          {currentTx.beneficiary?.accountName && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Account Name</span>
              <span className="text-gray-900 font-semibold text-right truncate max-w-[180px] sm:max-w-[220px]">
                {currentTx.beneficiary.accountName}
              </span>
            </div>
          )}

          {/* Destination Payout Amount (fiat payout) */}
          {currentTx.destinationAmount !== undefined && currentTx.destinationAmount > 0 && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Payout Amount</span>
              <span className="text-gray-900 font-semibold text-right">
                {currentTx.destinationCurrency === 'NGN' ? '₦' : ''}
                {Number(currentTx.destinationAmount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                {currentTx.destinationCurrency || 'NGN'}
              </span>
            </div>
          )}

          {/* Exchange Rate */}
          {currentTx.exchangeRate !== undefined && currentTx.exchangeRate > 0 && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Exchange Rate</span>
              <span className="text-gray-900 font-semibold text-right">
                1 USDC ≈ ₦{Number(currentTx.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NGN
              </span>
            </div>
          )}

          {/* Counterparty (for internal transfers) */}
          {currentTx.counterparty && (currentTx.counterparty.name || currentTx.counterparty.email) && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">
                {currentTx.type === 'transfer_out' ? 'Recipient' : 'Sender'}
              </span>
              <span className="text-gray-900 font-semibold text-right truncate max-w-[180px] sm:max-w-[220px]">
                {currentTx.counterparty.name || currentTx.counterparty.email}
              </span>
            </div>
          )}

          {/* Internal Transfer Note */}
          {currentTx.counterparty?.note && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Note</span>
              <span className="text-gray-900 font-semibold text-right italic truncate max-w-[180px] sm:max-w-[220px]">
                &quot;{currentTx.counterparty.note}&quot;
              </span>
            </div>
          )}

          {/* Fees (only show if applicable and > 0) */}
          {currentTx.fee !== undefined && Number(currentTx.fee) > 0 && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Fee</span>
              <span className="text-gray-900 font-semibold text-right">
                ${Number(currentTx.fee).toFixed(2)} USDC
              </span>
            </div>
          )}

          {/* Solana Block Explorer Link (only if valid on-chain signature exists) */}
          {solanaSignature && (
            <div className="flex items-center justify-between px-4 py-3.5 gap-2">
              <span className="text-gray-500 font-medium shrink-0">Blockchain Record</span>
              <a
                href={`https://solscan.io/tx/${solanaSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#9747FF] hover:text-[#8535ed] hover:underline transition-colors"
              >
                <span>View on Solscan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 3. Fixed Action Footer: Reusing AddFundsModal fixed footer button pattern */}
      <div className="shrink-0 bg-white dark:bg-[#1a1b1c] border-t border-[#DADDE1] dark:border-[#2f3032] pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)]">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-12 bg-[#9747FF] hover:bg-[#8535ed] text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center cursor-pointer shadow-2xs"
        >
          Close
        </button>
      </div>
    </div>
  );

  // Responsive presentation: Mobile Bottom Sheet (Drawer) vs Desktop Modal (Dialog)
  // Exactly matching AddFundsModal's responsive implementation
  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        repositionInputs={false}
      >
        <DrawerContent className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-t-2xl max-h-[90dvh] flex flex-col p-5 pb-0 border-t border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]">
          <DrawerTitle className="sr-only">Transaction Details</DrawerTitle>
          <DrawerDescription className="sr-only">
            View transaction details and receipt
          </DrawerDescription>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white dark:bg-[#1a1b1c] text-gray-900 dark:text-gray-100 rounded-2xl max-h-[85vh] sm:max-w-[460px] flex flex-col p-6 pb-0 border border-[#DADDE1] dark:border-[#2f3032] shadow-xl focus:outline-none z-[150]"
      >
        <DialogTitle className="sr-only">Transaction Details</DialogTitle>
        <DialogDescription className="sr-only">
          View transaction details and receipt
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
