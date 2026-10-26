import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PWA_CONFIG } from '@/pwaConfig';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PwaInstallStatus =
  | 'installed'
  | 'installable'
  | 'instructions'
  | 'unsupported'
  | 'idle';

export type PwaModalMode =
  | 'native'
  | 'instructions-ios'
  | 'instructions-browser'
  | 'installed';

export interface PwaDiagnostics {
  isHttps: boolean;
  hasManifestLink: boolean;
  hasServiceWorkerSupport: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerControlled: boolean;
  serviceWorkerScope: string | null;
  isStandalone: boolean;
  isIOS: boolean;
  hasNativePrompt: boolean;
  status: PwaInstallStatus;
  dismissCooldownActive: boolean;
  lastDismissedAt: string | null;
  installedMarker: boolean;
  userAgent: string;
}

export interface PwaInstallContextValue {
  status: PwaInstallStatus;
  isInstallable: boolean;
  isInstalled: boolean;
  isInstructions: boolean;
  isPromptOpen: boolean;
  modalMode: PwaModalMode;
  isIOS: boolean;
  isStandalone: boolean;
  hasNativePrompt: boolean;
  promptInstall: () => Promise<void>;
  openInstallFlow: () => void;
  dismissPrompt: () => void;
  resetPwaState: () => void;
  setIsPromptOpen: (open: boolean) => void;
  getDiagnostics: () => PwaDiagnostics;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  if ((window as any).__MYARTELAB_PWA_PROMPT__) {
    globalDeferredPrompt = (window as any).__MYARTELAB_PWA_PROMPT__;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as any).__MYARTELAB_PWA_PROMPT__ = globalDeferredPrompt;
    try {
      localStorage.removeItem(PWA_CONFIG.storageKeys.installed);
    } catch {}
    window.dispatchEvent(new CustomEvent('myartelab:beforeinstallprompt'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    (window as any).__MYARTELAB_PWA_PROMPT__ = null;
    try {
      localStorage.setItem(PWA_CONFIG.storageKeys.installed, 'true');
    } catch {}
    window.dispatchEvent(new CustomEvent('myartelab:appinstalled'));
  });
}

export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isDisplayFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isDisplayMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isDisplayStandalone || isDisplayFullscreen || isDisplayMinimalUi || isIOSStandalone;
}

export function detectIsIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIOSPlatform = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSPlatform || isIPadOS;
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PwaInstallStatus>('idle');
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [modalMode, setModalMode] = useState<PwaModalMode>('native');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const promptAttemptInProgressRef = useRef(false);

  const isDismissCooldownActive = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem(PWA_CONFIG.storageKeys.dismissedTimestamp);
    if (!dismissedAt) return false;

    const elapsedMs = Date.now() - parseInt(dismissedAt, 10);
    const cooldownMs = PWA_CONFIG.dismissCooldownHours * 60 * 60 * 1000;
    return elapsedMs < cooldownMs;
  }, []);

  const evaluateState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const standalone = detectIsStandalone();
    setIsStandalone(standalone);

    const ios = detectIsIOS();
    setIsIOS(ios);

    const nativePromptAvailable = Boolean(globalDeferredPrompt || (window as any).__MYARTELAB_PWA_PROMPT__);
    setHasNativePrompt(nativePromptAvailable);

    if (standalone) {
      setStatus('installed');
      setModalMode('installed');
      return;
    }

    if (nativePromptAvailable) {
      setStatus('installable');
      setModalMode('native');
      return;
    }

    if (ios) {
      setStatus('instructions');
      setModalMode('instructions-ios');
      return;
    }

    if ('serviceWorker' in navigator) {
      // Modern Chromium/browser with service worker support: ready for install flow
      setStatus('installable');
      setModalMode('native');
      return;
    }

    setStatus('unsupported');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    evaluateState();

    const handleBeforePrompt = () => {
      evaluateState();
      if (!detectIsStandalone() && !isDismissCooldownActive()) {
        const timer = setTimeout(() => {
          if (!detectIsStandalone()) {
            setModalMode('native');
            setIsPromptOpen(true);
          }
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    const handleInstalled = () => {
      evaluateState();
      setIsPromptOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('myartelab:beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('myartelab:appinstalled', handleInstalled);

    const standalone = detectIsStandalone();
    const ios = detectIsIOS();
    if (ios && !standalone && !isDismissCooldownActive()) {
      const timer = setTimeout(() => {
        if (!detectIsStandalone()) {
          setModalMode('instructions-ios');
          setIsPromptOpen(true);
        }
      }, 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
        window.removeEventListener('appinstalled', handleInstalled);
        window.removeEventListener('myartelab:beforeinstallprompt', handleBeforePrompt);
        window.removeEventListener('myartelab:appinstalled', handleInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('myartelab:beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('myartelab:appinstalled', handleInstalled);
    };
  }, [evaluateState, isDismissCooldownActive]);

  const promptInstall = useCallback(async () => {
    if (promptAttemptInProgressRef.current) return;

    if (detectIsIOS()) {
      setModalMode('instructions-ios');
      setIsPromptOpen(true);
      return;
    }

    const currentPrompt = globalDeferredPrompt || (window as any).__MYARTELAB_PWA_PROMPT__;

    if (!currentPrompt) {
      setModalMode('instructions-browser');
      setIsPromptOpen(true);
      return;
    }

    try {
      promptAttemptInProgressRef.current = true;
      await currentPrompt.prompt();
      const { outcome } = await currentPrompt.userChoice;

      if (outcome === 'accepted') {
        try {
          localStorage.setItem(PWA_CONFIG.storageKeys.installed, 'true');
        } catch {}
        setIsStandalone(true);
        setStatus('installed');
        setModalMode('installed');
        setIsPromptOpen(false);
      } else {
        try {
          localStorage.setItem(PWA_CONFIG.storageKeys.dismissedTimestamp, Date.now().toString());
        } catch {}
        setIsPromptOpen(false);
      }
    } catch (err) {
      console.warn('PWA: native installation prompt encountered an issue:', err);
      setModalMode('instructions-browser');
      setIsPromptOpen(true);
    } finally {
      globalDeferredPrompt = null;
      if (typeof window !== 'undefined') {
        (window as any).__MYARTELAB_PWA_PROMPT__ = null;
      }
      promptAttemptInProgressRef.current = false;
      evaluateState();
    }
  }, [evaluateState]);

  const openInstallFlow = useCallback(() => {
    evaluateState();
    const standalone = detectIsStandalone();
    if (standalone) {
      setModalMode('installed');
      setIsPromptOpen(true);
      return;
    }

    if (detectIsIOS()) {
      setModalMode('instructions-ios');
      setIsPromptOpen(true);
      return;
    }

    // Modern browser: open install modal in native mode so user can trigger direct installation
    setModalMode('native');
    setIsPromptOpen(true);
  }, [evaluateState]);

  const dismissPrompt = useCallback(() => {
    try {
      localStorage.setItem(PWA_CONFIG.storageKeys.dismissedTimestamp, Date.now().toString());
    } catch {}
    setIsPromptOpen(false);
  }, []);

  const resetPwaState = useCallback(() => {
    try {
      localStorage.removeItem(PWA_CONFIG.storageKeys.installed);
      localStorage.removeItem(PWA_CONFIG.storageKeys.dismissedTimestamp);
    } catch {}
    evaluateState();
  }, [evaluateState]);

  const getDiagnostics = useCallback((): PwaDiagnostics => {
    const isHttps = typeof window !== 'undefined' ? window.location.protocol === 'https:' : false;
    const hasManifestLink = typeof document !== 'undefined' ? Boolean(document.querySelector('link[rel="manifest"]')) : false;
    const hasServiceWorkerSupport = typeof navigator !== 'undefined' ? 'serviceWorker' in navigator : false;
    const serviceWorkerControlled = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? Boolean(navigator.serviceWorker.controller) : false;
    const lastDismissedAt = typeof localStorage !== 'undefined' ? localStorage.getItem(PWA_CONFIG.storageKeys.dismissedTimestamp) : null;
    const installedMarker = typeof localStorage !== 'undefined' ? localStorage.getItem(PWA_CONFIG.storageKeys.installed) === 'true' : false;

    return {
      isHttps,
      hasManifestLink,
      hasServiceWorkerSupport,
      serviceWorkerRegistered: serviceWorkerControlled,
      serviceWorkerControlled,
      serviceWorkerScope: serviceWorkerControlled && navigator.serviceWorker.controller ? (navigator.serviceWorker.controller as any).scriptURL : null,
      isStandalone: detectIsStandalone(),
      isIOS: detectIsIOS(),
      hasNativePrompt: Boolean(globalDeferredPrompt || (window as any).__MYARTELAB_PWA_PROMPT__),
      status,
      dismissCooldownActive: isDismissCooldownActive(),
      lastDismissedAt: lastDismissedAt ? new Date(parseInt(lastDismissedAt, 10)).toISOString() : null,
      installedMarker,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }, [status, isDismissCooldownActive]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__MYARTELAB_PWA_DIAGNOSTICS__ = getDiagnostics;
    }
  }, [getDiagnostics]);

  const value: PwaInstallContextValue = {
    status,
    isInstallable: status === 'installable',
    isInstalled: status === 'installed',
    isInstructions: status === 'instructions',
    isPromptOpen,
    modalMode,
    isIOS,
    isStandalone,
    hasNativePrompt,
    promptInstall,
    openInstallFlow,
    dismissPrompt,
    resetPwaState,
    setIsPromptOpen,
    getDiagnostics,
  };

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
}
