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
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="space-y-4">
          <div className={cn('mx-auto w-24 h-24 rounded-full flex items-center justify-center', config.bgClass)}>
            {status === 'pending' ? (
              <img
                src={config.illustration}
                alt={config.title}
                className="w-20 h-20 object-contain"
              />
            ) : (
              <Icon className={cn('w-12 h-12', config.iconClass)} />
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            {title || config.title}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {message || config.message}
          </DialogDescription>
          {reference && (
            <p className="text-sm text-gray-400">
              Reference: <span className="font-mono">{reference}</span>
            </p>
          )}
        </DialogHeader>

        <div className="mt-6 space-y-2">
          {status === 'failed' && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          {status === 'completed' && onViewDetails && (
            <Button
              onClick={onViewDetails}
              variant="outline"
              className="w-full"
            >
              View Details
            </Button>
          )}
          <Button
            onClick={onClose}
            className={cn(
              'w-full',
              status === 'completed'
                ? 'bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            )}
          >
            {status === 'completed' ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
