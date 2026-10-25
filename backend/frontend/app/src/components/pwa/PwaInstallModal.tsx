import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, Download, PlusSquare, MoreVertical, CheckCircle2 } from 'lucide-react';
import { PWA_CONFIG } from '@/pwaConfig';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full max-w-[calc(100%-2rem)] mx-auto p-5 sm:p-6 bg-white dark:bg-[#1a1b1c] rounded-2xl border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[150] sm:max-w-sm"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-col items-center text-center pb-2 border-b-0 space-y-2.5">
          {/* App Brand Icon — directly on modal background with zero box container */}
          <div className="flex items-center justify-center mb-1">
            <img
              src={PWA_CONFIG.icons.mobileLogo}
              alt={PWA_CONFIG.appName}
              className="w-12 h-12 object-contain"
            />
          </div>

          {effectiveMode === 'installed' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>MyArteLab is installed</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
                You are currently running MyArteLab as an installed application on your device.
              </DialogDescription>
            </>
          )}

          {effectiveMode === 'native' && (
            <>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 text-center tracking-tight leading-snug">
                Install MyArteLab App
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
                Add MyArteLab to your home screen for quick access, full-screen creative workflows, and a faster experience.
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
                    <span className="leading-tight">Tap the <Share className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" /> <strong>Share</strong> button in Safari's bottom toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span className="leading-tight">Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" /> <strong>Add to Home Screen</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span className="leading-tight">Tap <strong>Add</strong> in the top-right corner to complete.</span>
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
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                    To install MyArteLab directly from your browser:
                  </p>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span className="leading-tight">Tap the browser menu (<MoreVertical className="w-3.5 h-3.5 inline text-[#9747FF] mx-0.5" /> at the top-right or address bar).</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span className="leading-tight">Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#252628] p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <span className="w-5 h-5 rounded-full bg-[#9747FF]/10 text-[#9747FF] font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span className="leading-tight">Confirm to install and open MyArteLab anytime from your home screen.</span>
                  </div>
                </div>
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-[#DADDE1] dark:border-[#2f3032] mt-2">
          {effectiveMode === 'native' ? (
            <>
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
                onClick={onInstall}
                className="flex-1 sm:flex-none text-xs h-9 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              className="w-full text-xs h-9 px-4 rounded-xl bg-[#9747FF] hover:bg-[#8534f0] text-white font-semibold transition-colors shadow-xs cursor-pointer inline-flex items-center justify-center"
            >
              <span>{effectiveMode === 'installed' ? 'Close' : 'Got it'}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
