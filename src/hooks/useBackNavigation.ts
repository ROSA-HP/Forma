import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';

/**
 * Keeps browser/WebView history in sync with the app's page stack so the
 * system back gesture / back button / browser back closes the topmost page
 * instead of leaving the app.
 *
 * - Opening pages pushes one history entry per page.
 * - Closing pages from the UI pops the entries again (kept in sync silently).
 * - popstate (system back, edge swipe, browser back) closes the topmost page.
 * - On Android the native backButton event is intercepted via @capacitor/app:
 *   back navigates in-app while pages are open, and exits only at app root.
 *
 * @param enabled  false while loading/onboarding (no pages on the stack)
 * @param depth    current number of open pages (stack depth)
 * @param closeTopLayer  closes the current topmost page (reads fresh state)
 */
export function useBackNavigation(
  enabled: boolean,
  depth: number,
  closeTopLayer: () => void,
): void {
  // History entries currently pushed by the app
  const depthRef = useRef(0);
  // Pops initiated by the app itself (UI closed a page) awaiting popstate
  const pendingSyncPops = useRef(0);
  // Always call the latest closeTopLayer (fresh state closure)
  const closeRef = useRef(closeTopLayer);
  closeRef.current = closeTopLayer;

  // Sync history entries with page depth
  useEffect(() => {
    if (depth > depthRef.current) {
      // Don't push history before the app is live (loading/onboarding)
      if (!enabled) return;
      const n = depth - depthRef.current;
      for (let i = 0; i < n; i++) {
        window.history.pushState({ forma: true }, '');
      }
      depthRef.current = depth;
    } else if (depth < depthRef.current) {
      const n = depthRef.current - depth;
      depthRef.current = depth;
      pendingSyncPops.current += n;
      for (let i = 0; i < n; i++) {
        window.history.back();
      }
    }
  }, [depth, enabled]);

  // Browser / WebView back: close the topmost page
  useEffect(() => {
    const onPopState = () => {
      if (pendingSyncPops.current > 0) {
        // Our own sync pop — the page was already closed by the UI
        pendingSyncPops.current--;
        return;
      }
      if (depthRef.current > 0) {
        depthRef.current--;
        closeRef.current();
      }
      // At app root: let the platform handle it (browser leaves / native exits)
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Native Android back button: navigate in-app, exit only at root
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let handle: { remove: () => Promise<void> } | undefined;
    NativeApp.addListener('backButton', () => {
      if (depthRef.current > 0) {
        // Pops one entry → popstate closes the topmost page
        window.history.back();
      } else {
        NativeApp.exitApp();
      }
    })
      .then((h) => {
        handle = h;
      })
      .catch(() => {
        // Listener unavailable — default platform behaviour applies
      });
    return () => {
      handle?.remove().catch(() => {});
    };
  }, []);
}
