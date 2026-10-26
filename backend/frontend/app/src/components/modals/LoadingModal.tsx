import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

export function LoadingModal({
  isOpen,
  message = 'Loading...',
  subMessage,
}: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
        <div className="py-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mb-5">
            <Spinner size="lg" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {message}
          </h3>
          {subMessage && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subMessage}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
