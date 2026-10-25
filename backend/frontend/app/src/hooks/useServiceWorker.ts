import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { PWA_CONFIG } from '@/pwaConfig';

export function useServiceWorker() {
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only register service worker over HTTPS or localhost
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    if (window.location.protocol !== 'https:' && !isLocalhost) {
      return;
    }

    // Reload smoothly when new controller takes over after user clicks update
    const handleControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const registerWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(PWA_CONFIG.swPath, {
          scope: PWA_CONFIG.scope,
        });

        // Check if an updated worker is already waiting
        if (registration.waiting) {
          notifyUpdateAvailable(registration.waiting);
        }

        // Listen for new updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateAvailable(newWorker);
            }
          });
        });
      } catch (error) {
        // Safe fallback: site continues working normally even if registration fails
        console.warn('PWA service worker registration bypassed or not supported:', error);
      }
    };

    const notifyUpdateAvailable = (worker: ServiceWorker) => {
      toast('Update available', {
        description: 'A new version of MyArteLab is available.',
        duration: 10000,
        action: {
          label: 'Refresh',
          onClick: () => {
            worker.postMessage({ type: 'SKIP_WAITING' });
          },
        },
      });
    };

    registerWorker();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
}
