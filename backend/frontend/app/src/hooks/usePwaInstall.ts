import { useState, useEffect, useCallback, useRef } from 'react';
import { PWA_CONFIG } from '@/pwaConfig';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if app is running in standalone mode (installed)
  const checkIsStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isMarkedInstalled = localStorage.getItem(PWA_CONFIG.storageKeys.installed) === 'true';

    return isStandaloneDisplay || isIOSStandalone || isMarkedInstalled;
  }, []);

  // Check if user recently dismissed the prompt within the cooldown window
  const isDismissCooldownActive = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const dismissedAt = localStorage.getItem(PWA_CONFIG.storageKeys.dismissedTimestamp);
    if (!dismissedAt) return false;

    const elapsedMs = Date.now() - parseInt(dismissedAt, 10);
    const cooldownMs = PWA_CONFIG.dismissCooldownHours * 60 * 60 * 1000;
    return elapsedMs < cooldownMs;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone = checkIsStandalone();
    setIsStandalone(standalone);

    // If already running standalone or marked installed, NEVER show install prompt
    if (standalone) {
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent || '';
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(userAgent) &&
      !(window as any).MSStream &&
      !standalone;

    setIsIOS(isIOSDevice);

    // If iOS and not in cooldown, make installable
    if (isIOSDevice && !isDismissCooldownActive()) {
      setIsInstallable(true);
      // Small delay on initial visit so the user can see the home page first
      const timer = setTimeout(() => {
        setIsPromptOpen(true);
      }, 3500);
      return () => clearTimeout(timer);
    }

    // Android & Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setIsInstallable(true);

      if (!isDismissCooldownActive()) {
        const timer = setTimeout(() => {
          setIsPromptOpen(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    // Listen for successful native install
    const handleAppInstalled = () => {
      localStorage.setItem(PWA_CONFIG.storageKeys.installed, 'true');
      setIsStandalone(true);
      setIsInstallable(false);
      setIsPromptOpen(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIsStandalone, isDismissCooldownActive]);

  // Trigger installation
  const promptInstall = useCallback(async () => {
    if (isIOS) {
      // iOS users are given instructions modal
      setIsPromptOpen(true);
      return;
    }

    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      return;
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      if (outcome === 'accepted') {
        localStorage.setItem(PWA_CONFIG.storageKeys.installed, 'true');
        setIsStandalone(true);
        setIsInstallable(false);
        setIsPromptOpen(false);
      } else {
        // User dismissed the browser prompt
        localStorage.setItem(
          PWA_CONFIG.storageKeys.dismissedTimestamp,
          Date.now().toString()
        );
        setIsPromptOpen(false);
      }
    } catch (err) {
      console.error('Error invoking PWA installation prompt:', err);
    } finally {
      deferredPromptRef.current = null;
    }
  }, [isIOS]);

  // Dismiss installation prompt
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(
      PWA_CONFIG.storageKeys.dismissedTimestamp,
      Date.now().toString()
    );
    setIsPromptOpen(false);
  }, []);

  return {
    isInstallable,
    isPromptOpen,
    isIOS,
    isStandalone,
    promptInstall,
    dismissPrompt,
    setIsPromptOpen,
  };
}
