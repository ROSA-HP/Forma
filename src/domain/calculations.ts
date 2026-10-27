import { 
  Exercise, 
  Session, 
  SetEntry, 
  MuscleGroup, 
  Region, 
  MuscleBand, 
  ExerciseCategory, 
  CollectionItem, 
  PRRecord, 
  Schedule
} from '../types/index.ts';
import { 
  MUSCLE_GROUPS, 
  REGION_ORDER, 
  REGION_MUSCLES, 
  MET_VALUES, 
  LEVEL_RANKS 
} from './constants.ts';

/**
 * Calculates Estimated 1RM using the Epley formula:
 * 1RM = weight * (1 + reps / 30)
 * - If reps === 1, returns the exact weight.
 * - If reps > 12, ignores and returns 0 (per Epley standard reliability limits).
 * - For bodyweight exercises, incorporates bodyweight + signed load if known.
 */
export function epley1RM(
  loadKg: number,
  reps: number,
  isBodyweight: boolean = false,
  userBodyweightKg?: number
): number {
  if (reps <= 0) return 0;
  if (reps > 12) return 0;

  let effectiveWeight = loadKg;
  if (isBodyweight) {
    const bw = userBodyweightKg ?? 75;
    effectiveWeight = Math.max(0, bw + loadKg);
  }

  if (effectiveWeight <= 0) return 0;
  if (reps === 1) return Math.round(effectiveWeight * 10) / 10;

  const est = effectiveWeight * (1 + reps / 30);
  return Math.round(est * 10) / 10;
}

/**
 * Calculates working volume from a list of sets.
 * Excludes warmup sets.
 * If bodyweight exercise, incorporates (bodyweight + load) * reps.
 */
export function workingVolume(
  sets: SetEntry[],
  isBodyweight: boolean = false,
  userBodyweightKg?: number
): number {
  return sets.reduce((total, s) => {
    if (!s.done || s.tag === 'warmup') return total;
    const reps = s.reps ?? 0;
    if (reps <= 0) return total;

    let load = s.loadKg ?? 0;
    if (isBodyweight) {
      const bw = userBodyweightKg ?? 75;
      load = Math.max(0, bw + load);
    }

    return total + (load * reps);
  }, 0);
}

/**
 * Detects PRs achieved in a workout session compared against previous history.
 * Only done, non-warmup (working) sets are considered.
 */
export function detectPRs(
  exercise: Exercise,
  sessionSets: SetEntry[],
  historySessions: Session[],
  userBodyweightKg?: number
): PRRecord[] {
  const workingSets = sessionSets.filter(s => s.done && s.tag !== 'warmup');
  if (workingSets.length === 0) return [];

  const isBw = exercise.trackingType === 'bodyweight';
  const prs: PRRecord[] = [];

  // Gather all historical working sets for this exercise
  const pastSets: { set: SetEntry; session: Session }[] = [];
  const pastSessionVolumes: { volume: number; session: Session }[] = [];

  for (const s of historySessions) {
    const exSets = s.sets.filter(item => item.exerciseId === exercise.id && item.done && item.tag !== 'warmup');
    if (exSets.length > 0) {
      for (const es of exSets) {
        pastSets.push({ set: es, session: s });
      }
      const v = workingVolume(exSets, isBw, userBodyweightKg);
      pastSessionVolumes.push({ volume: v, session: s });
    }
  }

  // 1. Weight PR
  if (exercise.trackingType === 'weight_reps' || exercise.trackingType === 'bodyweight') {
    let prevMaxWeight = 0;
    let prevWeightDate: string | undefined;

    for (const item of pastSets) {
      const w = item.set.loadKg ?? 0;
      if (w > prevMaxWeight) {
        prevMaxWeight = w;
        prevWeightDate = item.session.endedAt || item.session.startedAt;
      }
    }

    const currentMaxSet = workingSets.reduce<SetEntry | null>((best, curr) => {
      const w = curr.loadKg ?? 0;
      if (!best || w > (best.loadKg ?? 0)) return curr;
      return best;
    }, null);

    if (currentMaxSet && (currentMaxSet.loadKg ?? 0) > prevMaxWeight) {
      const newWeight = currentMaxSet.loadKg ?? 0;
      const delta = prevMaxWeight > 0 ? newWeight - prevMaxWeight : newWeight;
      const calc1RMNew = epley1RM(newWeight, currentMaxSet.reps ?? 1, isBw, userBodyweightKg);
      const calc1RMPrev = prevMaxWeight > 0 ? epley1RM(prevMaxWeight, currentMaxSet.reps ?? 1, isBw, userBodyweightKg) : undefined;

      prs.push({
        exerciseId: exercise.id,
        prType: 'weight',
        newValue: newWeight,
        previousValue: prevMaxWeight,
        delta: Math.round(delta * 10) / 10,
        previousDate: prevWeightDate,
        reps: currentMaxSet.reps,
        weightKg: newWeight,
        calculated1RMNew: calc1RMNew,
        calculated1RMPrev: calc1RMPrev
      });
    }
  }

  // 2. Est 1RM PR
  if (exercise.trackingType === 'weight_reps' || exercise.trackingType === 'bodyweight') {
    let prevBest1RM = 0;
    let prev1RMDate: string | undefined;

    for (const item of pastSets) {
      const r = item.set.reps ?? 0;
      const w = item.set.loadKg ?? 0;
      const est = epley1RM(w, r, isBw, userBodyweightKg);
      if (est > prevBest1RM) {
        prevBest1RM = est;
        prev1RMDate = item.session.endedAt || item.session.startedAt;
      }
    }

    let currentBest1RM = 0;
    let currentBestSet: SetEntry | null = null;
    for (const s of workingSets) {
      const r = s.reps ?? 0;
      const w = s.loadKg ?? 0;
      const est = epley1RM(w, r, isBw, userBodyweightKg);
      if (est > currentBest1RM) {
        currentBest1RM = est;
        currentBestSet = s;
      }
    }

    if (currentBest1RM > prevBest1RM && currentBestSet) {
      // If we already have a weight PR, avoid duplicate if values match exactly
      const hasWeightPR = prs.some(p => p.prType === 'weight');
      if (!hasWeightPR || currentBest1RM > prevBest1RM + 0.1) {
        prs.push({
          exerciseId: exercise.id,
          prType: 'est_1rm',
          newValue: currentBest1RM,
          previousValue: prevBest1RM,
          delta: Math.round((currentBest1RM - prevBest1RM) * 10) / 10,
          previousDate: prev1RMDate,
          reps: currentBestSet.reps,
          weightKg: currentBestSet.loadKg,
          calculated1RMNew: currentBest1RM,
          calculated1RMPrev: prevBest1RM
        });
      }
    }
  }

  // 3. Reps PR
  if (exercise.trackingType === 'reps' || exercise.trackingType === 'bodyweight' || exercise.trackingType === 'weight_reps') {
    for (const s of workingSets) {
      const currentReps = s.reps ?? 0;
      const currentLoad = s.loadKg ?? 0;
      if (currentReps <= 0) continue;

      let prevMaxRepsAtWeight = 0;
      let prevDate: string | undefined;

      for (const item of pastSets) {
        const itemLoad = item.set.loadKg ?? 0;
        const itemReps = item.set.reps ?? 0;
        // Same or heavier weight
        if (itemLoad >= currentLoad && itemReps > prevMaxRepsAtWeight) {
          prevMaxRepsAtWeight = itemReps;
          prevDate = item.session.endedAt || item.session.startedAt;
        }
      }

      if (currentReps > prevMaxRepsAtWeight && prevMaxRepsAtWeight > 0) {
        // Found a reps PR
        if (!prs.some(p => p.prType === 'reps' && p.newValue === currentReps)) {
          prs.push({
            exerciseId: exercise.id,
            prType: 'reps',
            newValue: currentReps,
            previousValue: prevMaxRepsAtWeight,
            delta: currentReps - prevMaxRepsAtWeight,
            previousDate: prevDate,
            reps: currentReps,
            weightKg: currentLoad
          });
        }
      }
    }
  }

  // 4. Session Volume PR
  const currentSessionVolume = workingVolume(workingSets, isBw, userBodyweightKg);
  if (currentSessionVolume > 0) {
    const prevMaxVol = pastSessionVolumes.reduce((max, pv) => Math.max(max, pv.volume), 0);
    if (currentSessionVolume > prevMaxVol && prevMaxVol > 0) {
      prs.push({
        exerciseId: exercise.id,
        prType: 'volume',
        newValue: Math.round(currentSessionVolume),
        previousValue: Math.round(prevMaxVol),
        delta: Math.round(currentSessionVolume - prevMaxVol)
      });
    }
  }

  // 5. Rounds PR
  if (exercise.trackingType === 'rounds') {
    const currentMaxRounds = workingSets.reduce((max, s) => Math.max(max, s.rounds ?? 0), 0);
    const prevMaxRounds = pastSets.reduce((max, item) => Math.max(max, item.set.rounds ?? 0), 0);
    if (currentMaxRounds > prevMaxRounds && currentMaxRounds > 0) {
      prs.push({
        exerciseId: exercise.id,
        prType: 'rounds',
        newValue: currentMaxRounds,
        previousValue: prevMaxRounds,
        delta: currentMaxRounds - prevMaxRounds
      });
    }
  }

  // 6. Timed PR (Duration)
  if (exercise.trackingType === 'duration') {
    const currentMaxDur = workingSets.reduce((max, s) => Math.max(max, s.durationSec ?? 0), 0);
    const prevMaxDur = pastSets.reduce((max, item) => Math.max(max, item.set.durationSec ?? 0), 0);
    if (currentMaxDur > prevMaxDur && currentMaxDur > 0) {
      prs.push({
        exerciseId: exercise.id,
        prType: 'timed',
        newValue: currentMaxDur,
        previousValue: prevMaxDur,
        delta: currentMaxDur - prevMaxDur
      });
    }
  }

  // 7. Distance PR
  if (exercise.trackingType === 'distance_time') {
    const currentMaxDist = workingSets.reduce((max, s) => Math.max(max, s.distanceM ?? 0), 0);
    const prevMaxDist = pastSets.reduce((max, item) => Math.max(max, item.set.distanceM ?? 0), 0);
    if (currentMaxDist > prevMaxDist && currentMaxDist > 0) {
      prs.push({
        exerciseId: exercise.id,
        prType: 'distance',
        newValue: currentMaxDist,
        previousValue: prevMaxDist,
        delta: currentMaxDist - prevMaxDist
      });
    }
  }

  return prs;
}

/**
 * Computes Smart Progressive Overload Target for next session.
 * Rule: if all working sets last time reached top of target rep range at RPE <= 8.5,
 * suggest +incrementKg (default 2.5 kg); otherwise suggest +1 rep at the same weight.
 */
export function smartTarget(
  lastWorkingSets: SetEntry[],
  targetRepMin: number,
  targetRepMax: number,
  incrementKg: number = 2.5
): { weightKg: number; reps: number; reason: string } {
  if (lastWorkingSets.length === 0) {
    return { weightKg: 20, reps: targetRepMin, reason: 'Initial baseline working set' };
  }

  const allReachedTop = lastWorkingSets.every(s => (s.reps ?? 0) >= targetRepMax);
  const allEasyRPE = lastWorkingSets.every(s => (s.rpe ?? 8.0) <= 8.5);
  const baselineWeight = lastWorkingSets[0].loadKg ?? 0;

  if (allReachedTop && allEasyRPE) {
    return {
      weightKg: baselineWeight + incrementKg,
      reps: targetRepMin,
      reason: `All sets hit ${targetRepMax} reps at RPE ≤ 8.5. Overload +${incrementKg} kg.`
    };
  }

  const currentReps = lastWorkingSets[0].reps ?? targetRepMin;
  const nextReps = Math.min(targetRepMax, currentReps + 1);
  return {
    weightKg: baselineWeight,
    reps: nextReps,
    reason: `Push for +1 rep (${nextReps} reps) at current load before increasing weight.`
  };
}

/**
 * Calculates estimated calorie expenditure:
 * Calories = MET * bodyweightKg * hours
 */
export function estimateCalories(
  category: ExerciseCategory,
  durationSeconds: number,
  userBodyweightKg?: number
): number {
  const met = MET_VALUES[category] ?? 5.0;
  const bw = userBodyweightKg ?? 75;
  const hours = durationSeconds / 3600;
  return Math.round(met * bw * hours);
}

/**
 * Calculates estimated collection duration in minutes:
 * Sum over items of sets * (45s work + restSec) / 60, rounded to nearest 5 min.
 */
export function estimateMinutes(items: CollectionItem[]): number {
  if (items.length === 0) return 0;
  const totalSeconds = items.reduce((acc, it) => {
    return acc + (it.sets * (45 + it.restSec));
  }, 0);
  const rawMin = totalSeconds / 60;
  return Math.max(5, Math.round(rawMin / 5) * 5);
}

/**
 * Categorizes a muscle load percentage into standard training bands:
 * Deficit < 60%
 * Maintenance 60-99%
 * Optimal 100-120%
 * Peak > 120%
 */
export function getMuscleBand(pct: number): MuscleBand {
  if (pct < 60) return 'deficit';
  if (pct < 100) return 'maintenance';
  if (pct <= 120) return 'optimal';
  return 'peak';
}

/**
 * Computes weekly muscle volume load across all 18 muscle groups:
 * - A working set counts 1.0 on primary muscles and 0.5 on secondary muscles.
 * - Weekly average sets = total weighted sets in window / (windowDays / 7).
 * - Muscle % = weekly average / weeklyTarget * 100.
 */
export function muscleLoad(
  sessions: Session[],
  windowDays: number,
  exercisesMap: Map<string, Exercise>,
  weeklyTarget: number = 14
): Record<MuscleGroup, { sets: number; weeklyAvg: number; pct: number; band: MuscleBand }> {
  const result: Record<MuscleGroup, { sets: number; weeklyAvg: number; pct: number; band: MuscleBand }> = 
    {} as any;

  for (const m of MUSCLE_GROUPS) {
    result[m] = { sets: 0, weeklyAvg: 0, pct: 0, band: 'deficit' };
  }

  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  for (const session of sessions) {
    const sessionTime = new Date(session.startedAt).getTime();
    if (now - sessionTime > windowMs) continue;

    for (const set of session.sets) {
      if (!set.done || set.tag === 'warmup') continue;
      const ex = exercisesMap.get(set.exerciseId);
      if (!ex || ex.conditioning) continue;

      for (const pm of ex.primaryMuscles) {
        if (result[pm]) result[pm].sets += 1.0;
      }
      for (const sm of ex.secondaryMuscles) {
        if (result[sm]) result[sm].sets += 0.5;
      }
    }
  }

  const weeks = Math.max(1 / 7, windowDays / 7);
  for (const m of MUSCLE_GROUPS) {
    const weeklyAvg = result[m].sets / weeks;
    const pct = Math.round((weeklyAvg / weeklyTarget) * 100);
    result[m].weeklyAvg = Math.round(weeklyAvg * 10) / 10;
    result[m].pct = pct;
    result[m].band = getMuscleBand(pct);
  }

  return result;
}

/**
 * Computes aggregated values for the 6 primary regions:
 * Chest, Delts, Arms, Back, Legs, Core.
 * - Region % = mean of its muscles' %, capped at 150% for the mean.
 * - Uneven note if region is >= 100% but any constituent muscle is < 60%.
 */
export function regionValues(
  muscleLoadMap: Record<MuscleGroup, { pct: number }>
): Record<Region, { pct: number; band: MuscleBand; unevenNote?: string }> {
  const result: Record<Region, { pct: number; band: MuscleBand; unevenNote?: string }> = {} as any;

  for (const region of REGION_ORDER) {
    const muscles = REGION_MUSCLES[region];
    let sum = 0;
    let weakestMuscle: MuscleGroup | null = null;
    let weakestPct = 999;

    for (const m of muscles) {
      const p = muscleLoadMap[m]?.pct ?? 0;
      sum += Math.min(150, p);
      if (p < weakestPct) {
        weakestPct = p;
        weakestMuscle = m;
      }
    }

    const avgPct = Math.round(sum / muscles.length);
    const band = getMuscleBand(avgPct);

    let unevenNote: string | undefined;
    if (avgPct >= 100 && weakestPct < 60 && weakestMuscle) {
      unevenNote = `${formatMuscleName(weakestMuscle)} low (<60%)`;
    }

    result[region] = { pct: avgPct, band, unevenNote };
  }

  return result;
}

/**
 * Calculates muscular balance score:
 * Balance score = (count of muscles >= 60%) / 18 * 100.
 */
export function calculateBalanceScore(
  muscleLoadMap: Record<MuscleGroup, { pct: number }>
): number {
  let optimalOrMaintCount = 0;
  for (const m of MUSCLE_GROUPS) {
    if ((muscleLoadMap[m]?.pct ?? 0) >= 60) {
      optimalOrMaintCount++;
    }
  }
  return Math.round((optimalOrMaintCount / 18) * 100);
}

/**
 * Calculates Recovery % per muscle group:
 * recovery = min(100, hoursSinceLastTrained / recoveryHours * 100)
 * recoveryHours = 48, or 72 if that muscle had 8+ working sets or avg RPE >= 9 in last session.
 * Never trained = 100.
 */
export function calculateRecovery(
  lastTrainedMap: Partial<Record<MuscleGroup, { hours: number; heavy: boolean }>>
): {
  muscles: Record<MuscleGroup, { pct: number; status: 'primed' | 'recovered' | 'recovering' | 'fatigued' }>;
  regions: Record<Region, number>;
  overallReadiness: number;
} {
  const muscles: Record<MuscleGroup, { pct: number; status: 'primed' | 'recovered' | 'recovering' | 'fatigued' }> = 
    {} as any;

  for (const m of MUSCLE_GROUPS) {
    const info = lastTrainedMap[m];
    if (!info) {
      muscles[m] = { pct: 100, status: 'primed' };
      continue;
    }

    const recHours = info.heavy ? 72 : 48;
    const rawPct = Math.min(100, (info.hours / recHours) * 100);
    const pct = Math.round(rawPct);

    let status: 'primed' | 'recovered' | 'recovering' | 'fatigued';
    if (pct >= 90) status = 'primed';
    else if (pct >= 70) status = 'recovered';
    else if (pct >= 50) status = 'recovering';
    else status = 'fatigued';

    muscles[m] = { pct, status };
  }

  // Region recoveries
  const regions: Record<Region, number> = {} as any;
  let totalRegionSum = 0;

  for (const r of REGION_ORDER) {
    const rMuscles = REGION_MUSCLES[r];
    const sum = rMuscles.reduce((acc, m) => acc + muscles[m].pct, 0);
    const avg = Math.round(sum / rMuscles.length);
    regions[r] = avg;
    totalRegionSum += avg;
  }

  const overallReadiness = Math.round(totalRegionSum / REGION_ORDER.length);

  return { muscles, regions, overallReadiness };
}

/**
 * Calculates XP and Level:
 * - 100 XP per completed workout
 * - 10 XP per working set
 * - 50 XP per PR
 * - XP to next level = 300 + 50 * level
 */
export function calculateXP(
  sessions: Session[],
  totalPRs: number
): {
  totalXP: number;
  level: number;
  rankTitle: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPct: number;
} {
  let xp = 0;
  for (const s of sessions) {
    xp += 100;
    const workingSetCount = s.sets.filter(item => item.done && item.tag !== 'warmup').length;
    xp += (workingSetCount * 10);
  }
  xp += (totalPRs * 50);

  // Level determination loop
  let level = 1;
  let remainingXP = xp;
  let neededForCurrentLevel = 300 + 50 * level;

  while (remainingXP >= neededForCurrentLevel) {
    remainingXP -= neededForCurrentLevel;
    level++;
    neededForCurrentLevel = 300 + 50 * level;
  }

  const progressPct = Math.min(100, Math.round((remainingXP / neededForCurrentLevel) * 100));

  // Rank determination
  const rank = LEVEL_RANKS.find(r => level >= r.minLevel)?.title ?? 'Starter';

  return {
    totalXP: xp,
    level,
    rankTitle: rank,
    currentLevelXP: remainingXP,
    nextLevelXP: neededForCurrentLevel,
    progressPct
  };
}

/**
 * Calculates active streak:
 * - A day counts if it has a completed workout, is an unscheduled/marked rest day, or is covered by a freeze.
 * - A missed scheduled workout breaks it. One automatic freeze per week.
 * - With no schedule, streak continues while the gap between workouts is <= 2 days.
 */
export function calculateStreak(
  sessions: Session[],
  schedules: Schedule[] = [],
  referenceDate: Date = new Date()
): {
  currentStreak: number;
  onFire: boolean;
  freezesRemaining: number;
} {
  if (sessions.length === 0) {
    return { currentStreak: 0, onFire: false, freezesRemaining: 1 };
  }

  // Create date map of sessions: "YYYY-MM-DD"
  const sessionDates = new Set<string>();
  for (const s of sessions) {
    const d = s.startedAt.split('T')[0];
    sessionDates.add(d);
  }

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  let streak = 0;
  let freezesUsed = 0;
  let consecutiveRest = 0;

  // Walk backwards day by day from today
  for (let i = 0; i < 90; i++) {
    const checkDate = new Date(ref);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const isToday = i === 0;

    if (sessionDates.has(dateStr)) {
      streak++;
      consecutiveRest = 0;
    } else {
      if (isToday) {
        // Today hasn't happened yet, do not break streak
        continue;
      }

      // Check if scheduled
      const dayOfWeek = (checkDate.getDay() + 6) % 7; // 0=Mon, 6=Sun
      const isScheduled = schedules.some(sc => sc.days.includes(dayOfWeek));

      if (isScheduled) {
        if (freezesUsed < 1) {
          freezesUsed++;
          streak++; // Protected by auto-freeze
        } else {
          break; // Streak broken
        }
      } else {
        // Unscheduled rest day
        consecutiveRest++;
        if (consecutiveRest <= 2) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  return {
    currentStreak: streak,
    onFire: streak >= 3,
    freezesRemaining: Math.max(0, 1 - freezesUsed)
  };
}

/**
 * Calculates auto-rebalance deficit sets for lowest lagging regions:
 * For up to 2 lowest regions under 100%, missing sets = (target - weekly avg) per deficit muscle, capped at 6.
 */
export function autoRebalanceSuggestions(
  regions: Record<Region, { pct: number }>,
  muscleLoads: Record<MuscleGroup, { sets: number; weeklyAvg: number }>,
  weeklyTarget: number = 14
): Array<{ region: Region; deficitMuscles: Array<{ muscle: MuscleGroup; missingSets: number }> }> {
  const lagging = REGION_ORDER
    .filter(r => regions[r].pct < 100)
    .sort((a, b) => regions[a].pct - regions[b].pct)
    .slice(0, 2);

  return lagging.map(region => {
    const muscles = REGION_MUSCLES[region];
    const deficitMuscles = muscles
      .map(m => {
        const avg = muscleLoads[m]?.weeklyAvg ?? 0;
        const missing = Math.min(6, Math.max(0, Math.round(weeklyTarget - avg)));
        return { muscle: m, missingSets: missing };
      })
      .filter(item => item.missingSets > 0);

    return { region, deficitMuscles };
  });
}

/**
 * Utility helper to humanize muscle group IDs
 */
export function formatMuscleName(muscle: MuscleGroup): string {
  const map: Record<MuscleGroup, string> = {
    chest: 'Pectorals',
    traps: 'Trapezius',
    lats: 'Latissimus Dorsi',
    lower_back: 'Spinal Erectors',
    front_delts: 'Front Deltoids',
    side_delts: 'Lateral Deltoids',
    rear_delts: 'Rear Deltoids',
    biceps: 'Biceps Brachii',
    triceps: 'Triceps Brachii',
    forearms: 'Forearms',
    abs: 'Abdominals',
    obliques: 'Obliques',
    glutes: 'Gluteus Maximus',
    quads: 'Quadriceps',
    hamstrings: 'Hamstrings',
    calves: 'Gastrocnemius',
    adductors: 'Adductors',
    hip_flexors: 'Hip Flexors'
  };
  return map[muscle] || muscle;
}

export function formatRegionName(region: Region): string {
  const map: Record<Region, string> = {
    chest: 'Chest',
    delts: 'Deltoids',
    arms: 'Arms',
    back: 'Back',
    legs: 'Legs',
    core: 'Core'
  };
  return map[region] || region;
}

/**
 * Weight unit conversion utilities
 */
export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}

export function formatWeight(kg: number, unit: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'lb') {
    return `${kgToLb(kg)} lb`;
  }
  return `${Math.round(kg * 10) / 10} kg`;
}
