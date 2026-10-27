import { StorageExportData } from '../services/storage.ts';
import { Session, Exercise, Collection } from '../types/index.ts';

export interface PlateBreakdownResult {
  barWeightKg: number;
  weightPerSideKg: number;
  platesPerSide: number[]; // e.g. [20, 10, 2.5]
  totalLoadedKg: number;
  unachievedKg: number;
}

/**
 * Calculates optimal plate loading per side of a barbell.
 */
export function calculatePlateBreakdown(
  targetWeightKg: number,
  barWeightKg = 20,
  availablePlates: number[] = [25, 20, 15, 10, 5, 2.5, 1.25]
): PlateBreakdownResult {
  if (targetWeightKg <= barWeightKg) {
    return {
      barWeightKg,
      weightPerSideKg: 0,
      platesPerSide: [],
      totalLoadedKg: barWeightKg,
      unachievedKg: 0,
    };
  }

  const weightNeeded = targetWeightKg - barWeightKg;
  let sideNeeded = weightNeeded / 2;
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);

  const platesPerSide: number[] = [];

  for (const plate of sortedPlates) {
    while (sideNeeded >= plate - 0.001) {
      platesPerSide.push(plate);
      sideNeeded -= plate;
    }
  }

  const loadedPerSide = platesPerSide.reduce((acc, p) => acc + p, 0);
  const totalLoaded = barWeightKg + loadedPerSide * 2;
  const unachieved = Math.max(0, targetWeightKg - totalLoaded);

  return {
    barWeightKg,
    weightPerSideKg: loadedPerSide,
    platesPerSide,
    totalLoadedKg: totalLoaded,
    unachievedKg: Math.round(unachieved * 100) / 100,
  };
}

/**
 * Escapes quotes and leading formula injection characters (=, +, -, @) for CSV cells.
 */
export function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Neutralize formula injection if the string starts with =, +, -, @, \t, or \r
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Validates an uploaded JSON backup payload before importing into IndexedDB.
 * Validates version and required fields and types of EVERY record BEFORE touching any data.
 */
export function validateImportPayload(payload: unknown): {
  valid: boolean;
  error?: string;
  summary?: {
    sessionsCount: number;
    exercisesCount: number;
    collectionsCount: number;
  };
} {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Backup file is empty or corrupted' };
  }

  const p = payload as Record<string, any>;

  // 1. Version validation
  if (typeof p.version !== 'number' || p.version < 1) {
    return { valid: false, error: 'Invalid or missing backup format version number' };
  }

  // 2. Settings validation (if provided)
  if (p.settings !== undefined) {
    if (typeof p.settings !== 'object' || p.settings === null) {
      return { valid: false, error: 'Settings field must be an object' };
    }
  }

  // 3. Exercises validation
  if (p.exercises !== undefined) {
    if (!Array.isArray(p.exercises)) {
      return { valid: false, error: 'Exercises must be an array' };
    }
    for (let i = 0; i < p.exercises.length; i++) {
      const e = p.exercises[i];
      if (!e || typeof e !== 'object') {
        return { valid: false, error: `Invalid exercise at index ${i}: not an object` };
      }
      if (typeof e.id !== 'string' || !e.id.trim()) {
        return { valid: false, error: `Exercise at index ${i} is missing a valid id` };
      }
      if (typeof e.name !== 'string' || !e.name.trim()) {
        return { valid: false, error: `Exercise "${e.id}" is missing a valid name` };
      }
      if (typeof e.category !== 'string') {
        return { valid: false, error: `Exercise "${e.name}" is missing a category` };
      }
      if (typeof e.trackingType !== 'string') {
        return { valid: false, error: `Exercise "${e.name}" is missing a trackingType` };
      }
      if (!Array.isArray(e.primaryMuscles)) {
        return { valid: false, error: `Exercise "${e.name}" primaryMuscles must be an array` };
      }
    }
  }

  // 4. Collections validation
  if (p.collections !== undefined) {
    if (!Array.isArray(p.collections)) {
      return { valid: false, error: 'Collections must be an array' };
    }
    for (let i = 0; i < p.collections.length; i++) {
      const c = p.collections[i];
      if (!c || typeof c !== 'object') {
        return { valid: false, error: `Invalid collection at index ${i}: not an object` };
      }
      if (typeof c.id !== 'string' || !c.id.trim()) {
        return { valid: false, error: `Collection at index ${i} is missing a valid id` };
      }
      if (typeof c.name !== 'string' || !c.name.trim()) {
        return { valid: false, error: `Collection "${c.id}" is missing a valid name` };
      }
      if (!Array.isArray(c.items)) {
        return { valid: false, error: `Collection "${c.name}" items must be an array` };
      }
      for (let j = 0; j < c.items.length; j++) {
        const item = c.items[j];
        if (!item || typeof item !== 'object' || typeof item.exerciseId !== 'string') {
          return { valid: false, error: `Collection "${c.name}" has invalid item at index ${j}` };
        }
      }
    }
  }

  // 5. Sessions validation
  if (p.sessions !== undefined) {
    if (!Array.isArray(p.sessions)) {
      return { valid: false, error: 'Sessions must be an array' };
    }
    for (let i = 0; i < p.sessions.length; i++) {
      const s = p.sessions[i];
      if (!s || typeof s !== 'object') {
        return { valid: false, error: `Invalid session at index ${i}: not an object` };
      }
      if (typeof s.id !== 'string' || !s.id.trim()) {
        return { valid: false, error: `Session at index ${i} is missing a valid id` };
      }
      if (typeof s.number !== 'number') {
        return { valid: false, error: `Session "${s.id}" is missing a valid session number` };
      }
      if (typeof s.startedAt !== 'string' || isNaN(Date.parse(s.startedAt))) {
        return { valid: false, error: `Session "${s.id}" has an invalid startedAt timestamp` };
      }
      if (!Array.isArray(s.sets)) {
        return { valid: false, error: `Session "${s.id}" sets must be an array` };
      }
      for (let j = 0; j < s.sets.length; j++) {
        const set = s.sets[j];
        if (!set || typeof set !== 'object') {
          return { valid: false, error: `Session "${s.id}" has invalid set at index ${j}` };
        }
        if (typeof set.id !== 'string' || typeof set.exerciseId !== 'string') {
          return { valid: false, error: `Session "${s.id}" set ${j} missing id or exerciseId` };
        }
        if (typeof set.done !== 'boolean') {
          return { valid: false, error: `Session "${s.id}" set ${j} done property must be a boolean` };
        }
      }
    }
  }

  // 6. Schedules validation
  if (p.schedules !== undefined) {
    if (!Array.isArray(p.schedules)) {
      return { valid: false, error: 'Schedules must be an array' };
    }
    for (let i = 0; i < p.schedules.length; i++) {
      const sc = p.schedules[i];
      // `days` is the current schema field; `daysOfWeek` is tolerated for legacy backups.
      const days = (sc as any)?.days ?? (sc as any)?.daysOfWeek;
      if (!sc || typeof sc !== 'object' || typeof sc.id !== 'string' || !Array.isArray(days) || typeof sc.time !== 'string') {
        return { valid: false, error: `Schedule at index ${i} is invalid` };
      }
    }
  }

  // 7. Locations validation
  if (p.locations !== undefined) {
    if (!Array.isArray(p.locations)) {
      return { valid: false, error: 'Locations must be an array' };
    }
    for (let i = 0; i < p.locations.length; i++) {
      const loc = p.locations[i];
      if (!loc || typeof loc !== 'object' || typeof loc.id !== 'string' || typeof loc.name !== 'string') {
        return { valid: false, error: `Location at index ${i} is invalid` };
      }
    }
  }

  // 8. Measurements validation
  if (p.measurements !== undefined) {
    if (!Array.isArray(p.measurements)) {
      return { valid: false, error: 'Measurements must be an array' };
    }
    for (let i = 0; i < p.measurements.length; i++) {
      const m = p.measurements[i];
      if (!m || typeof m !== 'object' || typeof m.id !== 'string' || typeof m.date !== 'string') {
        return { valid: false, error: `Measurement at index ${i} is invalid` };
      }
    }
  }

  // 9. Achievements validation
  if (p.achievements !== undefined) {
    if (!Array.isArray(p.achievements)) {
      return { valid: false, error: 'Achievements must be an array' };
    }
    for (let i = 0; i < p.achievements.length; i++) {
      const a = p.achievements[i];
      if (!a || typeof a !== 'object' || typeof a.id !== 'string' || typeof a.title !== 'string') {
        return { valid: false, error: `Achievement at index ${i} is invalid` };
      }
    }
  }

  return {
    valid: true,
    summary: {
      sessionsCount: Array.isArray(p.sessions) ? p.sessions.length : 0,
      exercisesCount: Array.isArray(p.exercises) ? p.exercises.length : 0,
      collectionsCount: Array.isArray(p.collections) ? p.collections.length : 0,
    },
  };
}

/**
 * Formats high-level database metrics for display
 */
export function calculateStorageStats(
  sessions: Session[],
  exercises: Exercise[],
  collections: Collection[]
): {
  totalSets: number;
  totalVolumeKg: number;
  exercisesCount: number;
  routinesCount: number;
  sessionsCount: number;
} {
  let totalSets = 0;
  let totalVolumeKg = 0;

  for (const s of sessions) {
    for (const st of s.sets) {
      if (st.done) {
        totalSets++;
        if (st.loadKg && st.reps) {
          totalVolumeKg += st.loadKg * st.reps;
        }
      }
    }
  }

  return {
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg),
    exercisesCount: exercises.length,
    routinesCount: collections.length,
    sessionsCount: sessions.length,
  };
}
