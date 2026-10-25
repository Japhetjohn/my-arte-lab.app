import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, Download } from 'lucide-react';
import { PWA_CONFIG } from '@/pwaConfig';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS?: boolean;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  onInstall,
  isIOS = false,
}: PwaInstallModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] mx-auto p-5 sm:p-6 bg-white dark:bg-[#1a1b1c] rounded-2xl border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150] sm:max-w-sm"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-col items-center text-center pb-2 border-b-0 space-y-2.5">
          {/* App Brand Icon */}
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-[#9747FF]/20 flex items-center justify-center p-2 mb-1 shadow-xs">
            <img
              src={PWA_CONFIG.icons.mobileLogo}
              alt={PWA_CONFIG.appName}
              className="w-full h-full object-contain"
            />
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
            {isIOS ? 'Keep MyArteLab close' : 'Take MyArteLab with you'}
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
            {isIOS ? (
              <span className="flex flex-col gap-1.5 items-center">
                <span>Add MyArteLab to your Home Screen for a faster, app-like experience.</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#252628] px-2.5 py-1 rounded-lg mt-1">
                  Tap <Share className="w-3.5 h-3.5 text-[#9747FF]" /> Share, then &quot;Add to Home Screen&quot;
                </span>
              </span>
            ) : (
              'Add MyArteLab to your Home Screen for quick access and a faster creative experience.'
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none text-xs h-9 px-4 rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Not now
          </Button>

          <Button
            type="button"
            onClick={isIOS ? onClose : onInstall}
            className="flex-1 sm:flex-none text-xs h-9 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            {isIOS ? (
              'Got it'
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
