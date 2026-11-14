import React from 'react';
import { 
  Play, 
  RotateCcw, 
  Calendar as CalendarIcon, 
  Dumbbell, 
  TrendingUp, 
  Trophy, 
  Zap, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { MuscleHexagon } from '../components/MuscleHexagon.tsx';
import { CategoryChip } from '../components/CategoryChip.tsx';
import { calculateRecovery, estimateMinutes, kgToLb } from '../domain/calculations.ts';
import { buildLastTrainedMap, calculateHomeWeekSummary } from '../domain/homeCalculations.ts';
import { REGION_ORDER, readinessColor } from '../domain/constants.ts';
import { Region } from '../types/index.ts';

function formatCompact(value: number): string {
  if (value >= 10_000) return `${(value / 1000).toFixed(0)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export const HomeScreen: React.FC = () => {
  const {
    settings,
    sessions,
    exercises,
    collections,
    activeDraft, 
    pendingAlert, 
    dismissAlert, 
    setActiveTab, 
    setActiveCollectionId,
    startWorkout,
    discardWorkout,
    setIsWorkoutActive,
    setIsWorkoutMinimized, 
    t 
  } = useApp();

  const primaryCollection = collections[0] || null;

  const exercisesMap = React.useMemo(() => new Map(exercises.map(e => [e.id, e])), [exercises]);

  // Live readiness from the athlete's real recent sessions
  const readiness = React.useMemo(
    () => calculateRecovery(buildLastTrainedMap(sessions, exercises)),
    [sessions, exercises]
  );

  // Regions sorted most-fatigued first, for the readiness chips
  const regionsByReadiness = React.useMemo(
    () => [...REGION_ORDER].sort((a, b) => readiness.regions[a] - readiness.regions[b]),
    [readiness]
  );
  const recoveringRegions = regionsByReadiness.filter(r => readiness.regions[r] < 90);
  const regionLabel = (r: Region) => t[`region_${r}` as keyof typeof t] as string;

  const week = React.useMemo(
    () => calculateHomeWeekSummary(sessions, exercises, new Date(), settings.userBodyweightKg),
    [sessions, exercises, settings.userBodyweightKg]
  );
  const weekVolume = settings.weightUnit === 'lb' ? kgToLb(week.volumeKg) : week.volumeKg;

  const primaryCategory = primaryCollection
    ? exercisesMap.get(primaryCollection.items[0]?.exerciseId)?.category
    : undefined;

  return (
    <div className="flex flex-col w-full px-4 pt-20 pb-28 max-w-xl mx-auto space-y-4">
      {/* In-App Scheduled Workout Alert Banner */}
      {pendingAlert && (
        <div className="p-3 rounded-xl bg-app-surface border border-app-accent flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Zap className="w-5 h-5 text-app-accent shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-app-accent">
                {pendingAlert.title}
              </span>
              <p className="text-xs text-app-primary mt-0.5">
                {pendingAlert.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAlert}
            className="text-xs font-semibold text-app-muted hover:text-app-primary px-1.5 py-0.5 rounded"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="font-bold text-2xl text-app-primary tracking-tight">
            {settings.profileName ? `${t.welcomeBack}, ${settings.profileName}` : t.welcomeBack}
          </h1>
          <span className="text-xs text-app-muted flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-app-accent animate-pulse" />
            <span>{t.readyForNext}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => startWorkout()}
          className="h-9 px-3 rounded-xl bg-app-surface border border-app hover:border-app-accent text-app-primary font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
          aria-label={t.freestyle}
        >
          <Play className="w-3.5 h-3.5 text-app-accent fill-current" />
          <span>{t.freestyle}</span>
        </button>
      </div>

      {/* Hero Card: Active Session Draft or Planned Workout */}
      {activeDraft ? (
        <section className="w-full rounded-xl bg-app-surface border-2 border-app-accent p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-app-accent/15 text-app-accent font-bold text-xs uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-ping" />
              <span>{t.inProgress}</span>
            </span>
            <span className="text-xs text-app-muted tabular-nums">{t.activeDraft}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-app-primary tracking-tight">
              {activeDraft.collectionName || t.customLiveWorkout}
            </h2>
            <p className="text-xs text-app-muted mt-0.5">
              {activeDraft.exercises.length} {t.exercises.toLowerCase()} · {activeDraft.sets.filter(s => s.done).length} {t.of} {activeDraft.sets.length} {t.sets.toLowerCase()} {t.logged}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsWorkoutActive(true);
                setIsWorkoutMinimized(false);
              }}
              className="flex-1 h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center gap-2 border border-app-accent cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t.resumeWorkout}</span>
            </button>
            <button
              type="button"
              onClick={discardWorkout}
              className="h-12 px-3 rounded-xl bg-app-surface-2 border border-app hover:text-red-400 text-xs font-semibold text-app-muted transition-colors"
            >
              {t.discard}
            </button>
          </div>
        </section>
      ) : primaryCollection ? (
        <section className="w-full rounded-xl bg-app-surface border border-app p-4 flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {primaryCategory && <CategoryChip category={primaryCategory} className="pointer-events-none" />}
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted truncate">
                {primaryCollection.goal}
              </span>
            </div>
            <span className="text-xs text-app-muted tabular-nums shrink-0">
              ~{estimateMinutes(primaryCollection.items)} min
            </span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-app-primary tracking-tight">
              {primaryCollection.name}
            </h2>
            <p className="text-xs text-app-muted mt-0.5">
              {primaryCollection.items.length} {t.exercises.toLowerCase()} · {t.schedule}: {primaryCollection.scheduleChip || t.weeklySchedule}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-app-surface-2 border border-app space-y-1 text-xs">
            {primaryCollection.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-app-muted">
                <span className="text-app-primary font-medium truncate max-w-[200px]">
                  {idx + 1}. {exercisesMap.get(item.exerciseId)?.name ?? item.exerciseId.replace(/-/g, ' ')}
                </span>
                <span className="tabular-nums">{item.sets} {t.sets.toLowerCase()}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => startWorkout(primaryCollection.id)}
              className="flex-1 h-12 rounded-xl bg-app-accent text-on-accent font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer border border-app-accent"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t.startWorkout}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCollectionId(primaryCollection.id)}
              className="h-12 px-4 rounded-xl bg-app-surface-2 border border-app hover:bg-app-surface text-xs font-bold text-app-primary active:scale-98 transition-transform"
            >
              {t.viewRoutine}
            </button>
          </div>
        </section>
      ) : null}

      {/* Physiological Readiness Card with Mini Hexagon */}
      <section className="p-4 rounded-xl bg-app-surface border border-app flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-app pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-app-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-app-primary">
              {t.physiologicalReadiness}
            </span>
          </div>
          <span className="shrink-0 whitespace-nowrap px-2 py-0.5 rounded font-bold text-xs bg-app-accent/15 border border-app-accent/40 text-app-accent tabular-nums">
            {readiness.overallReadiness}% {t.readiness}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-28 shrink-0 flex items-center justify-center">
            <MuscleHexagon
              values={readiness.regions}
              mode="recovery"
              size="sm"
              showLabels={false}
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <p className="text-xs text-app-muted leading-relaxed">
              {recoveringRegions.length === 0
                ? t.readinessAllFresh
                : t.readinessRecovering.replace('{regions}', recoveringRegions.map(regionLabel).join(', '))}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {regionsByReadiness.slice(0, 3).map(region => {
                const pct = readiness.regions[region];
                return (
                  <span
                    key={region}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-app-surface-2 border border-app border-s-2 text-app-primary tabular-nums"
                    style={{ borderInlineStartColor: readinessColor(pct) }}
                  >
                    {regionLabel(region)} {pct}%
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Frequency 7-Day Strip */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-app-muted">
            {t.weeklyFrequency}
          </span>
          <span className="text-xs font-bold text-app-accent tabular-nums uppercase">
            {week.trainedDays} {t.of} {settings.weeklyGoalDays} {t.days}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[t.dayMon, t.dayTue, t.dayWed, t.dayThu, t.dayFri, t.daySat, t.daySun].map((day, idx) => {
            const { trained: isCompleted, isToday } = week.days[idx];

            return (
              <div
                key={idx}
                className={`flex flex-col items-center py-2 rounded-lg border text-xs font-semibold ${
                  isCompleted
                    ? `bg-app-accent/15 text-app-primary ${isToday ? 'border-app-accent' : 'border-app-accent/40'}`
                    : isToday
                    ? 'border-app-accent bg-app-surface-2 text-app-accent'
                    : 'border-app/40 bg-app-surface text-app-muted/60'
                }`}
              >
                <span className="truncate max-w-[28px] text-[10px]">{day.substring(0, 3)}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-app-accent mt-1" />
                ) : isToday ? (
                  <span className="w-2 h-2 rounded-full bg-app-accent mt-2 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-app-muted/30 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3-Column Quick Metrics Grid */}
      <section className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-app-surface border border-app flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-app-muted uppercase">{t.workouts}</span>
          <div className="text-lg font-bold text-app-primary tabular-nums mt-1">
            {week.trainedDays} / {settings.weeklyGoalDays}
          </div>
          <span className={`text-[10px] font-medium mt-0.5 ${week.trainedDays >= settings.weeklyGoalDays ? 'text-app-accent' : 'text-app-muted'}`}>
            {week.trainedDays >= settings.weeklyGoalDays ? t.onTarget : `${week.sessionCount} ${t.sessionPlural.toLowerCase()}`}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-app-surface border border-app flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-app-muted uppercase">{t.volume}</span>
          <div className="text-lg font-bold text-app-primary tabular-nums mt-1">{formatCompact(weekVolume)}</div>
          <span className="text-[10px] text-app-muted mt-0.5">{settings.weightUnit === 'lb' ? t.lbLifted : t.kgLifted}</span>
        </div>
        <div className="p-3 rounded-xl bg-app-surface border border-app flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-app-muted uppercase">{t.milestones}</span>
          <div className={`text-lg font-bold tabular-nums mt-1 ${week.prCount > 0 ? 'text-app-accent' : 'text-app-primary'}`}>
            {week.prCount} {t.newPR}
          </div>
          <span className="text-[10px] text-app-muted mt-0.5">{t.thisWeek}</span>
        </div>
      </section>
    </div>
  );
};
