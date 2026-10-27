import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Layers, 
  Calendar as CalendarIcon, 
  Flame, 
  Scale, 
  Trophy, 
  AlertTriangle, 
  Award, 
  Zap, 
  BarChart3, 
  Dumbbell, 
  CheckCircle2, 
  Target, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { MuscleHexagon, getHexagonInsightLine } from '../components/MuscleHexagon.tsx';
import { 
  muscleLoad, 
  regionValues, 
  calculateBalanceScore, 
  formatRegionName,
  calculateStreak,
  calculateXP
} from '../domain/calculations.ts';
import { 
  calculateVolumeTrend, 
  calculateExercisePRs, 
  calculateAthleteTier, 
  ExercisePRDetail 
} from '../domain/analyticsCalculations.ts';
import { REGION_ORDER, BAND_COLORS } from '../domain/constants.ts';
import { Region, ExerciseCategory } from '../types/index.ts';

export const ProgressScreen: React.FC = () => {
  const { sessions, schedules, exercises, settings, t } = useApp();

  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [radarMetric, setRadarMetric] = useState<'volume' | 'recovery'>('volume');
  const [selectedRegion, setSelectedRegion] = useState<Region>('back');
  const [prCategoryFilter, setPrCategoryFilter] = useState<ExerciseCategory | 'all'>('all');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);

  const exercisesMap = useMemo(() => {
    return new Map(exercises.map(e => [e.id, e]));
  }, [exercises]);

  const streak = useMemo(() => {
    return calculateStreak(sessions, schedules);
  }, [sessions, schedules]);

  const rawXP = useMemo(() => {
    return calculateXP(sessions, 5);
  }, [sessions]);

  const athleteTier = useMemo(() => {
    return calculateAthleteTier(rawXP.totalXP);
  }, [rawXP.totalXP]);

  // Rolling 8-week volume trend
  const volumeTrend = useMemo(() => {
    return calculateVolumeTrend(sessions, 8);
  }, [sessions]);

  const maxWeeklyVolume = useMemo(() => {
    if (volumeTrend.length === 0) return 1;
    return Math.max(...volumeTrend.map(v => v.totalVolumeKg), 1);
  }, [volumeTrend]);

  // Filter sessions by selected time range
  const filteredSessions = useMemo(() => {
    if (timeRange === 'ALL') return sessions;
    const now = Date.now();
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return sessions.filter(s => new Date(s.startedAt).getTime() >= cutoff);
  }, [sessions, timeRange]);

  // Region breakdown calculations
  const targetSets = settings.weeklySetsTargetPerMuscle || 14;

  const loadMap = useMemo(() => {
    const days = timeRange === 'ALL' ? 36500 : timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90;
    return muscleLoad(filteredSessions, days, exercisesMap, targetSets);
  }, [filteredSessions, exercisesMap, targetSets, timeRange]);

  const regions = useMemo(() => {
    return regionValues(loadMap);
  }, [loadMap]);

  const regionValuesRecord = useMemo(() => {
    const record: Record<Region, number> = {
      chest: regions.chest.pct,
      delts: regions.delts.pct,
      arms: regions.arms.pct,
      back: regions.back.pct,
      legs: regions.legs.pct,
      core: regions.core.pct
    };
    return record;
  }, [regions]);

  const insightLine = useMemo(() => {
    return getHexagonInsightLine(regionValuesRecord, t);
  }, [regionValuesRecord]);

  // Exercise Hall of Fame PRs
  const exercisePRs = useMemo(() => {
    return calculateExercisePRs(sessions, exercises);
  }, [sessions, exercisesMap]);

  const filteredPRs = useMemo(() => {
    if (prCategoryFilter === 'all') return exercisePRs;
    return exercisePRs.filter(pr => pr.category === prCategoryFilter);
  }, [exercisePRs, prCategoryFilter]);

  // Total Lifetime Volume tonnage
  const totalLifetimeVolumeKg = useMemo(() => {
    let vol = 0;
    for (const session of sessions) {
      for (const set of session.sets) {
        if (set.done && set.loadKg && set.reps) {
          vol += set.loadKg * set.reps;
        }
      }
    }
    return vol;
  }, [sessions]);

  const activeWeekData = selectedWeekIndex !== null ? volumeTrend[selectedWeekIndex] : volumeTrend[volumeTrend.length - 1];

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-app-surface-2 border border-app flex items-center justify-center text-2xl">
              {athleteTier.badge}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-app-accent">
                Level {athleteTier.level} {t.athleteTier}
              </span>
              <h2 className="text-base font-bold text-app-primary">
                {athleteTier.rankTitle}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end">
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
          <div className="flex items-center justify-between text-[11px] text-app-muted">
            <span>{t.athleteTier} Progression</span>
            <span className="tabular-nums font-semibold text-app-primary">
              {athleteTier.currentLevelXP} / {athleteTier.nextLevelXP} XP ({athleteTier.progressPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-app-surface-2 border border-app overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-app-accent to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${athleteTier.progressPct}%` }}
            />
          </div>
        </div>

        {/* Lifetime Quick Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-app">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{t.totalVolume}</span>
            <span className="text-xs font-bold text-app-primary tabular-nums mt-0.5">
              {(totalLifetimeVolumeKg / 1000).toFixed(1)}k <span className="text-[10px] font-normal text-app-muted">kg</span>
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

      {/* Hexagonal Kinetic Radar */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        {/* Header & Metric Switcher */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-app-accent" />
              <h2 className="font-bold text-base text-app-primary">
                {t.muscularBalance}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              Volume allocation across primary kinetic regions
            </span>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-0.5 bg-app-surface-2 border border-app rounded-lg">
            {(['7D', '30D', '90D', 'ALL'] as const).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                  timeRange === range ? 'bg-app-accent text-on-accent' : 'text-app-muted hover:text-app-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 p-0.5 bg-app-surface-2 border border-app rounded-lg">
            <button
              type="button"
              onClick={() => setRadarMetric('volume')}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                radarMetric === 'volume' ? 'bg-app-accent text-on-accent' : 'text-app-muted'
              }`}
            >
              {t.volume}
            </button>
            <button
              type="button"
              onClick={() => setRadarMetric('recovery')}
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                radarMetric === 'recovery' ? 'bg-app-accent text-on-accent' : 'text-app-muted'
              }`}
            >
              {t.recovery}
            </button>
          </div>
          <span className="text-[11px] text-app-muted tabular-nums">
            Tap region to inspect
          </span>
        </div>

        {/* Hexagon Chart Canvas */}
        <div className="py-2 flex justify-center">
          <MuscleHexagon
            values={regionValuesRecord}
            mode={radarMetric}
            size="md"
            onSelectRegion={(r) => setSelectedRegion(r)}
            selectedRegion={selectedRegion}
          />
        </div>

        {/* Insight Banner */}
        <div className="p-3 rounded-xl bg-app-surface-2 border border-app flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-app-accent shrink-0 mt-0.5" />
          <p className="text-xs text-app-primary leading-relaxed font-medium">
            {insightLine}
          </p>
        </div>

        {/* 6 Region Status List */}
        <div className="flex flex-col divide-y divide-app pt-1">
          {REGION_ORDER.map(r => {
            const reg = regions[r];
            const color = BAND_COLORS[reg.band];
            const isSelected = selectedRegion === r;

            return (
              <div
                key={r}
                onClick={() => setSelectedRegion(r)}
                className={`py-2.5 flex items-center justify-between cursor-pointer px-2 rounded-lg transition-colors ${
                  isSelected ? 'bg-app-surface-2 border border-app' : 'hover:bg-app-surface-2/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-7 rounded-full" style={{ backgroundColor: color }} />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-app-primary">
                      {t[`region_${r}` as keyof typeof t] || formatRegionName(r)}
                    </span>
                    {reg.unevenNote ? (
                      <span className="text-[11px] text-amber-400 font-medium">
                        {reg.unevenNote}
                      </span>
                    ) : (
                      <span className="text-[11px] text-app-muted">
                        Target: 10–20 sets/wk
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-app-primary tabular-nums">
                    {reg.pct}%
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                    style={{
                      backgroundColor: `${color}15`,
                      color: color,
                      borderColor: `${color}40`
                    }}
                  >
                    {reg.band}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rolling Weekly Volume Progression Chart */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-app-accent" />
              <h2 className="font-bold text-base text-app-primary">
                {t.volumeProgress}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              Rolling weekly tonnage &amp; session frequency
            </span>
          </div>

          {activeWeekData && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-app-primary tabular-nums">
                {activeWeekData.totalVolumeKg.toLocaleString()} kg
              </span>
              <span className="text-[10px] text-app-muted">
                {activeWeekData.sessionCount} {t.sessionPlural.toLowerCase()} · {activeWeekData.totalDurationMin}m
              </span>
            </div>
          )}
        </div>

        {/* Bar Chart Visualization */}
        <div className="pt-4 pb-2">
          <div className="h-40 flex items-end justify-between gap-2 px-1">
            {volumeTrend.map((point, idx) => {
              const heightPct = maxWeeklyVolume > 0
                ? Math.max(12, Math.round((point.totalVolumeKg / maxWeeklyVolume) * 100))
                : 12;
              const isSelected = selectedWeekIndex === idx || (selectedWeekIndex === null && idx === volumeTrend.length - 1);

              return (
                <div
                  key={point.startDate}
                  onClick={() => setSelectedWeekIndex(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Top Volume Indicator */}
                  <span className={`text-[10px] tabular-nums mb-1 transition-opacity ${
                    isSelected ? 'text-app-accent font-bold opacity-100' : 'text-app-muted opacity-0 group-hover:opacity-100'
                  }`}>
                    {point.totalVolumeKg > 0 ? `${Math.round(point.totalVolumeKg / 1000)}k` : '0'}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[36px] bg-app-surface-2 rounded-t-lg overflow-hidden flex flex-col justify-end p-0.5 border border-app">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? 'bg-app-accent'
                          : 'bg-app-accent/40 group-hover:bg-app-accent/70'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Week Label */}
                  <span className={`text-[10px] mt-2 font-medium truncate max-w-[48px] ${
                    isSelected ? 'text-app-accent font-bold' : 'text-app-muted'
                  }`}>
                    {point.weekLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Week Detail Summary Pill */}
        {activeWeekData && (
          <div className="p-3 rounded-lg bg-app-surface-2 border border-app flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-app-accent" />
              <span className="font-semibold text-app-primary">
                Week of {activeWeekData.weekLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-app-muted tabular-nums">
              <span>{activeWeekData.sessionCount} {t.workouts.toLowerCase()}</span>
              <span>•</span>
              <span>{activeWeekData.totalReps} total reps</span>
            </div>
          </div>
        )}
      </section>

      {/* All-Time PR Hall of Fame Showcase */}
      <section className="p-4 rounded-xl bg-app-surface border border-app space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-base text-app-primary">
                {t.personalRecordsHall}
              </h2>
            </div>
            <span className="text-xs text-app-muted">
              Lifetime best 1RM, heaviest weight &amp; max reps
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-bold tabular-nums">
            {filteredPRs.length} {t.milestones}
          </span>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setPrCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
              prCategoryFilter === 'all'
                ? 'bg-app-accent text-on-accent border-app-accent'
                : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
            }`}
          >
            {t.allDisciplines}
          </button>
          {(['gym', 'calisthenics', 'martial_arts', 'cardio'] as ExerciseCategory[]).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setPrCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all border ${
                prCategoryFilter === cat
                  ? 'bg-app-accent text-on-accent border-app-accent'
                  : 'bg-app-surface border-app text-app-muted hover:text-app-primary'
              }`}
            >
              {t[cat as keyof typeof t] || cat}
            </button>
          ))}
        </div>

        {/* PR Cards Grid */}
        {filteredPRs.length === 0 ? (
          <div className="p-6 rounded-xl bg-app-surface-2 border border-app flex flex-col items-center justify-center text-center space-y-2">
            <Trophy className="w-8 h-8 text-app-muted/60" />
            <span className="text-xs font-bold text-app-primary">{t.noRecordsYet}</span>
            <span className="text-[11px] text-app-muted">
              Complete your first workout in this category to establish all-time records.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredPRs.map(pr => (
              <div
                key={pr.exerciseId}
                className="p-3.5 rounded-xl bg-app-surface-2 border border-app flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-app-primary">
                      {pr.exerciseName}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-app-muted">
                      {t[pr.category as keyof typeof t] || pr.category} · {pr.totalSetsCompleted} {t.sets.toLowerCase()} {t.logged}
                    </span>
                  </div>

                  {pr.bestEstimated1RM > 0 && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {t.prEstimated1RM}
                      </span>
                      <span className="text-sm font-bold text-app-primary tabular-nums">
                        {pr.bestEstimated1RM} kg
                      </span>
                    </div>
                  )}
                </div>

                {/* PR Badges */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-app text-xs">
                  {/* Heaviest Weight */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-app-muted uppercase font-semibold">{t.heaviest}</span>
                    <span className="font-bold text-app-primary tabular-nums mt-0.5">
                      {pr.heaviestWeightKg > 0 ? `${pr.heaviestWeightKg}kg` : '—'}
                      {pr.heaviestWeightReps ? ` × ${pr.heaviestWeightReps}` : ''}
                    </span>
                    {pr.heaviestWeightDate && (
                      <span className="text-[9px] text-app-muted tabular-nums">{pr.heaviestWeightDate}</span>
                    )}
                  </div>

                  {/* Max Reps */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-app-muted uppercase font-semibold">{t.reps}</span>
                    <span className="font-bold text-app-primary tabular-nums mt-0.5">
                      {pr.maxReps > 0 ? `${pr.maxReps} reps` : '—'}
                    </span>
                    {pr.maxRepsDate && (
                      <span className="text-[9px] text-app-muted tabular-nums">{pr.maxRepsDate}</span>
                    )}
                  </div>

                  {/* Lifetime Volume */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-app-muted uppercase font-semibold">{t.volume}</span>
                    <span className="font-bold text-app-accent tabular-nums mt-0.5">
                      {pr.lifetimeVolumeKg > 0 ? `${pr.lifetimeVolumeKg.toLocaleString()}kg` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
