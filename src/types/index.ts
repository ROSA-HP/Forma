export type ExerciseCategory = 'gym' | 'calisthenics' | 'martial_arts' | 'cardio' | 'custom';

export type TrackingType = 
  | 'weight_reps'
  | 'bodyweight'
  | 'reps'
  | 'duration'
  | 'distance_time'
  | 'rounds';

export type EquipmentType = 
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'bodyweight'
  | 'band'
  | 'bag'
  | 'cardio_machine'
  | 'other';

export type MuscleGroup = 
  | 'chest'
  | 'traps'
  | 'lats'
  | 'lower_back'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'adductors'
  | 'hip_flexors';

export type Region = 'chest' | 'delts' | 'arms' | 'back' | 'legs' | 'core';

export type MuscleBand = 'deficit' | 'maintenance' | 'optimal' | 'peak';

export type CollectionGoal = 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'skill' | 'conditioning';

export type CollectionRole = 'warmup' | 'compound' | 'isolation' | 'finisher' | 'skill' | 'cooldown';

export interface RoundConfig {
  roundSec: number;
  restSec: number;
  rounds: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: EquipmentType;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  conditioning?: boolean;
  trackingType: TrackingType;
  defaultRestSec: number;
  defaultRepMin?: number;
  defaultRepMax?: number;
  incrementKg: number;
  roundConfig?: RoundConfig;
  notes?: string;
  videoUrl?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  source: 'builtin' | 'custom';
}

export interface CollectionItem {
  exerciseId: string;
  role: CollectionRole;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSec: number;
  note?: string;
}

export interface Collection {
  id: string;
  name: string;
  goal: CollectionGoal;
  items: CollectionItem[];
  color?: string;
  scheduleChip?: string;
  lastPerformed?: string;
}

export type SetTag = 'normal' | 'warmup' | 'drop' | 'failure';

export interface SetEntry {
  id: string;
  exerciseId: string;
  loadKg?: number; // signed for bodyweight (+added or -assisted)
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  rounds?: number;
  rpe?: number; // 0.5 steps between 1.0 and 10.0
  tag: SetTag;
  done: boolean;
  completedAt?: string;
}

export interface Session {
  id: string;
  number: number;
  startedAt: string;
  endedAt: string;
  pausedMs: number;
  collectionId?: string;
  collectionName?: string;
  locationId?: string;
  locationName?: string;
  effort?: number; // RPE 1-10
  notes?: string;
  xpGained: number;
  sets: SetEntry[];
}

export type ScheduleMode = 'weekly' | 'cycle';

export interface Schedule {
  id: string;
  mode: ScheduleMode;
  days: number[]; // 0 = Mon, 6 = Sun
  cycleDays?: number[];
  time: string; // "HH:MM"
  reminderOn: boolean;
  collectionId: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export type WeightUnit = 'kg' | 'lb';
export type AppTheme = 'system' | 'dark' | 'light';
export type AppLanguage = 'en' | 'ar';
export type PRCelebrationTiming = 'instantly' | 'after_exercise' | 'at_finish';

export interface Settings {
  profileName: string;
  weightUnit: WeightUnit;
  theme: AppTheme;
  language: AppLanguage;
  notificationsEnabled: boolean;
  reminderTime: string;
  weeklyGoalDays: number;
  weeklySetsTargetPerMuscle: number;
  prCelebrationTiming: PRCelebrationTiming;
  showCalories: boolean;
  userBodyweightKg: number;
  plateSetKg: number[];
  reduceAnimations: boolean;
  backupReminderDismissedAt?: string;
  hasCompletedOnboarding: boolean;
}

export interface ActiveSessionDraft {
  id: string;
  collectionId?: string;
  collectionName?: string;
  startedAt: string;
  pausedMs: number;
  isPaused: boolean;
  lastPausedAt?: string;
  currentExerciseIndex: number;
  locationId?: string;
  notes?: string;
  sets: SetEntry[];
  exercises: Exercise[];
}

export type PRType = 'weight' | 'reps' | 'est_1rm' | 'volume' | 'rounds' | 'timed' | 'distance';

export interface PRRecord {
  exerciseId: string;
  prType: PRType;
  newValue: number;
  previousValue: number;
  delta: number;
  previousDate?: string;
  reps?: number;
  weightKg?: number;
  calculated1RMNew?: number;
  calculated1RMPrev?: number;
}
