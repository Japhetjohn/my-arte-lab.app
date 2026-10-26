import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react';
import type { PwaModalMode } from '@/hooks/usePwaInstall';

export interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  mode?: PwaModalMode;
  isIOS?: boolean;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  onInstall,
  mode = 'native',
  isIOS = false,
}: PwaInstallModalProps) {
  const effectiveMode: PwaModalMode = mode || (isIOS ? 'instructions-ios' : 'native');

  const handleInstallClick = () => {
    // 1. Immediately close this modal so it doesn't block or overlay the native browser prompt
    onClose();
    // 2. Invoke the real PWA install controller
    onInstall();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] mx-auto p-5 sm:p-6 bg-white dark:bg-[#1a1b1c] rounded-2xl border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150] sm:max-w-sm"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-col items-center text-center pb-2 border-b-0 space-y-2">
          {/* Circular Icon Container matching Logout Confirmation Modal visual pattern */}
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#9747FF] flex items-center justify-center shrink-0 mb-1">
            {effectiveMode === 'installed' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Download className="w-5 h-5 text-[#9747FF]" />
            )}
          </div>

          {effectiveMode === 'installed' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
                MyArteLab is installed
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
                You are running MyArteLab as an installed application on your device.
              </DialogDescription>
            </>
          )}

          {effectiveMode === 'native' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
                Install MyArteLab
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs sm:max-w-sm">
                Add MyArteLab to your home screen for quick access and a full-screen app experience.
              </DialogDescription>
            </>
          )}

          {effectiveMode === 'instructions-ios' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
                Install on iPhone or iPad
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs asChild">
                <div className="flex flex-col gap-2 text-left pt-1">
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span className="leading-tight">Tap the <Share className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" /> <strong>Share</strong> button in Safari toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span className="leading-tight">Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" /> <strong>Add to Home Screen</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span className="leading-tight">Tap <strong>Add</strong> in the top-right corner.</span>
                  </div>
                </div>
              </DialogDescription>
            </>
          )}

          {effectiveMode === 'instructions-browser' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
                Add to Home Screen
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs asChild">
                <div className="flex flex-col gap-2 text-left pt-1">
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span className="leading-tight">Tap the browser menu (<MoreVertical className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" />).</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span className="leading-tight">Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                  </div>
                </div>
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] mt-1 sm:mt-2">
          {effectiveMode === 'native' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none text-xs h-9 px-4 rounded-xl border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleInstallClick}
                className="flex-1 sm:flex-none text-xs font-semibold h-9 px-5 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              className="w-full text-xs font-semibold h-9 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center"
            >
              <span>{effectiveMode === 'installed' ? 'Close' : 'Got it'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
