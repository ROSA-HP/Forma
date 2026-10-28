import React from 'react';

/** Animated launch splash shown once per app start.
 *  The overlay stays mounted and is pointer-events:none, so its
 *  entrance animations play on first paint without blocking the app.
 */
export const SplashOverlay: React.FC = () => {
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
    </div>
  );
};

export default SplashOverlay;
