# MyArteLab — Progressive Web App (PWA) Operations & Kill Switch Manual

This document provides operational instructions, file definitions, cache architecture, and emergency kill-switch procedures for the MyArteLab PWA implementation.

---

## 1. File Architecture & Directory Mapping

The implementation is purely additive, zero-dependency, and isolated into clean configuration files:

| File Path | Role | Description |
|---|---|---|
| `backend/frontend/app/src/pwaConfig.ts` | Configuration | Single source of truth for app metadata, cache namespaces, brand colors, and storage keys. Reusable for LagosLife. |
| `backend/frontend/app/public/manifest.webmanifest` | Web Manifest | Standards-compliant web app manifest configured with `display: standalone`, `#9747FF` theme color, and `"Built for African creators"`. |
| `backend/frontend/app/public/sw.js` | Service Worker | Lightweight service worker with strict privacy boundaries, versioned cache, and offline fallback. |
| `backend/frontend/app/public/offline.html` | Offline Fallback | Zero-dependency, on-brand informational offline landing page with retry action. |
| `backend/frontend/app/public/icons/` | App Icons | Contains 192x192, 512x512, maskable, and Apple touch icons sourced directly from `mobile-logo.png`. |
| `backend/frontend/app/src/hooks/usePwaInstall.ts` | Install Controller | Manages `beforeinstallprompt`, iOS Safari detection, installation state persistence, and permanent suppression. |
| `backend/frontend/app/src/hooks/useServiceWorker.ts` | SW Lifecycle | Registers the service worker, detects waiting updates, and prompts the user to refresh without interrupting workflows. |
| `backend/frontend/app/src/components/pwa/PwaInstallModal.tsx` | Install Prompt UI | Custom prompt reusing MyArteLab's existing Radix UI centered dialog, styling, brand colors, and entrance/exit animations. |

---

## 2. Privacy & Cache Architecture

The service worker strictly adheres to **Default-Deny** and **Privacy-Preserving** rules:

1. **Non-GET Requests**: All `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, and `HEAD` requests are **never intercepted**.
2. **Dynamic / Authenticated Routes**: `/api/*`, `/webhooks/*`, and `/uploads/*` are bypassed unconditionally.
3. **Cross-Origin**: Solana RPC nodes, Cloudinary, Google Auth, and Switch payment endpoints are never cached or intercepted.
4. **HTML Navigation**: Navigation requests are handled **Network-First**, falling back to `/offline.html` only when completely offline. Authenticated pages are never stored in cache.
5. **Static Assets**: Fingerprinted CSS, JS, fonts, and public icons are handled **Cache-First** in an isolated cache namespace (`myartelab-static-v1`).
6. **No Artificial Successes**: Offline operations never fake success, queue transactions, or alter payment states.

---

## 3. Safe Updates (No Forced Reloads)

- When a new service worker is deployed, it installs in the background.
- It **does not call `skipWaiting()` automatically**, avoiding mid-action interruptions during login, checkout, file upload, or chat.
- A toast notification informs the user: *"A new version of MyArteLab is available"*, offering a `"Refresh"` button.
- Only when the user taps `"Refresh"` is `SKIP_WAITING` delivered to the waiting worker, gracefully reloading the page once the new controller takes over.

---

## 4. Emergency Kill Switch & Rollback Procedures

If an emergency rollback or service-worker deprecation is ever needed, follow these steps:

### Scenario A: Disable Future Registrations (Quick Disable)

To stop registering the service worker on future visits while keeping the rest of the application intact:
1. In `backend/frontend/app/src/App.tsx`, comment out or remove `useServiceWorker();`.
2. Build and deploy (`./deploy.sh`).
3. Future visitors will not register a service worker.

### Scenario B: Deactivate & Retire All Existing Client Service Workers (Full Kill Switch)

If an active service worker needs to be completely removed from all existing user devices:
1. Replace `backend/frontend/app/public/sw.js` with this no-op self-terminating script:

```javascript
// Emergency Kill Switch Service Worker
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Clear ONLY MyArteLab PWA caches
      return Promise.all(
        keys.filter((key) => key.startsWith('myartelab-')).map((key) => caches.delete(key))
      );
    }).then(() => self.registration.unregister())
  );
});

// Do not intercept any fetch requests
self.addEventListener('fetch', () => {});
```

2. Rebuild and deploy:
   ```bash
   npm --prefix backend/frontend/app run build
   ./deploy.sh
   ```
3. Because `/sw.js` is served with `Cache-Control: no-cache, no-store, must-revalidate`, all existing client devices will fetch this kill-switch worker upon their next visit, delete the `myartelab-*` caches, unregister themselves, and revert cleanly to normal browser operation.
4. **Safety Guarantee**: This unregisters only the PWA service worker and clears only `myartelab-*` caches; it **never touches** user sessions, authentication tokens, `localStorage`, or database data.

---

## 5. LagosLife Reusability Guide

To apply this exact PWA setup to **LagosLife**:
1. Copy `pwaConfig.ts` to LagosLife's source directory.
2. Update the configuration constants:
   - `appName: 'LagosLife'`
   - `themeColor: '#...'`
   - `cache.namespace: 'lagoslife-pwa-v1'`
   - `storageKeys.installed: 'lagoslife_pwa_installed'`
3. Provide LagosLife's icon assets in `/icons/`.
4. Deploy the same `sw.js` and `PwaInstallModal` components.
5. The isolated cache namespace guarantees that LagosLife will never conflict with or clear MyArteLab's caches.
