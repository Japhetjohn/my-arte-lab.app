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
  illustration = '/images/success-confetti.png',
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="space-y-4">
          <div className="mx-auto">
            <img
              src={illustration}
              alt="Success"
              className="w-32 h-32 object-contain mx-auto"
            />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <Button
            onClick={onAction || onClose}
            className="w-full bg-[#8A2BE2] hover:bg-[#7B1FD1] text-white"
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
