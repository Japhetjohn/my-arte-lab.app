import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type TransactionStatus = 'pending' | 'completed' | 'failed';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TransactionStatus;
  title?: string;
  message?: string;
  reference?: string;
  onRetry?: () => void;
  onViewDetails?: () => void;
}

const statusConfig = {
  pending: {
    illustration: '/images/transaction-pending.png',
    title: 'Processing Transaction',
    message: 'Please wait while we process your transaction...',
    icon: Loader2,
    iconClass: 'animate-spin text-amber-500',
    bgClass: 'bg-amber-50',
  },
  completed: {
    illustration: '/images/success-confetti.png',
    title: 'Transaction Successful!',
    message: 'Your transaction has been completed successfully.',
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50',
  },
  failed: {
    illustration: '/images/transaction-failed.png',
    title: 'Transaction Failed',
    message: 'We were unable to complete your transaction. Please try again.',
    icon: XCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50',
  },
};

export function TransactionStatusModal({
  isOpen,
  onClose,
  status,
  title,
  message,
  reference,
  onRetry,
  onViewDetails,
}: TransactionStatusModalProps) {
  const [, setShowConfetti] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  useEffect(() => {
    if (status === 'completed') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-6 sm:p-8">
        <DialogHeader className="space-y-3 pb-0 border-b-0 text-center sm:text-center">
          <div className={cn('mx-auto w-20 h-20 rounded-full flex items-center justify-center', config.bgClass)}>
            {status === 'pending' ? (
              <img
                src={config.illustration}
                alt={config.title}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Icon className={cn('w-10 h-10', config.iconClass)} />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
            {title || config.title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm text-center">
            {message || config.message}
          </DialogDescription>
          {reference && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Reference: <span className="font-mono">{reference}</span>
            </p>
          )}
        </DialogHeader>

        <div className="mt-4 pt-4 border-t border-[#DADDE1] dark:border-[#2f3032] space-y-2">
          {status === 'failed' && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="w-full gap-2 rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          {status === 'completed' && onViewDetails && (
            <Button
              onClick={onViewDetails}
              variant="outline"
              className="w-full rounded-xl dark:border-[#2f3032] dark:text-gray-300 dark:hover:bg-gray-800"
            >
              View Details
            </Button>
          )}
          <Button
            onClick={onClose}
            className={cn(
              'w-full rounded-xl font-semibold',
              status === 'completed'
                ? 'bg-[#9747FF] hover:bg-[#8534f0] text-white'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            )}
          >
            {status === 'completed' ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
