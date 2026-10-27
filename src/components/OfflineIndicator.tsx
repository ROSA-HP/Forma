import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { useApp } from '../context/AppContext.tsx';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useApp();

  if (isOnline) return null;

  return (
    <aside
      aria-label={t.offlineMode}
      className="fixed bottom-20 start-4 z-40 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 border border-amber-300 animate-in fade-in slide-in-from-bottom duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>{t.offlineNotice}</span>
    </aside>
  );
};
