import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.forma',
  appName: 'Forma',
  webDir: 'dist',
  // Brand black behind the page while it loads (no white WebView frame at launch)
  backgroundColor: '#0B0D10',
  plugins: {
    SystemBars: {
      // index.html declares viewport-fit=cover; knowing it up front avoids a
      // layout jump right after launch when Capacitor detects it on its own
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
