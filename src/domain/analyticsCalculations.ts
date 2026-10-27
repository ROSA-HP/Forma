import { Session, Exercise, ExerciseCategory } from '../types/index.ts';

export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalVolumeKg: number;
  totalReps: number;
  sessionCount: number;
  totalDurationMin: number;
}

export interface ExercisePRDetail {
  exerciseId: string;
  exerciseName: string;
  category: ExerciseCategory;
  heaviestWeightKg: number;
  heaviestWeightReps?: number;
  heaviestWeightDate?: string;
  bestEstimated1RM: number;
  best1RMDate?: string;
  maxReps: number;
  maxRepsWeightKg?: number;
  maxRepsDate?: string;
  lifetimeVolumeKg: number;
  totalSetsCompleted: number;
}

export interface AthleteRankInfo {
  level: number;
  rankTitle: string;
  badge: string;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPct: number;
}

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a full month calendar grid (35 or 42 cells) starting on Monday.
 */
export function getCalendarMonthMatrix(year: number, month: number, today = new Date()): CalendarDay[] {
  const todayKey = formatDateKey(today);

  // First day of target month
  const firstDay = new Date(year, month, 1);
  // Get day of week with Monday = 0, Sunday = 6
  let firstDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Last day of target month
  const lastDay = new Date(year, month + 1, 0);
  const totalDaysInMonth = lastDay.getDate();

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const d = new Date(year, month - 1, dayNum);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: formatDateKey(d) === todayKey,
      dayOfWeek: (d.getDay() + 6) % 7,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: formatDateKey(d) === todayKey,
      dayOfWeek: (d.getDay() + 6) % 7,
    });
  }

  // Next month leading days to complete full 7-day rows (up to 35 or 42)
  const remaining = (7 - (days.length % 7)) % 7;
  const targetTotal = days.length + remaining < 35 ? 35 : days.length + remaining;
  const nextMonthDaysToAdd = targetTotal - days.length;

  for (let i = 1; i <= nextMonthDaysToAdd; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: formatDateKey(d) === todayKey,
      dayOfWeek: (d.getDay() + 6) % 7,
    });
  }

  return days;
}

/**
 * Group sessions by their starting date in YYYY-MM-DD
 */
export function groupSessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const s of sessions) {
    if (!s.startedAt) continue;
    const dateKey = formatDateKey(new Date(s.startedAt));
    const list = map.get(dateKey) || [];
    list.push(s);
    map.set(dateKey, list);
  }
  return map;
}

/**
 * Determines primary discipline category of a session based on performed exercises
 */
export function getSessionDominantCategory(
  session: Session,
  exercisesMap: Map<string, Exercise>
): ExerciseCategory {
  const counts: Record<ExerciseCategory, number> = {
    gym: 0,
    calisthenics: 0,
    martial_arts: 0,
    cardio: 0,
    custom: 0,
  };

  for (const set of session.sets) {
    if (!set.done) continue;
    const ex = exercisesMap.get(set.exerciseId);
    if (ex && ex.category) {
      counts[ex.category] = (counts[ex.category] || 0) + 1;
    }
  }

  let topCategory: ExerciseCategory = 'gym';
  let maxCount = -1;
  (Object.keys(counts) as ExerciseCategory[]).forEach((cat) => {
    if (counts[cat] > maxCount) {
      maxCount = counts[cat];
      topCategory = cat;
    }
  });

  // If no completed sets found, fallback to collection goal or 'gym'
  return topCategory;
}

/**
 * Returns distinct discipline categories present in a given day's sessions
 */
export function getDayDisciplines(
  sessions: Session[],
  exercisesMap: Map<string, Exercise>
): ExerciseCategory[] {
  const cats = new Set<ExerciseCategory>();
  for (const session of sessions) {
    const dominant = getSessionDominantCategory(session, exercisesMap);
    cats.add(dominant);
  }
  return Array.from(cats);
}

/**
 * Filters sessions by discipline category
 */
export function filterSessionsByDiscipline(
  sessions: Session[],
  discipline: ExerciseCategory | 'all',
  exercisesMap: Map<string, Exercise>
): Session[] {
  if (discipline === 'all') return sessions;
  return sessions.filter((s) => getSessionDominantCategory(s, exercisesMap) === discipline);
}

/**
 * Calculates volume trend points for the past N weeks
 */
export function calculateVolumeTrend(
  sessions: Session[],
  weeksCount = 6,
  now = new Date()
): WeeklyTrendPoint[] {
  const points: WeeklyTrendPoint[] = [];

  // Start of current week (Monday)
  const current = new Date(now);
  const currentDayOfWeek = (current.getDay() + 6) % 7;
  const startOfCurrentWeek = new Date(current);
  startOfCurrentWeek.setDate(current.getDate() - currentDayOfWeek);
  startOfCurrentWeek.setHours(0, 0, 0, 0);

  for (let w = weeksCount - 1; w >= 0; w--) {
    const weekStart = new Date(startOfCurrentWeek);
    weekStart.setDate(startOfCurrentWeek.getDate() - w * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStr = weekStart.toLocaleString('default', { month: 'short' });
    const weekLabel = `${monthStr} ${weekStart.getDate()}`;

    // Filter sessions falling in this window
    const weekSessions = sessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d >= weekStart && d <= weekEnd;
    });

    let totalVolumeKg = 0;
    let totalReps = 0;
    let totalDurationMs = 0;

    for (const session of weekSessions) {
      if (session.startedAt && session.endedAt) {
        const start = new Date(session.startedAt).getTime();
        const end = new Date(session.endedAt).getTime();
        const duration = Math.max(0, end - start - (session.pausedMs || 0));
        totalDurationMs += duration;
      }

      for (const set of session.sets) {
        if (!set.done) continue;
        const reps = set.reps || 0;
        const load = Math.max(0, set.loadKg || 0);
        totalVolumeKg += load * reps;
        totalReps += reps;
      }
    }

    points.push({
      weekLabel,
      startDate: formatDateKey(weekStart),
      endDate: formatDateKey(weekEnd),
      totalVolumeKg: Math.round(totalVolumeKg),
      totalReps,
      sessionCount: weekSessions.length,
      totalDurationMin: Math.round(totalDurationMs / 60000),
    });
  }

  return points;
}

/**
 * Calculates all-time personal records per exercise across all historical sessions
 */
export function calculateExercisePRs(
  sessions: Session[],
  exercises: Exercise[]
): ExercisePRDetail[] {
  const exercisesMap = new Map(exercises.map((e) => [e.id, e]));
  const prMap = new Map<string, ExercisePRDetail>();

  // Ensure every exercise is initialized
  for (const ex of exercises) {
    prMap.set(ex.id, {
      exerciseId: ex.id,
      exerciseName: ex.name,
      category: ex.category,
      heaviestWeightKg: 0,
      bestEstimated1RM: 0,
      maxReps: 0,
      lifetimeVolumeKg: 0,
      totalSetsCompleted: 0,
    });
  }

  for (const session of sessions) {
    const sessionDate = session.startedAt ? session.startedAt.split('T')[0] : undefined;

    for (const set of session.sets) {
      if (!set.done) continue;
      const ex = exercisesMap.get(set.exerciseId);
      if (!ex) continue;

      let detail = prMap.get(set.exerciseId);
      if (!detail) {
        detail = {
          exerciseId: ex.id,
          exerciseName: ex.name,
          category: ex.category,
          heaviestWeightKg: 0,
          bestEstimated1RM: 0,
          maxReps: 0,
          lifetimeVolumeKg: 0,
          totalSetsCompleted: 0,
        };
        prMap.set(set.exerciseId, detail);
      }

      detail.totalSetsCompleted += 1;
      const load = set.loadKg || 0;
      const reps = set.reps || 0;

      // Lifetime volume
      if (load > 0 && reps > 0) {
        detail.lifetimeVolumeKg += load * reps;
      }

      // Max Reps
      if (reps > detail.maxReps) {
        detail.maxReps = reps;
        detail.maxRepsWeightKg = load;
        detail.maxRepsDate = sessionDate;
      }

      // Heaviest weight
      if (load > detail.heaviestWeightKg) {
        detail.heaviestWeightKg = load;
        detail.heaviestWeightReps = reps;
        detail.heaviestWeightDate = sessionDate;
      }

      // Epley formula 1RM: w * (1 + r/30) for r > 1, or w for r = 1
      if (load > 0 && reps > 0) {
        const est1RM = reps === 1 ? load : Math.round(load * (1 + reps / 30) * 10) / 10;
        if (est1RM > detail.bestEstimated1RM) {
          detail.bestEstimated1RM = est1RM;
          detail.best1RMDate = sessionDate;
        }
      }
    }
  }

  return Array.from(prMap.values());
}

/**
 * Calculates Athlete level, XP progress, and rank title
 */
export function calculateAthleteTier(totalXP: number): AthleteRankInfo {
  const RANKS = [
    { title: 'Novice Initiate', badge: '🌱', threshold: 0 },
    { title: 'Apprentice Lifter', badge: '⚡', threshold: 800 },
    { title: 'Warrior Adept', badge: '⚔️', threshold: 2000 },
    { title: 'Combat Veteran', badge: '🛡️', threshold: 4000 },
    { title: 'Master Gladiator', badge: '🔥', threshold: 7500 },
    { title: 'Titan Champion', badge: '👑', threshold: 12000 },
    { title: 'Apex Olympian', badge: '🏆', threshold: 18000 },
  ];

  let currentTierIndex = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalXP >= RANKS[i].threshold) {
      currentTierIndex = i;
    } else {
      break;
    }
  }

  const currentRank = RANKS[currentTierIndex];
  const nextRank = RANKS[currentTierIndex + 1];

  const level = currentTierIndex + 1;
  const rankTitle = currentRank.title;
  const badge = currentRank.badge;

  if (!nextRank) {
    return {
      level,
      rankTitle,
      badge,
      totalXP,
      currentLevelXP: totalXP - currentRank.threshold,
      nextLevelXP: currentRank.threshold + 5000,
      progressPct: 100,
    };
  }

  const range = nextRank.threshold - currentRank.threshold;
  const inLevel = totalXP - currentRank.threshold;
  const progressPct = Math.min(100, Math.max(0, Math.round((inLevel / range) * 100)));

  return {
    level,
    rankTitle,
    badge,
    totalXP,
    currentLevelXP: inLevel,
    nextLevelXP: nextRank.threshold,
    progressPct,
  };
}
