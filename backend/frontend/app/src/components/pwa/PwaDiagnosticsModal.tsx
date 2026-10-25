import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePwaInstall } from '@/contexts/PwaInstallContext';
import { toast } from 'sonner';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

export interface PwaDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PwaDiagnosticsModal({ isOpen, onClose }: PwaDiagnosticsModalProps) {
  const {
    getDiagnostics,
    resetPwaState,
    promptInstall,
    openInstallFlow,
    status,
    modalMode,
    isStandalone,
    isIOS,
    hasNativePrompt,
  } = usePwaInstall();

  const [diagnostics, setDiagnostics] = useState(getDiagnostics());
  const [swRegistrationState, setSwRegistrationState] = useState<{
    registered: boolean;
    state: string;
    scope: string | null;
  }>({ registered: false, state: 'checking...', scope: null });

  const refreshData = useCallback(async () => {
    const diag = getDiagnostics();
    setDiagnostics(diag);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sw = reg.active || reg.waiting || reg.installing;
          setSwRegistrationState({
            registered: true,
            state: sw ? sw.state : 'active',
            scope: reg.scope,
          });
        } else {
          setSwRegistrationState({
            registered: false,
            state: 'none',
            scope: null,
          });
        }
      } catch (err) {
        setSwRegistrationState({
          registered: false,
          state: 'error: ' + String(err),
          scope: null,
        });
      }
    }
  }, [getDiagnostics]);

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, refreshData]);

  const handleReset = () => {
    resetPwaState();
    refreshData();
    toast.success('PWA state and dismissal cooldown have been reset');
  };

  const handleTriggerPrompt = async () => {
    onClose();
    if (hasNativePrompt) {
      await promptInstall();
    } else {
      openInstallFlow();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] mx-auto p-5 sm:p-6 bg-white dark:bg-[#1a1b1c] rounded-2xl border border-[#DADDE1] dark:border-[#2f3032] shadow-2xl focus:outline-none z-[160] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-[#DADDE1] dark:border-[#2f3032]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/50 text-[#9747FF] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900 dark:text-gray-100">
                PWA Live Diagnostics
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                Real-time Progressive Web App state for testing &amp; QA
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-3 text-xs">
          {/* Key Metrics Grid */}
          <div className="space-y-2 bg-gray-50 dark:bg-[#252628] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Display Mode:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                {isStandalone ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Standalone (Installed)</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                    <span>Browser Window</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Controller Status:</span>
              <span className="font-semibold text-[#9747FF] uppercase tracking-wider text-[11px]">
                {status} ({modalMode})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Native Prompt Event:</span>
              <span className="font-semibold flex items-center gap-1">
                {hasNativePrompt ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Captured (Ready)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Not captured / Consumed
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Platform:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {isIOS ? 'Apple iOS / iPadOS' : 'Standard Chromium / Browser'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Service Worker:</span>
              <span className="font-semibold flex items-center gap-1">
                {swRegistrationState.registered ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {swRegistrationState.state} ({swRegistrationState.scope || '/'})
                  </span>
                ) : (
                  <span className="text-gray-400">Not registered</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Web Manifest Link:</span>
              <span className="font-semibold flex items-center gap-1">
                {diagnostics.hasManifestLink ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Found in &lt;head&gt;
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Missing link
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Dismiss Cooldown:</span>
              <span className="font-medium">
                {diagnostics.dismissCooldownActive ? (
                  <span className="text-amber-500">Active (Prompt suppressed)</span>
                ) : (
                  <span className="text-emerald-500">Inactive (Allowed)</span>
                )}
              </span>
            </div>

            {diagnostics.lastDismissedAt && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Last Dismissed:</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {new Date(diagnostics.lastDismissedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleTriggerPrompt}
              className="w-full h-9 bg-[#9747FF] hover:bg-[#8534f0] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trigger Install Flow Now</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full h-9 border-[#DADDE1] dark:border-[#2f3032] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State &amp; Clear Cooldown</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
