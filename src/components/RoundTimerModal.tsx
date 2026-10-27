import React from 'react';
import { Play, Pause, SkipForward, X, Minimize2, Maximize2, Flame } from 'lucide-react';
import { RoundTimerState, useApp } from '../context/AppContext.tsx';
import { formatDuration } from '../domain/sessionCalculations.ts';

interface RoundTimerModalProps {
  timer: RoundTimerState;
  onPause: () => void;
  onResume: () => void;
  onSkipPhase: () => void;
  onStop: () => void;
  onToggleMinimize: () => void;
}

export const RoundTimerModal: React.FC<RoundTimerModalProps> = ({
  timer,
  onPause,
  onResume,
  onSkipPhase,
  onStop,
  onToggleMinimize,
}) => {
  const { t } = useApp();
  const {
    currentRound,
    totalRounds,
    phase,
    roundSec,
    restSec,
    remainingSec,
    isPaused,
    isMinimized,
    exerciseName,
  } = timer;

  const totalPhaseSec = phase === 'work' ? roundSec : restSec;
  const progressPct = totalPhaseSec > 0
    ? Math.max(0, Math.min(100, ((totalPhaseSec - remainingSec) / totalPhaseSec) * 100))
    : 100;

  const phaseLabel = phase === 'work' ? t.workPhase : phase === 'rest' ? t.restPhase : t.roundsComplete;

  // Minimized floating dock pill
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-24 start-4 end-4 z-40 rounded-xl bg-app-surface border border-app p-3 flex items-center justify-between gap-3 animate-slide-up"
        role="region"
        aria-label={t.roundIntervalTimer}
      >
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex items-center gap-2.5 flex-1 text-start"
          aria-label={t.roundIntervalTimer}
        >
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
              phase === 'work'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
            }`}
          >
            <Flame className="w-4 h-4" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-[10px] uppercase font-bold text-app-muted truncate">
              {t.round} {currentRound}/{totalRounds} · {phaseLabel} {exerciseName ? `· ${exerciseName}` : ''}
            </span>
            <span className="text-base font-black text-app-primary tabular-nums leading-tight">
              {formatDuration(remainingSec)}
            </span>
          </div>
        </button>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="h-8 px-2.5 rounded-lg bg-app-surface-2 border border-app hover:bg-app-surface text-xs font-bold text-app-primary flex items-center gap-1 active:scale-95 transition-transform"
            aria-label={isPaused ? t.resume : t.pause}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
          </button>
          <button
            type="button"
            onClick={onSkipPhase}
            className="h-8 px-2.5 rounded-lg bg-app-surface-2 border border-app text-app-muted hover:text-app-primary text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
            aria-label={t.nextPhase}
          >
            <SkipForward className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="h-8 w-8 rounded-lg bg-app-surface-2 border border-app flex items-center justify-center text-app-muted hover:text-app-primary"
            aria-label={t.hide}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Micro-progress line */}
        <div className="absolute bottom-0 start-0 end-0 h-1 bg-app-surface-2 rounded-b-xl overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-linear ${
              phase === 'work' ? 'bg-amber-400' : 'bg-sky-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  // Full-screen modal overlay
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-timer-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-app-surface border border-app p-6 flex flex-col items-center text-center">
        {/* Top Actions */}
        <div className="w-full flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={onToggleMinimize}
            className="p-2 rounded-lg text-app-muted hover:text-app-primary bg-app-surface-2 border border-app transition-colors"
            aria-label={t.hide}
          >
            <Minimize2 className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted">
            {t.round} {currentRound} {t.of} {totalRounds}
          </span>

          <button
            type="button"
            onClick={onStop}
            className="p-2 rounded-lg text-app-muted hover:text-red-400 bg-app-surface-2 border border-app transition-colors"
            aria-label={t.closeRoundTimer}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <h3 id="round-timer-title" className="text-base font-bold text-app-primary tracking-tight mt-1 truncate max-w-[240px]">
          {exerciseName || t.roundIntervals}
        </h3>

        {/* Phase Pill */}
        <div className="mt-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
              phase === 'work'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : phase === 'rest'
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            {phaseLabel}
          </span>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative my-6 flex items-center justify-center">
          <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              className="stroke-app-surface-2"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              className={`transition-all duration-300 ease-linear ${
                phase === 'work' ? 'stroke-amber-400' : 'stroke-sky-400'
              }`}
              strokeWidth="7"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Time Center text */}
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-black text-app-primary tabular-nums tracking-tight">
              {formatDuration(remainingSec)}
            </span>
            <span className="text-[10px] uppercase font-bold text-app-muted mt-1 tracking-wider">
              {isPaused ? t.paused : phaseLabel}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="w-full flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className={`h-12 px-6 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${
              isPaused
                ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                : 'bg-app-accent text-on-accent hover:opacity-90'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{t.resume}</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>{t.pause}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSkipPhase}
            className="h-12 px-4 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-app-primary font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <SkipForward className="w-4 h-4" />
            <span>{t.nextPhase}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
