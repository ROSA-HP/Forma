import { 
  MuscleGroup, 
  Region, 
  ExerciseCategory, 
  MuscleBand, 
  CollectionGoal, 
  Settings 
} from '../types/index.ts';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'traps',
  'lats',
  'lower_back',
  'front_delts',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'adductors',
  'hip_flexors'
];

export const REGION_ORDER: readonly Region[] = ['chest', 'delts', 'arms', 'back', 'legs', 'core'] as const;

export const REGION_MUSCLES: Record<Region, MuscleGroup[]> = {
  chest: ['chest'],
  delts: ['front_delts', 'side_delts', 'rear_delts'],
  arms: ['biceps', 'triceps'],
  back: ['lats', 'traps', 'lower_back'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  core: ['abs', 'obliques']
};

export const HEATMAP_EXTRA_MUSCLES: MuscleGroup[] = ['forearms', 'adductors', 'hip_flexors'];

// Category colours are theme variables too (see index.css): the dark-mode hues
// are too pale to read as text or icons on a light surface.
export const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  gym: 'var(--cat-gym)',
  calisthenics: 'var(--cat-calisthenics)',
  martial_arts: 'var(--cat-martial-arts)',
  cardio: 'var(--cat-cardio)',
  custom: 'var(--cat-custom)'
};

/*
 * Status colours are CSS variables (defined per theme in index.css) rather than
 * fixed hex values, so they stay legible on both the dark and light surfaces.
 */
export const BAND_COLORS: Record<MuscleBand, string> = {
  deficit: 'var(--band-deficit)',
  maintenance: 'var(--band-maintenance)',
  optimal: 'var(--band-optimal)',
  peak: 'var(--band-peak)'
};

/** Recovery colour: fresh (>=90) / ready (>=70) / recovering (>=50) / fatigued. */
export function readinessColor(pct: number): string {
  if (pct >= 90) return 'var(--ready-fresh)';
  if (pct >= 70) return 'var(--ready-ok)';
  if (pct >= 50) return 'var(--ready-recovering)';
  return 'var(--ready-fatigued)';
}

/** Translucent tint of any CSS colour (works with var() values, unlike a hex-alpha suffix). */
export function tint(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

export const FUNCTIONAL_COLORS = {
  success: '#34D399',
  danger: '#F87171'
};

export const MET_VALUES: Record<ExerciseCategory, number> = {
  gym: 5.0,
  calisthenics: 6.0,
  martial_arts: 8.0,
  cardio: 8.0,
  custom: 5.0
};

export const GOAL_PRESETS: Record<CollectionGoal, { repsMin: number; repsMax: number; restSec: number }> = {
  strength: { repsMin: 3, repsMax: 6, restSec: 165 },
  hypertrophy: { repsMin: 6, repsMax: 12, restSec: 75 },
  endurance: { repsMin: 15, repsMax: 20, restSec: 40 },
  power: { repsMin: 2, repsMax: 5, restSec: 180 },
  skill: { repsMin: 3, repsMax: 8, restSec: 90 },
  conditioning: { repsMin: 12, repsMax: 25, restSec: 30 }
};

export const LEVEL_RANKS = [
  { minLevel: 30, title: 'Legend' },
  { minLevel: 20, title: 'Elite Lifter' },
  { minLevel: 10, title: 'Athlete' },
  { minLevel: 5, title: 'Regular' },
  { minLevel: 1, title: 'Starter' }
];

export const DEFAULT_PLATE_SET_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export const DEFAULT_SETTINGS: Settings = {
  profileName: 'Alex',
  weightUnit: 'kg',
  theme: 'dark',
  language: 'en',
  notificationsEnabled: true,
  reminderTime: '17:30',
  weeklyGoalDays: 4,
  weeklySetsTargetPerMuscle: 14,
  prCelebrationTiming: 'after_exercise',
  showCalories: true,
  userBodyweightKg: 75,
  plateSetKg: DEFAULT_PLATE_SET_KG,
  reduceAnimations: false,
  hasCompletedOnboarding: true
};
