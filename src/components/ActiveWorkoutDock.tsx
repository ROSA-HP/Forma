import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatDuration } from '../domain/sessionCalculations.ts';

export const ActiveWorkoutDock: React.FC = () => {
  const { 
    activeDraft, 
    isWorkoutActive, 
    isWorkoutMinimized, 
    setIsWorkoutMinimized,
    t
  } = useApp();

  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!activeDraft) return;

    const updateTimer = () => {
      const started = new Date(activeDraft.startedAt).getTime();
      const paused = activeDraft.pausedMs || 0;
      const current = activeDraft.isPaused && activeDraft.lastPausedAt
        ? new Date(activeDraft.lastPausedAt).getTime()
        : Date.now();
      const diff = Math.max(0, Math.floor((current - started - paused) / 1000));
      setElapsedSec(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    const handleVis = () => updateTimer();
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [activeDraft]);

  if (!isWorkoutActive || !isWorkoutMinimized || !activeDraft) {
    return null;
  }

  const completedSets = activeDraft.sets.filter(s => s.done).length;
  const totalSets = activeDraft.sets.length;

  return (
    <div 
      className="fixed bottom-20 start-3 end-3 sm:start-auto sm:end-6 sm:w-96 z-40 animate-slide-up"
      role="region"
      aria-label={t.activeWorkoutQuickBar}
    >
      <div 
        onClick={() => setIsWorkoutMinimized(false)}
        className="w-full rounded-2xl bg-app-surface border-2 border-app-accent/60 p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:border-app-accent transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-app-accent/20 border border-app-accent/40 flex items-center justify-center text-app-accent shrink-0">
            <Play className="w-5 h-5 fill-current animate-pulse" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-app-primary truncate">
                {activeDraft.collectionName || t.activeWorkout}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] tabular-nums font-bold bg-app-accent/20 text-app-accent uppercase tracking-wider shrink-0">
                {t.live}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-app-muted mt-0.5">
              <span className="tabular-nums font-semibold text-app-primary">
                {formatDuration(elapsedSec)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 tabular-nums font-medium text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>{completedSets}/{totalSets} {t.sets.toLowerCase()}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsWorkoutMinimized(false);
          }}
          className="h-9 px-3 rounded-xl bg-app-accent text-on-accent text-xs font-bold flex items-center gap-1.5 border border-app-accent shrink-0"
          aria-label={t.resumeActiveWorkout}
        >
          <span>{t.resume}</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
