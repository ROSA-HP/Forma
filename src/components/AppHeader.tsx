import React from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { StreakChip } from './StreakChip.tsx';
import { calculateStreak } from '../domain/calculations.ts';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  hideStreak?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  hideStreak = false
}) => {
  const { settings, sessions, schedules, setActiveTab, t } = useApp();

  const streakInfo = React.useMemo(() => {
    return calculateStreak(sessions, schedules);
  }, [sessions, schedules]);

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-app-surface border-b border-app pt-safe">
      <div className="h-16 px-4 flex items-center justify-between gap-3 max-w-xl mx-auto">
        {/* Left: Back or Brand Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={t.back}
              className="w-10 h-10 -ms-1 flex items-center justify-center rounded-lg text-app-primary hover:bg-app-surface-2 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}icon.svg`}
              alt=""
              aria-hidden="true"
              className="w-9 h-9 rounded-lg shrink-0"
            />
          )}

          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base tracking-tight text-app-primary truncate">
              {title || t.appName}
            </span>
            {subtitle ? (
              <span className="text-[11px] font-semibold text-app-muted uppercase tracking-wider truncate">
                {subtitle}
              </span>
            ) : !showBack ? (
              <span className="text-[11px] font-semibold text-app-muted uppercase tracking-wider">
                {t.athleticOS}
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Streak & User Avatar or Custom Action */}
        <div className="flex items-center gap-2 shrink-0">
          {rightAction ? (
            rightAction
          ) : (
            <>
              {!hideStreak && !showBack && (
                <StreakChip 
                  days={streakInfo.currentStreak} 
                  onFire={streakInfo.onFire}
                  compact={true}
                />
              )}

              <button
                type="button"
                onClick={() => setActiveTab('more')}
                aria-label={t.openSettings}
                className="w-9 h-9 rounded-full bg-app-surface-2 border border-app flex items-center justify-center text-app-primary hover:border-app-accent active:scale-95 transition-all"
              >
                {settings.profileName ? (
                  <span className="text-xs font-bold uppercase tracking-wider text-app-accent">
                    {settings.profileName.charAt(0)}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-app-muted" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
