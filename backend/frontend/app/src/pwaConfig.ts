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
  themeColor: '#9842FD',
  backgroundColor: '#FDFDFD',
  startUrl: '/',
  scope: '/',
  manifestPath: '/manifest.webmanifest',
  swPath: '/sw.js',
  offlinePath: '/offline.html',
  icons: {
    icon192: '/icons/icon-192-v6.png',
    icon512: '/icons/icon-512-v6.png',
    iconMaskable: '/icons/icon-maskable-512-v6.png',
    appleTouchIcon: '/icons/apple-touch-icon-v6.png',
    mobileLogo: '/icons/icon-192-v6.png',
  },
  cache: {
    // Unique namespace ensuring MyArteLab never conflicts with other domains or LagosLife
    namespace: 'myartelab-pwa-v6',
    staticCache: 'myartelab-pwa-static-v6',
    runtimeCache: 'myartelab-pwa-runtime-v6',
  },
  storageKeys: {
    installed: 'myartelab_pwa_installed',
    dismissedTimestamp: 'myartelab_pwa_install_dismissed_at',
  },
  // Number of hours to wait before showing prompt again after user dismisses with "Not now"
  dismissCooldownHours: 72,
} as const;

export type PwaConfig = typeof PWA_CONFIG;
