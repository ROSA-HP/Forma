import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

/**
 * Keeps the native Android chrome (status + navigation bar icons) in step
 * with the in-app theme. No-op on the web, where the theme-color meta tag
 * already handles it.
 */
export const NativeShell = {
  async syncTheme(isDark: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await SystemBars.setStyle({ style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light });
    } catch {
      // Older shells without the SystemBars core plugin keep their default bars
    }
  }
};
