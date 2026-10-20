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
      <DialogContent className="sm:max-w-md text-center p-6 sm:p-8 rounded-3xl">
        <DialogHeader className="space-y-4">
          <div className="mx-auto my-2">
            <img
              src={illustration}
              alt="Success"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain mx-auto"
            />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <Button
            onClick={onAction || onClose}
            className="w-full bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-full h-12 font-semibold shadow-md shadow-[#9747FF]/20 cursor-pointer"
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
