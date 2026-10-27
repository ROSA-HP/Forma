import React from 'react';
import { Timer, Plus, Minus, SkipForward, Minimize2, Maximize2 } from 'lucide-react';
import { RestTimerState, useApp } from '../context/AppContext.tsx';

interface RestTimerModalProps {
  timer: RestTimerState;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
  onToggleMinimize: () => void;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  timer,
  onAdjust,
  onSkip,
  onToggleMinimize
}) => {
  const { t } = useApp();
  const { remainingSec, totalSec, exerciseName, isMinimized } = timer;
  const progressPct = totalSec > 0 ? Math.max(0, Math.min(100, ((totalSec - remainingSec) / totalSec) * 100)) : 100;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  // If minimized: render compact floating pill
  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-24 start-4 end-4 z-40 rounded-xl bg-app-surface border border-app-accent/40 p-3 flex items-center justify-between gap-3 animate-slide-up"
        role="region"
        aria-label={t.restTimerBar}
      >
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex items-center gap-2.5 flex-1 text-start"
          aria-label={t.expandRestTimer}
        >
          <div className="w-8 h-8 rounded-lg bg-app-accent/15 border border-app-accent/30 flex items-center justify-center text-app-accent shrink-0">
            <Timer className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[10px] uppercase font-bold text-app-muted truncate">
              {t.resting} · {exerciseName || t.nextSet}
            </span>
            <span className="text-base font-black text-app-accent tabular-nums leading-tight">
              {formattedTime}
            </span>
          </div>
        </button>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onAdjust(30)}
            className="h-8 px-2.5 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-xs font-bold text-app-primary flex items-center gap-1 active:scale-95 transition-transform"
            aria-label={t.add30s}
          >
            <Plus className="w-3 h-3" />
            <span className="tabular-nums">30s</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="h-8 px-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
            aria-label={t.skipRest}
          >
            <SkipForward className="w-3 h-3" />
            <span>{t.skip}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="h-8 w-8 rounded-lg bg-app-surface-2 border border-app flex items-center justify-center text-app-muted hover:text-app-primary"
            aria-label={t.expandRestView}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom micro-progress line */}
        <div className="absolute bottom-0 start-0 end-0 h-1 bg-app-surface-2 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-app-accent transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  // Full-size rest modal overlay
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rest-timer-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-app-surface border border-app p-6 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={onToggleMinimize}
          className="absolute top-3 end-3 p-2 rounded-full text-app-muted hover:text-app-primary bg-app-surface-2 border border-app transition-colors"
          aria-label={t.hide}
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        <span className="text-[11px] font-bold uppercase tracking-wider text-app-accent mb-1 flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5" />
          <span>{t.restInterval}</span>
        </span>

        <h3 id="rest-timer-title" className="text-base font-bold text-app-primary tracking-tight truncate max-w-[260px]">
          {exerciseName || t.preparingNextSet}
        </h3>

        {/* Circular Countdown Ring */}
        <div className="relative my-6 flex items-center justify-center">
          <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-app-surface-2"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-app-accent transition-all duration-1000 ease-linear"
              strokeWidth="7"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time Center text */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-app-primary tabular-nums tracking-tight">
              {formattedTime}
            </span>
            <span className="text-[10px] font-semibold text-app-muted uppercase tracking-wider mt-0.5">
              {t.remaining}
            </span>
          </div>
        </div>

        {/* Adjustment buttons */}
        <div className="flex items-center gap-3 w-full justify-center mb-6">
          <button
            type="button"
            onClick={() => onAdjust(-15)}
            className="flex-1 h-11 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-app-primary font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
            aria-label={t.sub15s}
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="tabular-nums">15s</span>
          </button>
          <button
            type="button"
            onClick={() => onAdjust(30)}
            className="flex-1 h-11 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-app-primary font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-transform"
            aria-label={t.add30s}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="tabular-nums">30s</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 h-12 rounded-xl bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
            <span>{t.skipRest}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="h-12 px-4 rounded-xl bg-app-surface-2 border border-app text-app-primary font-bold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span>{t.hide}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
