import React, { useState, useMemo } from 'react';
import {
  Layers,
  Calendar as CalendarIcon,
  Flame,
  Trophy,
  Info,
  BarChart3,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { MuscleHexagon, getHexagonInsightLine } from '../components/MuscleHexagon.tsx';
import { BodyProfileCard } from '../components/BodyProfileCard.tsx';
import {
  muscleLoad,
  regionValues,
  formatRegionName,
  calculateStreak,
  calculateRecovery,
  totalEarnedXP,
  trainingSpanDays,
  getMuscleBand,
  kgToLb
} from '../domain/calculations.ts';
import {
  calculateVolumeTrend,
  calculateExercisePRs,
  calculateAthleteTier,
  ExercisePRDetail
} from '../domain/analyticsCalculations.ts';
import { buildLastTrainedMap } from '../domain/homeCalculations.ts';
import { REGION_ORDER, REGION_MUSCLES, BAND_COLORS, readinessColor, tint } from '../domain/constants.ts';
import { Region, ExerciseCategory } from '../types/index.ts';

type PRTypeKey = 'estimated1RM' | 'heaviestWeight' | 'maxReps' | 'volume';
type PRTypeFilter = Record<PRTypeKey, boolean>;
type TimeRange = '7D' | '30D' | '90D' | 'ALL';

const PR_TYPE_KEYS: PRTypeKey[] = ['estimated1RM', 'heaviestWeight', 'maxReps', 'volume'];
const PR_FILTER_LABELS: Record<PRTypeKey, string> = {
  estimated1RM: '1RM',
  heaviestWeight: 'Wt',
  maxReps: 'Reps',
  volume: 'Vol'
};

function prTypeI18nKey(key: PRTypeKey): keyof typeof import('../i18n/en.ts').en {
  switch (key) {
    case 'estimated1RM': return 'prEstimated1RM';
    case 'heaviestWeight': return 'prHeaviestWeight';
    case 'maxReps': return 'prRepetitionRecord';
    case 'volume': return 'prTotalVolume';
  }
}

function hasPR(pr: ExercisePRDetail, key: PRTypeKey): boolean {
  if (key === 'estimated1RM') return pr.bestEstimated1RM > 0;
  if (key === 'heaviestWeight') return pr.heaviestWeightKg > 0;
  if (key === 'maxReps') return pr.maxReps > 0;
  return pr.lifetimeVolumeKg > 0;
}

function readinessKey(pct: number): 'ready_fresh' | 'ready_ok' | 'ready_recovering' | 'ready_fatigued' {
  if (pct >= 90) return 'ready_fresh';
  if (pct >= 70) return 'ready_ok';
  if (pct >= 50) return 'ready_recovering';
  return 'ready_fatigued';
}

/** 950 → "950", 1 240 → "1.2k", 18 400 → "18k" */
function formatCompact(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

const formatSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const ProgressScreen: React.FC = () => {
  const { sessions, schedules, exercises, settings, setActiveTab, t } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [radarMetric, setRadarMetric] = useState<'volume' | 'recovery'>('volume');
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [prCategoryFilter, setPrCategoryFilter] = useState<ExerciseCategory | 'all'>('all');
  const [prTypeFilter, setPrTypeFilter] = useState<PRTypeFilter>({
    estimated1RM: true, heaviestWeight: true, maxReps: true, volume: true
  });
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const unit = settings.weightUnit;
  const inUnit = (kg: number) => (unit === 'lb' ? kgToLb(kg) : Math.round(kg * 10) / 10);

  const exercisesMap = useMemo(() => new Map(exercises.map(e => [e.id, e])), [exercises]);

  const streak = useMemo(() => calculateStreak(sessions, schedules), [sessions, schedules]);

  // Level and rank come from the XP actually stored on each finished session
  const athleteTier = useMemo(() => calculateAthleteTier(totalEarnedXP(sessions)), [sessions]);

  // Rolling 8-week volume trend
  const volumeTrend = useMemo(() => calculateVolumeTrend(sessions, 8), [sessions]);
  const maxWeeklyVolume = useMemo(
    () => Math.max(...volumeTrend.map(v => v.totalVolumeKg), 0),
    [volumeTrend]
  );

  // ---- Muscle balance (volume) ----
  const targetSets = settings.weeklySetsTargetPerMuscle || 14;

  const loadMap = useMemo(() => {
    // "All time" averages over the weeks actually trained, not an arbitrary century
    const days =
      timeRange === 'ALL' ? trainingSpanDays(sessions)
      : timeRange === '7D' ? 7
      : timeRange === '30D' ? 30
      : 90;
    return muscleLoad(sessions, days, exercisesMap, targetSets);
  }, [sessions, exercisesMap, targetSets, timeRange]);

  const regions = useMemo(() => regionValues(loadMap), [loadMap]);

  const volumeValues = useMemo(() => {
    const record = {} as Record<Region, number>;
    for (const r of REGION_ORDER) record[r] = regions[r].pct;
    return record;
  }, [regions]);

  const hasVolumeInRange = useMemo(
    () => Object.values(loadMap).some(m => m.sets > 0),
    [loadMap]
  );

  // ---- Recovery (always "right now", independent of the time range) ----
  const recovery = useMemo(
    () => calculateRecovery(buildLastTrainedMap(sessions, exercises)),
    [sessions, exercises]
  );

  const isRecovery = radarMetric === 'recovery';
  const chartValues = isRecovery ? recovery.regions : volumeValues;
  const regionLabel = (r: Region) => (t[`region_${r}` as keyof typeof t] as string) || formatRegionName(r);

  const insightLine = useMemo(() => {
    if (isRecovery) {
      const tired = REGION_ORDER.filter(r => recovery.regions[r] < 90);
      return tired.length === 0
        ? t.readinessAllFresh
        : t.readinessRecovering.replace('{regions}', tired.map(regionLabel).join(', '));
    }
    if (!hasVolumeInRange) return t.noTrainingInRange;
    return getHexagonInsightLine(volumeValues, t);
  }, [isRecovery, recovery, volumeValues, hasVolumeInRange, t]);

  // ---- Personal records ----
  const exercisePRs = useMemo(() => calculateExercisePRs(sessions, exercises), [sessions, exercises]);

  const filteredPRs = useMemo(() => {
    const enabled = PR_TYPE_KEYS.filter(k => prTypeFilter[k]);
    return exercisePRs
      // Only exercises that were actually logged, and that hold at least one of the selected record types
      .filter(pr => pr.totalSetsCompleted > 0)
      .filter(pr => prCategoryFilter === 'all' || pr.category === prCategoryFilter)
      .filter(pr => enabled.some(k => hasPR(pr, k)))
      .sort((a, b) => b.totalSetsCompleted - a.totalSetsCompleted);
  }, [exercisePRs, prCategoryFilter, prTypeFilter]);

  // Lifetime tonnage: working sets with external load only (no warm-ups, no assisted loads)
  const totalLifetimeVolumeKg = useMemo(() => {
    let vol = 0;
    for (const session of sessions) {
      for (const set of session.sets) {
        if (set.done && set.tag !== 'warmup' && (set.loadKg ?? 0) > 0 && (set.reps ?? 0) > 0) {
          vol += set.loadKg! * set.reps!;
        }
      }
    }
    return vol;
  }, [sessions]);

  const activeWeekIndex = selectedWeekIndex ?? volumeTrend.length - 1;
  const activeWeekData = volumeTrend[activeWeekIndex];

  return (
    <div className="flex flex-col w-full px-4 pt-20 pb-28 max-w-xl mx-auto space-y-4">
      {/* Screen Title */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex flex-col">
          <h1 className="font-bold text-2xl text-app-primary tracking-tight">
            {t.progress}
          </h1>
          <span className="text-xs text-app-muted">
            {t.volumeProgress}
          </span>
        </div>
      </div>

      {/* Athlete Rank & Level Hero Card */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-app-surface-2 border border-app flex items-center justify-center text-2xl">
              {athleteTier.badge}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-accent">
                {t.levelLabel.replace('{level}', String(athleteTier.level))} · {t.athleteTier}
              </span>
              <h2 className="text-base font-bold text-app-primary truncate">
                {athleteTier.rankTitle}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-xs font-bold text-app-primary tabular-nums">
              {athleteTier.totalXP.toLocaleString()} XP
            </span>
            <span className="text-[10px] text-app-muted uppercase tracking-wider">
              {t.earnedXP}
            </span>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-end text-[11px] text-app-muted">
            <span className="tabular-nums font-semibold text-app-primary">
              {athleteTier.totalXP.toLocaleString()} / {athleteTier.nextLevelXP.toLocaleString()} XP ({athleteTier.progressPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-app-surface-2 border border-app overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${athleteTier.progressPct}%`, backgroundColor: 'var(--accent-line)' }}
            />
          </div>
        </div>

        {/* Lifetime Quick Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-app">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.totalVolume}</span>
            <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
              {formatCompact(inUnit(totalLifetimeVolumeKg))} <span className="text-[10px] font-normal text-app-muted">{unit}</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.workouts}</span>
            <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
              {sessions.length} {t.sessionPlural.toLowerCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.streakDays}</span>
            <span className="text-xs font-bold text-app-accent tabular-nums mt-0.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-current" />
              {streak.currentStreak} {t.days}
            </span>
          </div>
        </div>
      </section>

      {/* Muscle balance / recovery radar */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-app-accent shrink-0" />
              <h2 className="font-bold text-base text-app-primary">
                {t.muscularBalance}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              {isRecovery ? t.recoverySubtitle : t.muscleBalanceSubtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Metric switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-app-surface-2 border border-app rounded-lg">
            {(['volume', 'recovery'] as const).map(metric => (
              <button
                key={metric}
                type="button"
                onClick={() => setRadarMetric(metric)}
                aria-pressed={radarMetric === metric}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                  radarMetric === metric ? 'bg-app-accent text-on-accent' : 'text-app-muted hover:text-app-primary'
                }`}
              >
                {metric === 'volume' ? t.volume : t.recovery}
              </button>
            ))}
          </div>

          {/* Time range only applies to volume; recovery is always "now" */}
          {!isRecovery && (
            <div className="flex items-center p-0.5 bg-app-surface-2 border border-app rounded-lg">
              {(['7D', '30D', '90D', 'ALL'] as const).map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  aria-pressed={timeRange === range}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                    timeRange === range ? 'bg-app-accent text-on-accent' : 'text-app-muted hover:text-app-primary'
                  }`}
                >
                  {range === 'ALL' ? t.rangeAll : range}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hexagon Chart Canvas */}
        <div className="py-2 flex justify-center">
          <MuscleHexagon
            key={radarMetric}
            values={chartValues}
            mode={radarMetric}
            size="md"
            onSelectRegion={(r) => setSelectedRegion(prev => (prev === r ? null : r))}
            selectedRegion={selectedRegion ?? undefined}
          />
        </div>

        {/* Insight Banner */}
        <div className="p-3 rounded-xl bg-app-surface-2 border border-app flex items-start gap-2.5">
          <Info className="w-4 h-4 text-app-accent shrink-0 mt-0.5" />
          <p className="text-xs text-app-primary leading-relaxed font-medium">
            {insightLine}
          </p>
        </div>

        {/* Region list; tapping one opens its individual muscles */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-app-muted px-1">{t.tapRegionHint}</span>
          {REGION_ORDER.map(r => {
            const isSelected = selectedRegion === r;
            const muscles = REGION_MUSCLES[r];
            const pct = isRecovery ? recovery.regions[r] : regions[r].pct;
            const color = isRecovery ? readinessColor(pct) : BAND_COLORS[regions[r].band];
            const statusLabel = isRecovery
              ? t[readinessKey(pct)]
              : t[`bandName_${regions[r].band}` as keyof typeof t];
            const avgWeeklySets = muscles.reduce((sum, m) => sum + loadMap[m].weeklyAvg, 0) / muscles.length;

            return (
              <div
                key={r}
                className={`rounded-lg border transition-colors ${
                  isSelected ? 'bg-app-surface-2 border-app' : 'border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedRegion(isSelected ? null : r)}
                  aria-expanded={isSelected}
                  className="w-full py-2.5 px-2 flex items-center justify-between gap-2 text-start rounded-lg hover:bg-app-surface-2/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-7 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-app-primary">
                        {regionLabel(r)}
                      </span>
                      <span className="text-[11px] text-app-muted truncate">
                        {isRecovery
                          ? statusLabel
                          : regions[r].unevenNote
                            ?? t.setsPerWeekOfTarget
                                .replace('{sets}', formatSets(Math.round(avgWeeklySets * 10) / 10))
                                .replace('{target}', String(targetSets))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-app-primary tabular-nums">
                      {pct}%
                    </span>
                    {!isRecovery && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                        style={{ backgroundColor: tint(color, 12), color, borderColor: tint(color, 35) }}
                      >
                        {statusLabel}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-app-muted transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isSelected && (
                  <ul className="px-3 pb-3 pt-1 flex flex-col gap-2">
                    {muscles.map(m => {
                      const mPct = isRecovery ? recovery.muscles[m].pct : loadMap[m].pct;
                      const mColor = isRecovery ? readinessColor(mPct) : BAND_COLORS[getMuscleBand(mPct)];
                      return (
                        <li key={m} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-app-primary truncate">
                              {t[`muscle_${m}` as keyof typeof t]}
                            </span>
                            <span className="text-app-muted tabular-nums shrink-0">
                              {isRecovery
                                ? `${mPct}%`
                                : `${formatSets(loadMap[m].weeklyAvg)} / ${targetSets} · ${mPct}%`}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-app-surface overflow-hidden border border-app">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, mPct)}%`, backgroundColor: mColor }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Body type from height + weight */}
      <BodyProfileCard onOpenSettings={() => setActiveTab('more')} />

      {/* Rolling Weekly Volume Chart */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-app-accent shrink-0" />
              <h2 className="font-bold text-base text-app-primary">
                {t.weeklyVolumeTitle}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              {t.weeklyVolumeSubtitle}
            </span>
          </div>

          {activeWeekData && (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-bold text-app-primary tabular-nums">
                {Math.round(inUnit(activeWeekData.totalVolumeKg)).toLocaleString()} {unit}
              </span>
              <span className="text-[10px] text-app-muted tabular-nums">
                {activeWeekData.sessionCount} {t.sessionPlural.toLowerCase()} · {activeWeekData.totalDurationMin}m
              </span>
            </div>
          )}
        </div>

        {/* Bars: each column is a fixed-height track, the fill is the week's share of the best week */}
        <div dir="ltr" className="flex items-stretch justify-between gap-1.5 h-44">
          {volumeTrend.map((point, idx) => {
            const heightPct = maxWeeklyVolume > 0 && point.totalVolumeKg > 0
              ? Math.max(4, Math.round((point.totalVolumeKg / maxWeeklyVolume) * 100))
              : 0;
            const isSelected = idx === activeWeekIndex;

            return (
              <button
                key={point.startDate}
                type="button"
                onClick={() => setSelectedWeekIndex(idx)}
                aria-pressed={isSelected}
                aria-label={`${t.weekOf.replace('{date}', point.weekLabel)}: ${Math.round(inUnit(point.totalVolumeKg))} ${unit}`}
                className="flex-1 min-w-0 flex flex-col items-center gap-1"
              >
                <span className={`text-[10px] tabular-nums h-3.5 leading-none ${
                  isSelected ? 'text-app-accent font-bold' : 'text-app-muted'
                }`}>
                  {point.totalVolumeKg > 0 ? formatCompact(inUnit(point.totalVolumeKg)) : ''}
                </span>

                <div className={`flex-1 w-full max-w-[36px] rounded-lg bg-app-surface-2 border flex flex-col justify-end overflow-hidden ${
                  isSelected ? 'border-app-accent' : 'border-app'
                }`}>
                  <div
                    className="w-full rounded-t-[5px] transition-all duration-300"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: 'var(--accent-line)',
                      opacity: isSelected ? 1 : 0.45
                    }}
                  />
                </div>

                <span className={`text-[9px] font-medium truncate max-w-full leading-none ${
                  isSelected ? 'text-app-accent font-bold' : 'text-app-muted'
                }`}>
                  {point.weekLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Week Detail */}
        {activeWeekData && (
          <div className="p-3 rounded-lg bg-app-surface-2 border border-app flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarIcon className="w-4 h-4 text-app-accent shrink-0" />
              <span className="font-semibold text-app-primary truncate">
                {t.weekOf.replace('{date}', activeWeekData.weekLabel)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-app-muted tabular-nums shrink-0">
              <span>{activeWeekData.sessionCount} {t.workouts.toLowerCase()}</span>
              <span>•</span>
              <span>{t.totalRepsCount.replace('{count}', String(activeWeekData.totalReps))}</span>
            </div>
          </div>
        )}
      </section>

      {/* All-Time PR Hall of Fame */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <h2 className="font-bold text-base text-app-primary">
                {t.personalRecordsHall}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              {t.prHallSubtitle}
            </span>
          </div>

          <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-bold tabular-nums">
            {filteredPRs.length}
          </span>
        </div>

        {/* Record type toggles (an exercise shows when it holds any selected type) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PR_TYPE_KEYS.map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setPrTypeFilter(prev => ({ ...prev, [key]: !prev[key] }))}
              aria-pressed={prTypeFilter[key]}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                prTypeFilter[key]
                  ? 'bg-app-accent/15 text-app-accent border-app-accent/40'
                  : 'bg-app-surface-2 border-app text-app-muted hover:text-app-primary'
              }`}
              title={t[prTypeI18nKey(key) as keyof typeof t]}
            >
              {PR_FILTER_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(['all', 'gym', 'calisthenics', 'martial_arts', 'cardio', 'custom'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPrCategoryFilter(cat)}
              aria-pressed={prCategoryFilter === cat}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                prCategoryFilter === cat
                  ? 'bg-app-accent text-on-accent border-app-accent'
                  : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
              }`}
            >
              {cat === 'all' ? t.allDisciplines : (t[cat as keyof typeof t] || cat)}
            </button>
          ))}
        </div>

        {/* PR Cards */}
        {filteredPRs.length === 0 ? (
          <div className="p-6 rounded-xl bg-app-surface-2 border border-app flex flex-col items-center justify-center text-center space-y-2">
            <Trophy className="w-8 h-8 text-app-muted/60" />
            <span className="text-xs font-bold text-app-primary">{t.noRecordsYet}</span>
            <span className="text-[11px] text-app-muted">
              {t.prNoRecordsHint}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPRs.map(pr => {
              const show1RM = prTypeFilter.estimated1RM && hasPR(pr, 'estimated1RM');
              const showWeight = prTypeFilter.heaviestWeight && hasPR(pr, 'heaviestWeight');
              const showReps = prTypeFilter.maxReps && hasPR(pr, 'maxReps');
              const showVol = prTypeFilter.volume && hasPR(pr, 'volume');

              return (
                <div
                  key={pr.exerciseId}
                  className="p-2.5 rounded-xl bg-app-surface-2 border border-app flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-app-primary truncate">
                        {pr.exerciseName}
                      </span>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-app-surface border border-app text-app-muted">
                        {t[pr.category as keyof typeof t] || pr.category}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-app-muted tabular-nums">
                      {pr.totalSetsCompleted} {t.sets.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {show1RM && (
                      <div className="rounded-lg bg-app-surface border border-app px-1.5 py-1 text-center">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-amber-400">1RM</span>
                        <span className="block text-xs font-black text-app-primary tabular-nums">{inUnit(pr.bestEstimated1RM)}</span>
                        <span className="block text-[8px] text-app-muted">{unit}</span>
                      </div>
                    )}
                    {showWeight && (
                      <div className="rounded-lg bg-app-surface border border-app px-1.5 py-1 text-center">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-emerald-400">Wt</span>
                        <span className="block text-xs font-black text-app-primary tabular-nums">{inUnit(pr.heaviestWeightKg)}</span>
                        <span className="block text-[8px] text-app-muted">{unit} × {pr.heaviestWeightReps}</span>
                      </div>
                    )}
                    {showReps && (
                      <div className="rounded-lg bg-app-surface border border-app px-1.5 py-1 text-center">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-sky-400">Reps</span>
                        <span className="block text-xs font-black text-app-primary tabular-nums">{pr.maxReps}</span>
                        <span className="block text-[8px] text-app-muted">
                          {pr.maxRepsWeightKg ? `@ ${inUnit(pr.maxRepsWeightKg)} ${unit}` : t.reps.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {showVol && (
                      <div className="rounded-lg bg-app-surface border border-app px-1.5 py-1 text-center">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-violet-400">Vol</span>
                        <span className="block text-xs font-black text-app-primary tabular-nums">{formatCompact(inUnit(pr.lifetimeVolumeKg))}</span>
                        <span className="block text-[8px] text-app-muted">{unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
