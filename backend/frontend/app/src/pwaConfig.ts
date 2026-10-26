/**
 * PWA Configuration — MyArteLab
 *
 * Configured for seamless reusability across projects (e.g., LagosLife).
 * Changing this configuration updates site-specific values without altering
 * service worker logic or installation controllers.
 */

export const PWA_CONFIG = {
  appName: 'MyArteLab',
  shortName: 'MyArteLab',
  description: 'Discover and book top African creators. Built for African creators, trusted by clients globally.',
  themeColor: '#9843FD',
  backgroundColor: '#9843FD',
  startUrl: '/',
  scope: '/',
  manifestPath: '/manifest.webmanifest',
  swPath: '/sw.js',
  offlinePath: '/offline.html',
  icons: {
    icon192: '/icons/icon-192-v5.png',
    icon512: '/icons/icon-512-v5.png',
    iconMaskable: '/icons/icon-maskable-512-v5.png',
    appleTouchIcon: '/icons/apple-touch-icon-v5.png',
    mobileLogo: '/icons/icon-192-v5.png',
  },
  cache: {
    // Unique namespace ensuring MyArteLab never conflicts with other domains or LagosLife
    namespace: 'myartelab-pwa-v5',
    staticCache: 'myartelab-pwa-static-v5',
    runtimeCache: 'myartelab-pwa-runtime-v5',
  },
  storageKeys: {
    installed: 'myartelab_pwa_installed',
    dismissedTimestamp: 'myartelab_pwa_install_dismissed_at',
  },
  // Number of hours to wait before showing prompt again after user dismisses with "Not now"
  dismissCooldownHours: 72,
} as const;

export type PwaConfig = typeof PWA_CONFIG;
