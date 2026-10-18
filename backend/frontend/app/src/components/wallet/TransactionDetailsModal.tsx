import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
  XCircle,
  Building2,
  Check,
  X
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { walletService } from '@/lib/api';
import type { Transaction, TransactionTimelineEvent } from '@/types';

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Synchronize with passed transaction and fetch enriched details
  useEffect(() => {
    if (!isOpen || !transaction) {
      setEnrichedTx(null);
      return;
    }

    setEnrichedTx(transaction);

    // Fetch enriched details from backend with ownership check
    const txId = transaction.id || transaction._id || transaction.transactionId || transaction.reference;
    if (txId) {
      walletService
        .getTransactionDetails(txId)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setEnrichedTx(res.data.data);
          }
        })
        .catch(() => {
          // Non-blocking fallback: retains initial passed transaction object
        });
    }
  }, [isOpen, transaction]);

  if (!transaction) return null;

  const currentTx = enrichedTx || transaction;
  const rawType = (currentTx.type || '').toLowerCase();
  const rawStatus = (currentTx.status || 'completed').toLowerCase();
  const desc = (currentTx.description || '').toLowerCase();

  // Determine credit vs debit
  const isCredit =
    rawType === 'deposit' ||
    rawType === 'onramp' ||
    rawType === 'transfer_in' ||
    rawType === 'earning' ||
    rawType === 'bonus' ||
    rawType === 'refund' ||
    desc.includes('deposit') ||
    desc.includes('received');

  const isEscrow = rawType === 'escrow' || rawType === 'booking' || rawType === 'payment' || desc.includes('escrow');
  const isRefund = rawType === 'refund' || rawType === 'reversal';
  const isWithdrawal = rawType === 'withdrawal' || rawType === 'offramp' || desc.includes('withdraw') || desc.includes('offramp') || desc.includes('payout');
  const isInternalTransfer = rawType === 'transfer_in' || rawType === 'transfer_out' || currentTx.paymentMethod === 'internal_transfer';

  // Amount formatting
  const amount = Math.abs(parseFloat(String(currentTx.amount)) || 0);
  const currency = (currentTx.currency || 'USDC').toUpperCase();
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  // Date formatting
  const txDate = currentTx.createdAt ? new Date(currentTx.createdAt) : new Date();
  const formattedDate = !isNaN(txDate.getTime())
    ? txDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const formattedTime = !isNaN(txDate.getTime())
    ? txDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          icon: CheckCircle2,
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
          dot: 'bg-emerald-500',
        };
      case 'processing':
        return {
          label: 'Processing',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
          dot: 'bg-amber-500',
        };
      case 'pending':
        return {
          label: 'Pending',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
          dot: 'bg-amber-500',
        };
      case 'failed':
        return {
          label: 'Failed',
          icon: XCircle,
          bg: 'bg-red-50 text-red-700 border-red-200/60',
          dot: 'bg-red-500',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: XCircle,
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          dot: 'bg-gray-400',
        };
      default:
        return {
          label: status.charAt(0).toUpperCase() + status.slice(1),
          icon: Clock,
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          dot: 'bg-gray-400',
        };
    }
  };

  const statusBadge = getStatusBadge(rawStatus);
  const StatusIcon = statusBadge.icon;

  // Contextual Title & Subtitle
  const getContextualHeadline = () => {
    if (isWithdrawal) {
      return currentTx.beneficiary?.bankName
        ? `Payout to ${currentTx.beneficiary.bankName}`
        : 'Bank Withdrawal';
    }
    if (rawType === 'transfer_out') {
      return currentTx.counterparty?.name
        ? `Sent to ${currentTx.counterparty.name}`
        : 'Money Sent';
    }
    if (rawType === 'transfer_in') {
      return currentTx.counterparty?.name
        ? `Received from ${currentTx.counterparty.name}`
        : 'Money Received';
    }
    if (isRefund) return 'Refund Processed';
    if (isEscrow) return 'Booking Escrow Payment';
    if (rawType === 'deposit' || desc.includes('deposit')) {
      return currentTx.paymentMethod === 'solana_direct' || currentTx.blockchainNetwork === 'SOLANA'
        ? 'Solana USDC Deposit'
        : 'Wallet Funding Deposit';
    }
    return currentTx.description || 'Transaction Details';
  };

  // Copy helper
  const handleCopy = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Solscan URL
  const solanaSignature =
    currentTx.transactionHash ||
    currentTx.metadata?.signature ||
    (currentTx.blockchainNetwork === 'SOLANA' && currentTx.reference && currentTx.reference.length >= 64
      ? currentTx.reference
      : null);

  const solscanUrl = currentTx.solscanUrl || (solanaSignature ? `https://solscan.io/tx/${solanaSignature}` : null);

  // Synthesize or use authoritative timeline
  const timeline: TransactionTimelineEvent[] =
    currentTx.timeline && currentTx.timeline.length > 0
      ? currentTx.timeline
      : [
          {
            title: 'Transaction Initiated',
            description: currentTx.description || 'Transaction submitted to ledger',
            timestamp: currentTx.createdAt || new Date().toISOString(),
            status: 'completed',
          },
          ...(rawStatus === 'completed'
            ? [
                {
                  title: 'Transaction Completed',
                  description: 'Confirmed and settled successfully',
                  timestamp: currentTx.completedAt || currentTx.updatedAt || currentTx.createdAt,
                  status: 'completed' as const,
                },
              ]
            : rawStatus === 'failed'
            ? [
                {
                  title: 'Transaction Failed',
                  description: currentTx.errorMessage || currentTx.failureReason || 'Failed to complete',
                  timestamp: currentTx.failedAt || currentTx.updatedAt || currentTx.createdAt,
                  status: 'failed' as const,
                },
              ]
            : [
                {
                  title: 'Processing',
                  description: 'Awaiting provider confirmation',
                  timestamp: currentTx.updatedAt || currentTx.createdAt,
                  status: 'processing' as const,
                },
              ]),
        ];

  // Inner Content for Modal / Drawer
  const content = (
    <div className="space-y-5 px-1 py-1 max-w-full">
      {/* 1. HERO SUMMARY SECTION (Reference Screenshot Layout with MyArteLab Branding) */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#F9F5FF] to-white border border-[#E9D7FE]/50 p-6 text-center overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#9747FF]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Circular Avatar / Action Icon with direction badge */}
        <div className="relative mx-auto w-16 h-16 rounded-full bg-white border border-[#E9D7FE] shadow-sm flex items-center justify-center mb-3">
          {isEscrow ? (
            <Lock className="w-7 h-7 text-[#9747FF]" />
          ) : isRefund ? (
            <RefreshCw className="w-7 h-7 text-emerald-600" />
          ) : isCredit ? (
            <ArrowDownLeft className="w-7 h-7 text-emerald-600" />
          ) : isWithdrawal ? (
            <Building2 className="w-7 h-7 text-[#9747FF]" />
          ) : (
            <ArrowUpRight className="w-7 h-7 text-gray-700" />
          )}

          {/* Sub-badge indicating token / network */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#9747FF] text-white flex items-center justify-center text-[10px] font-bold shadow-xs border-2 border-white">
            {currency === 'USDC' ? '$' : '₦'}
          </div>
        </div>

        {/* Context Title */}
        <h3 className="text-sm font-semibold text-gray-700 mb-1 truncate px-2" title={getContextualHeadline()}>
          {getContextualHeadline()}
        </h3>

        {/* Prominent Amount Display */}
        <div className="flex items-baseline justify-center gap-1 my-1">
          <span
            className={cn(
              'text-3xl sm:text-4xl font-extrabold tracking-tight',
              isCredit ? 'text-emerald-600' : 'text-gray-900'
            )}
          >
            {isCredit ? '+' : '−'}${formattedAmount}
          </span>
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {currency}
          </span>
        </div>

        {/* Status Badge Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mt-2 shadow-2xs transition-colors"
          style={{}}
        >
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', statusBadge.bg)}>
            <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusBadge.dot)} />
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusBadge.label}</span>
          </span>
        </div>

        {/* Secondary Destination (e.g. NGN Payout for bank off-ramp) */}
        {currentTx.destinationAmount && (
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Payout:{' '}
            <span className="font-semibold text-gray-900">
              ₦{Number(currentTx.destinationAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NGN
            </span>
            {currentTx.exchangeRate && (
              <span className="text-gray-400 text-[11px] ml-1.5">
                (@ ₦{Number(currentTx.exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })}/USDC)
              </span>
            )}
          </p>
        )}

        {/* Date and Time */}
        <p className="text-xs text-gray-400 mt-2">
          {formattedDate} {formattedTime && `· ${formattedTime}`}
        </p>
      </div>

      {/* 2. TRANSACTION INFORMATION CARD */}
      <div className="rounded-2xl bg-white border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5 text-xs sm:text-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 pb-1 border-b border-gray-100">
          Transaction Information
        </h4>

        {/* Reference / Transaction ID with Copy */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500 shrink-0">Reference</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs text-gray-800 truncate" title={currentTx.transactionId || currentTx.reference || currentTx.id}>
              {currentTx.transactionId || currentTx.reference || currentTx.id}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(currentTx.transactionId || currentTx.reference || currentTx.id, 'Transaction reference', 'ref')}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors shrink-0"
              title="Copy reference"
              aria-label="Copy reference"
            >
              {copiedKey === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Payment method</span>
          <span className="font-medium text-gray-900 text-right">
            {isWithdrawal && currentTx.beneficiary?.bankName
              ? `Bank Transfer (${currentTx.beneficiary.bankName})`
              : currentTx.paymentMethod === 'solana_direct' || currentTx.blockchainNetwork === 'SOLANA'
              ? 'Solana Network (USDC)'
              : isInternalTransfer
              ? 'MyArteLab Internal Transfer'
              : currentTx.paymentMethod
              ? currentTx.paymentMethod.replace(/_/g, ' ')
              : 'Direct Transfer'}
          </span>
        </div>

        {/* Bank Details (if bank offramp) */}
        {currentTx.beneficiary?.accountNumberMasked && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">Destination Account</span>
            <span className="font-medium text-gray-900 text-right">
              {currentTx.beneficiary.bankName} · {currentTx.beneficiary.accountNumberMasked}
            </span>
          </div>
        )}

        {/* Counterparty (if internal transfer) */}
        {currentTx.counterparty?.name && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500">{rawType === 'transfer_out' ? 'Recipient' : 'Sender'}</span>
            <span className="font-medium text-gray-900 text-right">
              {currentTx.counterparty.name}
              {currentTx.counterparty.email && <span className="text-gray-400 text-xs block font-normal">{currentTx.counterparty.email}</span>}
            </span>
          </div>
        )}

        {/* Transfer Note (if internal transfer) */}
        {currentTx.counterparty?.note && (
          <div className="flex items-start justify-between gap-2">
            <span className="text-gray-500 shrink-0">Note</span>
            <span className="text-gray-700 text-right italic font-normal max-w-[200px] break-words">
              "{currentTx.counterparty.note}"
            </span>
          </div>
        )}

        {/* Fee (if applicable and charged) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-gray-500">Network / Platform fee</span>
          <span className="font-medium text-gray-900">
            {currentTx.fee !== undefined && currentTx.fee > 0
              ? `$${Number(currentTx.fee).toFixed(2)} ${currency}`
              : '$0.00 (Free)'}
          </span>
        </div>

        {/* On-Chain Transaction Signature (if crypto) */}
        {solanaSignature && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
            <span className="text-gray-500 shrink-0">Solana Signature</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-xs text-gray-800 truncate max-w-[140px] sm:max-w-[180px]" title={solanaSignature}>
                {solanaSignature.slice(0, 8)}...{solanaSignature.slice(-8)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(solanaSignature, 'Solana signature', 'sig')}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors shrink-0"
                title="Copy signature"
                aria-label="Copy signature"
              >
                {copiedKey === 'sig' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. TRANSACTION ACTIVITY TIMELINE (Replacing Reference Chat Section) */}
      <div className="rounded-2xl bg-white border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Activity Timeline
          </h4>
          <span className="text-[11px] text-gray-400">Verified audit trail</span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
          {timeline.map((step, idx) => {
            const isFailedStep = step.status === 'failed';
            const isProcessingStep = step.status === 'processing';
            const stepDate = step.timestamp ? new Date(step.timestamp) : null;
            const formattedStepTime = stepDate && !isNaN(stepDate.getTime())
              ? `${stepDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${stepDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
              : null;

            return (
              <div key={idx} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={cn(
                    'absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-xs',
                    isFailedStep
                      ? 'bg-red-500'
                      : isProcessingStep
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500'
                  )}
                >
                  {isFailedStep ? (
                    <X className="w-3 h-3 stroke-[3]" />
                  ) : isProcessingStep ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  ) : (
                    <Check className="w-3 h-3 stroke-[3]" />
                  )}
                </div>

                {/* Event Details */}
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
                      {step.title}
                    </p>
                    {formattedStepTime && (
                      <span className="text-[10px] sm:text-[11px] text-gray-400 shrink-0 font-medium">
                        {formattedStepTime}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Hash link if attached to timeline step */}
                  {step.hash && (
                    <a
                      href={`https://solscan.io/tx/${step.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9747FF] hover:underline mt-1"
                    >
                      <span>View on Solscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIONS FOOTER */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
        {solscanUrl && (
          <a
            href={solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 h-11 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#9747FF] border border-purple-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Open in Solscan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <button
          type="button"
          onClick={() => handleCopy(currentTx.transactionId || currentTx.reference || currentTx.id, 'Transaction reference', 'footer_ref')}
          className={cn(
            'w-full h-11 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer',
            solscanUrl
              ? 'sm:flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
              : 'bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-xs'
          )}
        >
          {copiedKey === 'footer_ref' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedKey === 'footer_ref' ? 'Reference Copied' : 'Copy Reference'}</span>
        </button>
      </div>
    </div>
  );

  // Responsive Drawer (Mobile) vs Dialog (Desktop)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[92vh] bg-gray-50/50 p-0 focus:outline-none">
          <DrawerHeader className="px-5 pt-3 pb-2 border-b border-gray-100 bg-white sticky top-0 z-10 text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-base font-bold text-gray-900">
                  Transaction Details
                </DrawerTitle>
                <DrawerDescription className="text-xs text-gray-400 mt-0.5">
                  Verified ledger record
                </DrawerDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto overscroll-contain p-4 pb-12">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-gray-50/40 p-5 rounded-3xl border border-gray-200/80 shadow-2xl focus:outline-none">
        <DialogHeader className="pb-2 border-b border-gray-100 text-left">
          <DialogTitle className="text-lg font-bold text-gray-900">
            Transaction Details
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mt-0.5">
            Verified ledger record and activity timeline
          </DialogDescription>
        </DialogHeader>

        {content}
      </DialogContent>
    </Dialog>
  );
}
