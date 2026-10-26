import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning' | 'info';
  isLoading?: boolean;
  icon?: React.ReactNode;
  showCancel?: boolean;
  maxWidth?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  icon,
  showCancel = true,
  maxWidth = 'sm:max-w-sm',
}: ConfirmationModalProps) {
  const getIcon = () => {
    if (icon) return icon;
    if (variant === 'destructive') {
      return (
        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mb-1">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    if (variant === 'warning') {
      return (
        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-1">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }
    return null;
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'destructive') {
      return 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700';
    }
    return 'bg-[#9747FF] hover:bg-[#8534f0] text-white';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent
        className={cn(
          'w-full max-w-[calc(100%-2rem)] mx-auto p-5 sm:p-6 bg-white dark:bg-[#1a1b1c] rounded-2xl border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150]',
          maxWidth
        )}
        showCloseButton={!isLoading}
      >
        <DialogHeader className="flex flex-col items-center text-center pb-2 border-b-0 space-y-2">
          {getIcon()}
          <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs sm:max-w-sm">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] mt-1 sm:mt-2">
          {showCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none text-xs h-9 px-4 rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              'flex-1 sm:flex-none text-xs font-semibold h-9 px-5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5',
              getConfirmButtonClasses()
            )}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" variant="current" />
                <span>Processing...</span>
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
