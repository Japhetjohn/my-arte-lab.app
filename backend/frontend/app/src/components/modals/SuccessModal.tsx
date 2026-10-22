import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  actionLabel = 'Continue',
  onAction,
  illustration = '/images/undraw_opened_47gd.svg',
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-6 sm:p-8">
        <DialogHeader className="space-y-3 pb-0 border-b-0 text-center sm:text-center">
          <div className="mx-auto my-2">
            <img
              src={illustration}
              alt="Success"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain mx-auto"
            />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed text-center">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 pt-4 border-t border-[#DADDE1] dark:border-[#2f3032]">
          <Button
            onClick={onAction || onClose}
            className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-xl h-12 font-semibold shadow-xs cursor-pointer"
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
