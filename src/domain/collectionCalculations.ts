import { Collection, CollectionItem, Exercise, Region, ExerciseCategory } from '../types/index.ts';
import { REGION_ORDER, REGION_MUSCLES } from './constants.ts';

export interface CollectionComputedStats {
  totalSets: number;
  avgRestSec: number;
  estimatedMinutes: number;
  distinctCategories: ExerciseCategory[];
  isMixed: boolean;
  regionSetCounts: Record<Region, number>;
  totalExerciseCount: number;
}

export function computeCollectionStats(
  collection: Collection,
  exercisesMap: Map<string, Exercise>
): CollectionComputedStats {
  const items = collection.items || [];
  let totalSets = 0;
  let totalRestWeighted = 0;
  let totalSec = 0;
  const categoriesSet = new Set<ExerciseCategory>();

  const regionSetCounts: Record<Region, number> = {
    chest: 0,
    delts: 0,
    arms: 0,
    back: 0,
    legs: 0,
    core: 0
  };

  for (const item of items) {
    const ex = exercisesMap.get(item.exerciseId);
    totalSets += item.sets;
    totalRestWeighted += (item.sets * item.restSec);
    totalSec += (item.sets * (45 + item.restSec));

    if (ex) {
      categoriesSet.add(ex.category);

      // Distribute sets into regions based on primary and secondary muscles
      for (const region of REGION_ORDER) {
        const rMuscles = REGION_MUSCLES[region];
        const hasPrimary = ex.primaryMuscles.some(m => rMuscles.includes(m));
        const hasSecondary = ex.secondaryMuscles.some(m => rMuscles.includes(m));

        if (hasPrimary) {
          regionSetCounts[region] += item.sets;
        } else if (hasSecondary) {
          regionSetCounts[region] += Math.round(item.sets * 0.5 * 10) / 10;
        }
      }
    }
  }

  const avgRestSec = totalSets > 0 ? Math.round(totalRestWeighted / totalSets) : 75;
  const estimatedMinutes = Math.max(5, Math.round((totalSec / 60) / 5) * 5);
  const distinctCategories = Array.from(categoriesSet);

  return {
    totalSets,
    avgRestSec,
    estimatedMinutes,
    distinctCategories,
    isMixed: distinctCategories.length > 1,
    regionSetCounts,
    totalExerciseCount: items.length
  };
}

/**
 * Filter exercises by search, category, equipment, muscle, tracking type, and logged status
 */
export interface ExerciseFilters {
  searchQuery: string;
  category: ExerciseCategory | 'all';
  equipment: string[];
  muscleGroup: string[];
  trackingType: string[];
  loggedOnly: boolean;
  neverLoggedOnly: boolean;
  sortBy: 'name' | 'recently_logged' | 'most_logged' | 'category';
}

export function filterAndSortExercises(
  exercises: Exercise[],
  filters: ExerciseFilters,
  sessions: { sets: { exerciseId: string; done?: boolean }[]; startedAt: string }[] = []
): Exercise[] {
  // Compute logged frequencies and last logged timestamps
  const loggedStats = new Map<string, { count: number; lastLoggedTime: number }>();
  for (const s of sessions) {
    const time = new Date(s.startedAt).getTime();
    for (const set of s.sets) {
      if (set.done) {
        const cur = loggedStats.get(set.exerciseId) || { count: 0, lastLoggedTime: 0 };
        cur.count++;
        if (time > cur.lastLoggedTime) cur.lastLoggedTime = time;
        loggedStats.set(set.exerciseId, cur);
      }
    }
  }

  return exercises.filter(ex => {
    // 1. Category
    if (filters.category !== 'all' && ex.category !== filters.category) return false;

    // 2. Equipment
    if (filters.equipment.length > 0 && !filters.equipment.includes(ex.equipment)) return false;

    // 3. Muscle Group
    if (filters.muscleGroup.length > 0) {
      const match = ex.primaryMuscles.some(m => filters.muscleGroup.includes(m)) ||
                    ex.secondaryMuscles.some(m => filters.muscleGroup.includes(m));
      if (!match) return false;
    }

    // 4. Tracking Type
    if (filters.trackingType.length > 0 && !filters.trackingType.includes(ex.trackingType)) return false;

    // 5. Logged vs Never logged
    const stats = loggedStats.get(ex.id);
    const hasBeenLogged = stats && stats.count > 0;
    if (filters.loggedOnly && !hasBeenLogged) return false;
    if (filters.neverLoggedOnly && hasBeenLogged) return false;

    // 6. Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchEquip = ex.equipment.toLowerCase().includes(q);
      const matchMuscle = ex.primaryMuscles.some(m => m.toLowerCase().includes(q));
      if (!matchName && !matchEquip && !matchMuscle) return false;
    }

    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (filters.sortBy === 'category') {
      return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
    }
    if (filters.sortBy === 'recently_logged') {
      const timeA = loggedStats.get(a.id)?.lastLoggedTime || 0;
      const timeB = loggedStats.get(b.id)?.lastLoggedTime || 0;
      return timeB - timeA || a.name.localeCompare(b.name);
    }
    if (filters.sortBy === 'most_logged') {
      const countA = loggedStats.get(a.id)?.count || 0;
      const countB = loggedStats.get(b.id)?.count || 0;
      return countB - countA || a.name.localeCompare(b.name);
    }
    return 0;
  });
}
