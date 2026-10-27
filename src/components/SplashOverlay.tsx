import React, { useEffect, useState } from 'react';

/**
 * Animated launch splash shown once per app start.
 * Purely visual: the overlay is pointer-events:none and unmounts itself,
 * so it can never block the app even if animations are interrupted.
 */
export const SplashOverlay: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), 1600);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-overlay" aria-hidden="true">
      <div className="splash-mark">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="splash-logo" />
      </div>
      <div className="splash-word">
        {'FORMA'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${220 + i * 55}ms` }}>{ch}</span>
        ))}
      </div>
      <div className="splash-line" />
    </div>
  );
};

export default SplashOverlay;
