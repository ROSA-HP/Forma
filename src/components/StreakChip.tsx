import React from 'react';
import { Flame } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface StreakChipProps {
  days: number;
  onFire?: boolean;
  compact?: boolean;
  className?: string;
}

export const StreakChip: React.FC<StreakChipProps> = ({
  days,
  onFire = false,
  compact = false,
  className = ''
}) => {
  const { t } = useApp();
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-app-surface-2 border border-app text-app-accent font-semibold text-xs tracking-wider uppercase tabular-nums ${className}`}
      aria-label={`${days} ${t.streakLabel}${onFire ? ` ${t.onFire}` : ''}`}
    >
      <Flame className="w-3.5 h-3.5 fill-current text-app-accent" />
      <span className="font-bold">{compact ? `${days}d` : `${days} ${t.daysWord}`}</span>
      {onFire && (
        <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
};
