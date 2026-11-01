import React, { useEffect, useState } from 'react';

/** Animated launch splash shown once per app start.
 *  The overlay is pointer-events:none, so its entrance animations play on
 *  first paint without blocking the app. It fades out via CSS and is then
 *  unmounted, so it can never linger over the app if animations are paused
 *  or disabled by the WebView / OS.
 */
const SPLASH_TOTAL_MS = 1600; // fade-out starts at 1.05s and lasts .45s

export const SplashOverlay: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), SPLASH_TOTAL_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-overlay" aria-hidden="true" onAnimationEnd={e => {
      if (e.animationName === 'splash-out') setVisible(false);
    }}>
      <div className="splash-mark">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="splash-logo" />
      </div>
      <div className="splash-word">
        {'FORMA'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${220 + i * 55}ms` }}>{ch}</span>
        ))}
      </div>
    </div>
  );
};

export default SplashOverlay;
