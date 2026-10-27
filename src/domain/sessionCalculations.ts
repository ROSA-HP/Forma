import { 
  Session, 
  Exercise, 
  SetEntry, 
  Collection, 
  PRRecord, 
  Region,
  MuscleBand 
} from '../types/index.ts';
import { 
  workingVolume, 
  detectPRs, 
  smartTarget, 
  estimateCalories, 
  calculateXP, 
  muscleLoad, 
  regionValues 
} from './calculations.ts';

export interface SessionSummary {
  durationSeconds: number;
  durationFormatted: string;
  totalSets: number;
  completedSets: number;
  warmupSets: number;
  workingSets: number;
  tonnageKg: number;
  estimatedCalories: number;
  xpEarned: number;
  prsAchieved: PRRecord[];
  regionDistribution: Record<Region, { pct: number; band: MuscleBand; unevenNote?: string }>;
  primaryCategory: string;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
}

/**
 * Analyzes a completed or ongoing session and returns comprehensive performance metrics
 */
export function calculateSessionSummary(
  session: Session,
  exercises: Exercise[],
  userBodyweightKg: number = 75,
  historySessions: Session[] = []
): SessionSummary {
  const started = new Date(session.startedAt).getTime();
  const ended = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  const rawSec = Math.max(0, Math.floor((ended - started - (session.pausedMs || 0)) / 1000));

  const totalSets = session.sets.length;
  const completedSets = session.sets.filter(s => s.done).length;
  const warmupSets = session.sets.filter(s => s.done && s.tag === 'warmup').length;
  const workingSets = session.sets.filter(s => s.done && s.tag !== 'warmup').length;

  // Exercise map
  const exMap = new Map<string, Exercise>();
  for (const ex of exercises) {
    exMap.set(ex.id, ex);
  }

  // Calculate total working tonnage
  let tonnageKg = 0;
  for (const s of session.sets) {
    if (!s.done || s.tag === 'warmup') continue;
    const ex = exMap.get(s.exerciseId);
    const isBw = ex?.trackingType === 'bodyweight';
    const reps = s.reps ?? 0;
    let load = s.loadKg ?? 0;
    if (isBw) {
      load = Math.max(0, userBodyweightKg + load);
    }
    tonnageKg += load * reps;
  }

  // PRs detection
  const prsAchieved: PRRecord[] = [];
  // Exclude current session from history for PR evaluation
  const priorHistory = historySessions.filter(h => h.id !== session.id);

  // Group sets by exercise
  const exSetsMap = new Map<string, SetEntry[]>();
  for (const s of session.sets) {
    const list = exSetsMap.get(s.exerciseId) || [];
    list.push(s);
    exSetsMap.set(s.exerciseId, list);
  }

  for (const [exId, sList] of exSetsMap.entries()) {
    const ex = exMap.get(exId);
    if (!ex) continue;
    const exPrs = detectPRs(ex, sList, priorHistory, userBodyweightKg);
    prsAchieved.push(...exPrs);
  }

  // XP calculation: 100 for workout + 10 per working set + 50 per PR
  const xpEarned = 100 + (workingSets * 10) + (prsAchieved.length * 50);

  // Muscle load & regional distribution
  const mLoad = muscleLoad([session], 7, exMap, 14);
  const regionDist = regionValues(mLoad);

  // Determine dominant category
  const doneSets = session.sets.filter(s => s.done);
  const categoryCounts: Record<string, number> = {};
  for (const s of doneSets) {
    const ex = exMap.get(s.exerciseId);
    if (ex) {
      categoryCounts[ex.category] = (categoryCounts[ex.category] || 0) + 1;
    }
  }
  let dominantCat = 'gym';
  let maxCount = -1;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantCat = cat;
    }
  }

  const estimatedCals = estimateCalories(
    dominantCat as any,
    rawSec,
    userBodyweightKg
  );

  return {
    durationSeconds: rawSec,
    durationFormatted: formatDuration(rawSec),
    totalSets,
    completedSets,
    warmupSets,
    workingSets,
    tonnageKg: Math.round(tonnageKg * 10) / 10,
    estimatedCalories: estimatedCals,
    xpEarned,
    prsAchieved,
    regionDistribution: regionDist,
    primaryCategory: dominantCat
  };
}

/**
 * Builds initial draft sets for a workout started from a collection.
 * Inspects past session history to prefill recommended weights / reps.
 */
export function buildInitialDraftSets(
  collection: Collection,
  exercises: Exercise[],
  historySessions: Session[]
): { sets: SetEntry[]; draftExercises: Exercise[] } {
  const exMap = new Map<string, Exercise>();
  for (const e of exercises) exMap.set(e.id, e);

  const draftExercises: Exercise[] = [];
  const sets: SetEntry[] = [];

  for (let itemIdx = 0; itemIdx < collection.items.length; itemIdx++) {
    const item = collection.items[itemIdx];
    const ex = exMap.get(item.exerciseId);
    if (!ex) continue;

    draftExercises.push(ex);

    // Look for last performance of this exercise in history
    let lastSets: SetEntry[] = [];
    for (const past of historySessions) {
      const match = past.sets.filter(s => s.exerciseId === ex.id && s.done && s.tag !== 'warmup');
      if (match.length > 0) {
        lastSets = match;
        break; // newest session first
      }
    }

    // Determine target load & reps
    const target = smartTarget(lastSets, item.repsMin, item.repsMax);

    // Generate sets
    const setCount = Math.max(1, item.sets);
    for (let sIdx = 0; sIdx < setCount; sIdx++) {
      const isWarmup = sIdx === 0 && setCount >= 3 && (ex.category === 'gym');
      const load = isWarmup ? Math.round((target.weightKg * 0.5) / 2.5) * 2.5 : target.weightKg;
      const reps = isWarmup ? Math.min(12, item.repsMax + 2) : target.reps;

      sets.push({
        id: crypto.randomUUID(),
        exerciseId: item.exerciseId,
        tag: isWarmup ? 'warmup' : 'normal',
        loadKg: ex.trackingType === 'reps' ? undefined : load,
        reps: ex.trackingType === 'duration' ? undefined : reps,
        durationSec: ex.trackingType === 'duration' ? 45 : undefined,
        distanceM: ex.trackingType === 'distance_time' ? 1000 : undefined,
        rounds: ex.trackingType === 'rounds' ? 3 : undefined,
        rpe: undefined,
        done: false
      });
    }
  }

  return { sets, draftExercises };
}
