import React, { useState } from 'react';
import { Download, Share, PlusSquare, Check, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { useApp } from '../context/AppContext.tsx';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useApp();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed in standalone mode, show installed status badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
        <Check className="w-3.5 h-3.5" />
        <span>{t.pwaInstalled}</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-app-accent text-on-accent font-bold hover:opacity-90 transition-all border border-app-accent ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm w-full justify-center'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t.installApp}</span>
      </button>
    );
  }

  // iOS Safari flow or generic fallback
  return (
    <>
      <button
        type="button"
        onClick={() => setShowIOSModal(true)}
        className={`flex items-center gap-2 rounded-xl bg-app-surface-2 border border-app text-app-primary hover:border-app-accent/60 font-bold transition-all ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm w-full justify-center'
        }`}
      >
        <Smartphone className="w-4 h-4 text-app-accent shrink-0" />
        <span>{isIOS ? t.installOnIOS : t.installToHomeScreen}</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-sm rounded-2xl bg-app-surface border border-app p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-app">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-app-accent" />
                <h3 className="text-base font-bold text-app-primary">{t.addToHomeScreen}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg text-app-muted hover:text-app-primary transition-colors"
                aria-label={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-app-muted leading-relaxed">
              <p className="text-app-primary font-semibold">
                {t.installStandalonePrompt}
              </p>
              <div className="p-3 rounded-xl bg-app-surface-2 border border-app space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center font-bold text-[11px] shrink-0">
                    1
                  </div>
                  <div>
                    {t.pwaStep1} <Share className="inline w-3.5 h-3.5 text-app-accent ms-0.5" />
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center font-bold text-[11px] shrink-0">
                    2
                  </div>
                  <div>
                    {t.pwaStep2} <PlusSquare className="inline w-3.5 h-3.5 text-app-accent ms-0.5" />
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center font-bold text-[11px] shrink-0">
                    3
                  </div>
                  <div>
                    {t.pwaStep3}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-app-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
