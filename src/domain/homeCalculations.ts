/**
 * Home dashboard figures derived from the athlete's real session history:
 * the current Mon–Sun week strip, weekly totals, PRs set this week and
 * per-muscle recovery inputs. Pure and deterministic (reference date injected).
 */
import { Exercise, MuscleGroup, Session } from '../types/index.ts';
import { localDayKey, workingVolume } from './calculations.ts';

export interface WeekDayStatus {
  key: string;        // local YYYY-MM-DD
  index: number;      // 0 = Mon … 6 = Sun
  trained: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface HomeWeekSummary {
  days: WeekDayStatus[];
  trainedDays: number;
  sessionCount: number;
  volumeKg: number;
  prCount: number;
}

/** Local midnight of the Monday that starts the week containing `ref`. */
export function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const offset = (d.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0
  d.setDate(d.getDate() - offset);
  return d;
}

function sessionVolumeKg(session: Session, exercisesMap: Map<string, Exercise>, userBodyweightKg?: number): number {
  const byExercise = new Map<string, Session['sets']>();
  for (const set of session.sets) {
    const list = byExercise.get(set.exerciseId) ?? [];
    list.push(set);
    byExercise.set(set.exerciseId, list);
  }
  let total = 0;
  for (const [exerciseId, sets] of byExercise) {
    const isBodyweight = exercisesMap.get(exerciseId)?.trackingType === 'bodyweight';
    total += workingVolume(sets, isBodyweight, userBodyweightKg);
  }
  return total;
}

/**
 * Counts heaviest-load PRs set during the current week: an exercise counts once
 * per session when a working set beats every earlier working set of it.
 * The very first time an exercise is logged is a baseline, not a PR.
 */
function countWeekPRs(sessions: Session[], weekStart: Date): number {
  const chronological = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const best = new Map<string, number>();
  let prs = 0;

  for (const session of chronological) {
    const inWeek = new Date(session.startedAt) >= weekStart;
    const sessionBest = new Map<string, number>();
    for (const set of session.sets) {
      if (!set.done || set.tag === 'warmup' || (set.reps ?? 0) <= 0) continue;
      const load = set.loadKg ?? 0;
      if (load <= 0) continue;
      sessionBest.set(set.exerciseId, Math.max(sessionBest.get(set.exerciseId) ?? 0, load));
    }
    for (const [exerciseId, load] of sessionBest) {
      const previous = best.get(exerciseId);
      if (previous !== undefined && load > previous && inWeek) prs++;
      if (previous === undefined || load > previous) best.set(exerciseId, load);
    }
  }
  return prs;
}

export function calculateHomeWeekSummary(
  sessions: Session[],
  exercises: Exercise[],
  referenceDate: Date = new Date(),
  userBodyweightKg?: number
): HomeWeekSummary {
  const weekStart = startOfWeekMonday(referenceDate);
  const todayKey = localDayKey(referenceDate);
  const exercisesMap = new Map(exercises.map(e => [e.id, e]));

  const weekSessions = sessions.filter(s => {
    const started = new Date(s.startedAt);
    const diffDays = (started.getTime() - weekStart.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays < 7;
  });
  const trainedKeys = new Set(weekSessions.map(s => localDayKey(new Date(s.startedAt))));

  const days: WeekDayStatus[] = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    const key = localDayKey(d);
    return {
      key,
      index,
      trained: trainedKeys.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey
    };
  });

  return {
    days,
    trainedDays: trainedKeys.size,
    sessionCount: weekSessions.length,
    volumeKg: Math.round(
      weekSessions.reduce((sum, s) => sum + sessionVolumeKg(s, exercisesMap, userBodyweightKg), 0)
    ),
    prCount: countWeekPRs(sessions, weekStart)
  };
}

/**
 * Builds the calculateRecovery() input: hours since each muscle was last trained
 * as a primary mover, flagged heavy when that session was hard (RPE ≥ 8 or a
 * set taken to failure).
 */
export function buildLastTrainedMap(
  sessions: Session[],
  exercises: Exercise[],
  referenceDate: Date = new Date()
): Partial<Record<MuscleGroup, { hours: number; heavy: boolean }>> {
  const exercisesMap = new Map(exercises.map(e => [e.id, e]));
  const result: Partial<Record<MuscleGroup, { hours: number; heavy: boolean }>> = {};

  for (const session of sessions) {
    const endedAt = new Date(session.endedAt || session.startedAt).getTime();
    const hours = Math.max(0, (referenceDate.getTime() - endedAt) / 3_600_000);
    const doneSets = session.sets.filter(s => s.done && s.tag !== 'warmup');
    if (doneSets.length === 0) continue;

    const heavy =
      (session.effort ?? 0) >= 8 ||
      doneSets.some(s => s.tag === 'failure' || (s.rpe ?? 0) >= 8.5);

    for (const set of doneSets) {
      const ex = exercisesMap.get(set.exerciseId);
      if (!ex) continue;
      for (const muscle of ex.primaryMuscles) {
        const prev = result[muscle];
        if (!prev || hours < prev.hours) {
          result[muscle] = { hours, heavy };
        }
      }
    }
  }
  return result;
}
