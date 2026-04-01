import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

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
        <div className="py-8">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <img
              src="/images/loading-spinner.png"
              alt="Loading"
              className="w-full h-full object-contain animate-pulse"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#8A2BE2] animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          {subMessage && (
            <p className="text-sm text-gray-500">{subMessage}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
