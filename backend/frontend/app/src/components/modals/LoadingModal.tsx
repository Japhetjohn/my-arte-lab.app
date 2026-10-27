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
}: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-xs text-center border-none bg-transparent shadow-none" showCloseButton={false}>
        <div className="py-6 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
