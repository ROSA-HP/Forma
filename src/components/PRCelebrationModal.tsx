import React from 'react';
import { PRRecord, WeightUnit } from '../types/index.ts';
import { Trophy, Zap, Sparkles, X, TrendingUp } from 'lucide-react';
import { kgToLb } from '../domain/calculations.ts';
import { useApp } from '../context/AppContext.tsx';

interface PRCelebrationModalProps {
  pr: PRRecord;
  exerciseName?: string;
  weightUnit: WeightUnit;
  onDismiss: () => void;
}

export const PRCelebrationModal: React.FC<PRCelebrationModalProps> = ({
  pr,
  exerciseName,
  weightUnit,
  onDismiss
}) => {
  const { t } = useApp();
  const isLb = weightUnit === 'lb';

  const formatVal = (valKgOrNum: number, type: string) => {
    if (type === 'weight' || type === 'est_1rm' || type === 'volume') {
      const displayVal = isLb ? kgToLb(valKgOrNum) : valKgOrNum;
      return `${displayVal.toFixed(1)} ${weightUnit}`;
    }
    if (type === 'reps') return `${valKgOrNum} ${t.reps.toLowerCase()}`;
    if (type === 'rounds') return `${valKgOrNum} ${t.round.toLowerCase()}`;
    if (type === 'timed') return `${valKgOrNum}s`;
    if (type === 'distance') return `${valKgOrNum}m`;
    return `${valKgOrNum}`;
  };

  const getPrTitle = (type: string) => {
    switch (type) {
      case 'est_1rm': return t.prEstimated1RM;
      case 'weight': return t.prHeaviestWeight;
      case 'reps': return t.prRepetitionRecord;
      case 'volume': return t.prTotalVolume;
      case 'rounds': return t.prMaxRounds;
      case 'timed': return t.prEnduranceHold;
      default: return t.prAchieved;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pr-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-app-surface border border-amber-500/40 p-6 flex flex-col items-center text-center overflow-hidden">
        {/* Glow corner decorations */}
        <div className="absolute -top-16 -start-16 w-48 h-48 bg-amber-500/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -end-16 w-48 h-48 bg-emerald-500/10 rounded-full pointer-events-none" />

        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 end-3 p-2 rounded-full text-app-muted hover:text-app-primary bg-app-surface-2 border border-app transition-colors"
          aria-label={t.closePRNotification}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Trophy badge */}
        <div className="relative mb-3 mt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-300 flex items-center justify-center text-black animate-bounce">
            <Trophy className="w-8 h-8 fill-current" />
          </div>
          <div className="absolute -bottom-1 -end-1 p-1 rounded-full bg-emerald-500 text-black border border-emerald-300">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* Badge tag */}
        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[11px] uppercase tracking-wider mb-2">
          {getPrTitle(pr.prType)}
        </span>

        {/* Exercise name */}
        <h3 id="pr-title" className="text-xl font-black text-app-primary tracking-tight">
          {exerciseName || t.exerciseMilestone}
        </h3>

        {/* Numbers Comparison */}
        <div className="w-full my-4 p-4 rounded-xl bg-app-surface-2 border border-app flex items-center justify-between">
          <div className="flex flex-col text-start">
            <span className="text-[10px] font-semibold text-app-muted uppercase tracking-wider">
              {t.previousBest}
            </span>
            <span className="text-sm font-medium text-app-muted line-through tabular-nums">
              {formatVal(pr.previousValue, pr.prType)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="tabular-nums">+{formatVal(pr.delta, pr.prType)}</span>
          </div>

          <div className="flex flex-col text-end">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              {t.newRecord}
            </span>
            <span className="text-base font-black text-emerald-400 tabular-nums">
              {formatVal(pr.newValue, pr.prType)}
            </span>
          </div>
        </div>

        <p className="text-xs text-app-muted mb-5">
          {t.prCelebrationMsg}
        </p>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 border border-amber-400/50 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>{t.keepCrushingIt}</span>
        </button>
      </div>
    </div>
  );
};
