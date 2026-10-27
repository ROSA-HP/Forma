import { Exercise, Collection, Session, Location, Schedule } from '../types/index.ts';

export const SEED_LOCATIONS: Location[] = [
  { id: 'loc-metroflex', name: 'MetroFlex Gym' },
  { id: 'loc-home', name: 'Home Garage Gym' },
  { id: 'loc-dojo', name: 'Kombat Combat Club' }
];

export const SEED_EXERCISES: Exercise[] = [
  // --- GYM: CHEST ---
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'front_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 8,
    defaultRepMax: 10,
    incrementKg: 2.5,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    category: 'gym',
    equipment: 'dumbbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts', 'triceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'decline-barbell-press',
    name: 'Decline Barbell Press',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 8,
    defaultRepMax: 10,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'cable-chest-flye',
    name: 'Standing Cable Chest Flye',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 1.25,
    source: 'builtin'
  },
  {
    id: 'machine-chest-press',
    name: 'Converging Machine Chest Press',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'front_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 5.0,
    source: 'builtin'
  },
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell Pullover',
    category: 'gym',
    equipment: 'dumbbell',
    primaryMuscles: ['chest', 'lats'],
    secondaryMuscles: ['triceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.0,
    source: 'builtin'
  },

  // --- GYM: SHOULDERS (DELTS) ---
  {
    id: 'overhead-barbell-press',
    name: 'Overhead Barbell Press',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['front_delts'],
    secondaryMuscles: ['side_delts', 'triceps', 'traps'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 6,
    defaultRepMax: 8,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'standing-cable-lateral-raise',
    name: 'Standing Cable Lateral Raise',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['side_delts'],
    secondaryMuscles: ['traps'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 1.25,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'dumbbell-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    category: 'gym',
    equipment: 'dumbbell',
    primaryMuscles: ['side_delts'],
    secondaryMuscles: ['traps'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 1.0,
    source: 'builtin'
  },
  {
    id: 'face-pull',
    name: 'Rope Cable Face Pull',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['rear_delts', 'traps'],
    secondaryMuscles: ['side_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 15,
    defaultRepMax: 20,
    incrementKg: 2.5,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'reverse-pec-deck',
    name: 'Reverse Pec Deck Machine',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['rear_delts'],
    secondaryMuscles: ['traps'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'arnold-press',
    name: 'Dumbbell Arnold Press',
    category: 'gym',
    equipment: 'dumbbell',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['triceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 2.0,
    source: 'builtin'
  },

  // --- GYM: BACK (LATS, TRAPS, LOWER BACK) ---
  {
    id: 'barbell-deadlift',
    name: 'Conventional Barbell Deadlift',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['lower_back', 'glutes', 'hamstrings'],
    secondaryMuscles: ['lats', 'traps', 'forearms'],
    trackingType: 'weight_reps',
    defaultRestSec: 150,
    defaultRepMin: 5,
    defaultRepMax: 5,
    incrementKg: 5.0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'romanian-deadlift',
    name: 'Barbell Romanian Deadlift (RDL)',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['lower_back', 'lats', 'forearms'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 8,
    defaultRepMax: 10,
    incrementKg: 5.0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'barbell-bent-over-row',
    name: 'Barbell Bent-Over Row',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['rear_delts', 'biceps', 'lower_back'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 8,
    defaultRepMax: 10,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'lat-pulldown',
    name: 'Wide-Grip Lat Pulldown',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'seated-cable-row',
    name: 'Seated Close-Grip Cable Row',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'barbell-shrug',
    name: 'Barbell Shrug',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['traps'],
    secondaryMuscles: ['forearms'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 5.0,
    source: 'builtin'
  },
  {
    id: 't-bar-row',
    name: 'Chest-Supported T-Bar Row',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['rear_delts', 'biceps'],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },

  // --- GYM: ARMS (BICEPS, TRICEPS, FOREARMS) ---
  {
    id: 'triceps-rope-pushdown',
    name: 'Triceps Rope Pushdown',
    category: 'gym',
    equipment: 'cable',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 1.25,
    source: 'builtin'
  },
  {
    id: 'skull-crushers',
    name: 'EZ-Bar Skull Crushers',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 75,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.0,
    source: 'builtin'
  },
  {
    id: 'barbell-bicep-curl',
    name: 'Standing Barbell Bicep Curl',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'incline-db-hammer-curl',
    name: 'Incline Dumbbell Hammer Curl',
    category: 'gym',
    equipment: 'dumbbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.0,
    source: 'builtin'
  },
  {
    id: 'preacher-curl',
    name: 'Machine Preacher Curl',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'wrist-curl-forearms',
    name: 'Barbell Wrist Curl',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 45,
    defaultRepMin: 15,
    defaultRepMax: 20,
    incrementKg: 1.25,
    source: 'builtin'
  },

  // --- GYM: LEGS (QUADS, HAMSTRINGS, GLUTES, CALVES) ---
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'lower_back', 'abs'],
    trackingType: 'weight_reps',
    defaultRestSec: 120,
    defaultRepMin: 6,
    defaultRepMax: 8,
    incrementKg: 5.0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'leg-press',
    name: '45-Degree Leg Press',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 10.0,
    source: 'builtin'
  },
  {
    id: 'leg-extension',
    name: 'Seated Leg Extension',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated Hamstring Leg Curl',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['calves'],
    trackingType: 'weight_reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 12,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing Machine Calf Raise',
    category: 'gym',
    equipment: 'machine',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    trackingType: 'weight_reps',
    defaultRestSec: 45,
    defaultRepMin: 15,
    defaultRepMax: 20,
    incrementKg: 5.0,
    source: 'builtin'
  },
  {
    id: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    category: 'gym',
    equipment: 'barbell',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'quads'],
    trackingType: 'weight_reps',
    defaultRestSec: 90,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 5.0,
    source: 'builtin'
  },

  // --- CALISTHENICS ---
  {
    id: 'weighted-pull-up',
    name: 'Weighted Pull-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['rear_delts', 'forearms', 'abs'],
    trackingType: 'bodyweight',
    defaultRestSec: 90,
    defaultRepMin: 6,
    defaultRepMax: 8,
    incrementKg: 2.5,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'pull-up',
    name: 'Strict Bodyweight Pull-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['rear_delts', 'forearms'],
    trackingType: 'reps',
    defaultRestSec: 75,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'weighted-dip',
    name: 'Weighted Parallel Bar Dip',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front_delts'],
    trackingType: 'bodyweight',
    defaultRestSec: 90,
    defaultRepMin: 6,
    defaultRepMax: 8,
    incrementKg: 2.5,
    source: 'builtin'
  },
  {
    id: 'dips-bodyweight',
    name: 'Bodyweight Bar Dips',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front_delts'],
    trackingType: 'reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 15,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'push-up',
    name: 'Standard Push-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['front_delts', 'abs'],
    trackingType: 'reps',
    defaultRestSec: 60,
    defaultRepMin: 15,
    defaultRepMax: 25,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'diamond-push-up',
    name: 'Diamond Push-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['front_delts'],
    trackingType: 'reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'muscle-up',
    name: 'Bar Muscle-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['lats', 'chest', 'triceps'],
    secondaryMuscles: ['biceps', 'forearms', 'front_delts'],
    trackingType: 'reps',
    defaultRestSec: 120,
    defaultRepMin: 3,
    defaultRepMax: 6,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'handstand-push-up',
    name: 'Wall-Supported Handstand Push-Up',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['front_delts', 'triceps'],
    secondaryMuscles: ['traps', 'chest'],
    trackingType: 'reps',
    defaultRestSec: 90,
    defaultRepMin: 5,
    defaultRepMax: 8,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'pistol-squat',
    name: 'Pistol Squat (Single Leg)',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['calves', 'abs'],
    trackingType: 'reps',
    defaultRestSec: 75,
    defaultRepMin: 8,
    defaultRepMax: 12,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'l-sit-hold',
    name: 'Parallette L-Sit Hold',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['abs', 'hip_flexors'],
    secondaryMuscles: ['triceps', 'quads'],
    trackingType: 'duration',
    defaultRestSec: 60,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Straight Leg Raise',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['hip_flexors', 'forearms'],
    trackingType: 'reps',
    defaultRestSec: 60,
    defaultRepMin: 12,
    defaultRepMax: 15,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'front-lever-hold',
    name: 'Bar Front Lever Hold',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['lats', 'abs'],
    secondaryMuscles: ['rear_delts', 'forearms'],
    trackingType: 'duration',
    defaultRestSec: 90,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'planche-lean-hold',
    name: 'Planche Lean Static Hold',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['front_delts', 'chest'],
    secondaryMuscles: ['abs', 'forearms'],
    trackingType: 'duration',
    defaultRestSec: 75,
    incrementKg: 0,
    source: 'builtin'
  },

  // --- MARTIAL ARTS ---
  {
    id: 'heavy-bag-rounds',
    name: 'Heavy Bag Combinations',
    category: 'martial_arts',
    equipment: 'bag',
    primaryMuscles: ['front_delts', 'abs'],
    secondaryMuscles: ['triceps', 'calves', 'glutes'],
    trackingType: 'rounds',
    defaultRestSec: 60,
    roundConfig: { roundSec: 180, restSec: 60, rounds: 5 },
    incrementKg: 0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'roundhouse-kick-bag',
    name: 'Roundhouse Kick Heavy Bag',
    category: 'martial_arts',
    equipment: 'bag',
    primaryMuscles: ['glutes', 'hip_flexors'],
    secondaryMuscles: ['quads', 'obliques', 'calves'],
    trackingType: 'rounds',
    defaultRestSec: 60,
    roundConfig: { roundSec: 180, restSec: 60, rounds: 5 },
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'jab-cross-drill',
    name: 'Jab-Cross Footwork Drill',
    category: 'martial_arts',
    equipment: 'other',
    primaryMuscles: ['front_delts'],
    secondaryMuscles: ['calves', 'abs'],
    trackingType: 'rounds',
    defaultRestSec: 45,
    roundConfig: { roundSec: 120, restSec: 45, rounds: 6 },
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'shadow-boxing',
    name: 'High-Tempo Shadow Boxing',
    category: 'martial_arts',
    equipment: 'bodyweight',
    primaryMuscles: ['front_delts', 'abs'],
    secondaryMuscles: ['calves', 'lats'],
    trackingType: 'rounds',
    defaultRestSec: 60,
    roundConfig: { roundSec: 180, restSec: 60, rounds: 4 },
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'sparring-rounds',
    name: 'Controlled Technical Sparring',
    category: 'martial_arts',
    equipment: 'other',
    primaryMuscles: ['abs', 'front_delts'],
    secondaryMuscles: ['quads', 'lats'],
    trackingType: 'rounds',
    defaultRestSec: 60,
    roundConfig: { roundSec: 180, restSec: 60, rounds: 5 },
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'speed-bag-work',
    name: 'Speed Bag Cadence Drills',
    category: 'martial_arts',
    equipment: 'bag',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['traps', 'forearms'],
    trackingType: 'duration',
    defaultRestSec: 45,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'teep-front-kick',
    name: 'Push Kick (Teep) Reps on Shield',
    category: 'martial_arts',
    equipment: 'bag',
    primaryMuscles: ['quads', 'hip_flexors'],
    secondaryMuscles: ['abs', 'calves'],
    trackingType: 'reps',
    defaultRestSec: 45,
    defaultRepMin: 20,
    defaultRepMax: 30,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'muay-thai-clinch-knees',
    name: 'Clinch & Knee Strikes Drills',
    category: 'martial_arts',
    equipment: 'bag',
    primaryMuscles: ['abs', 'hip_flexors'],
    secondaryMuscles: ['lats', 'glutes'],
    trackingType: 'rounds',
    defaultRestSec: 60,
    roundConfig: { roundSec: 180, restSec: 60, rounds: 4 },
    incrementKg: 0,
    source: 'builtin'
  },

  // --- CARDIO / CONDITIONING ---
  {
    id: 'concept2-rowing',
    name: 'Zone 2 Concept2 Rower',
    category: 'cardio',
    equipment: 'cardio_machine',
    primaryMuscles: ['lats', 'quads'],
    secondaryMuscles: ['biceps', 'abs'],
    trackingType: 'distance_time',
    defaultRestSec: 60,
    incrementKg: 0,
    source: 'builtin',
    isPinned: true
  },
  {
    id: 'jump-rope',
    name: 'Speed Jump Rope Intervals',
    category: 'cardio',
    equipment: 'other',
    primaryMuscles: ['calves'],
    secondaryMuscles: ['front_delts', 'forearms'],
    trackingType: 'duration',
    defaultRestSec: 45,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'assault-bike-sprints',
    name: 'Echo / Assault AirBike Max Effort',
    category: 'cardio',
    equipment: 'cardio_machine',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['chest', 'lats'],
    trackingType: 'duration',
    defaultRestSec: 60,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'burpees',
    name: 'Full Chest-to-Floor Burpees',
    category: 'cardio',
    equipment: 'bodyweight',
    conditioning: true,
    primaryMuscles: [],
    secondaryMuscles: [],
    trackingType: 'reps',
    defaultRestSec: 45,
    defaultRepMin: 15,
    defaultRepMax: 20,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'mountain-climbers',
    name: 'High-Knee Mountain Climbers',
    category: 'cardio',
    equipment: 'bodyweight',
    primaryMuscles: ['abs', 'hip_flexors'],
    secondaryMuscles: ['front_delts'],
    trackingType: 'duration',
    defaultRestSec: 30,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'treadmill-incline-walk',
    name: 'Zone 2 Treadmill 12-3-30',
    category: 'cardio',
    equipment: 'cardio_machine',
    primaryMuscles: ['glutes', 'calves'],
    secondaryMuscles: ['hamstrings'],
    trackingType: 'duration',
    defaultRestSec: 0,
    incrementKg: 0,
    source: 'builtin'
  },

  // --- CORE & STABILITY ---
  {
    id: 'plank-hold',
    name: 'Forearm Core Plank',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['front_delts', 'glutes'],
    trackingType: 'duration',
    defaultRestSec: 45,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    category: 'calisthenics',
    equipment: 'other',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['lats', 'triceps'],
    trackingType: 'reps',
    defaultRestSec: 60,
    defaultRepMin: 10,
    defaultRepMax: 15,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'side-plank-hold',
    name: 'Side Plank Static Hold',
    category: 'calisthenics',
    equipment: 'bodyweight',
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['side_delts', 'glutes'],
    trackingType: 'duration',
    defaultRestSec: 45,
    incrementKg: 0,
    source: 'builtin'
  },
  {
    id: 'russian-twist',
    name: 'Kettlebell Russian Twist',
    category: 'calisthenics',
    equipment: 'kettlebell',
    primaryMuscles: ['obliques', 'abs'],
    secondaryMuscles: ['hip_flexors'],
    trackingType: 'weight_reps',
    defaultRestSec: 45,
    defaultRepMin: 20,
    defaultRepMax: 30,
    incrementKg: 2.0,
    source: 'builtin'
  }
];

export const SEED_COLLECTIONS: Collection[] = [
  {
    id: 'col-push-hypertrophy',
    name: 'Push Day Hypertrophy',
    goal: 'hypertrophy',
    scheduleChip: 'MON & THU',
    lastPerformed: 'Yesterday',
    items: [
      {
        exerciseId: 'barbell-bench-press',
        role: 'compound',
        sets: 4,
        repsMin: 8,
        repsMax: 10,
        restSec: 90,
        note: 'Drive through heels, maintain arch'
      },
      {
        exerciseId: 'incline-db-press',
        role: 'compound',
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSec: 75,
        note: 'Bench angle 30 degrees'
      },
      {
        exerciseId: 'standing-cable-lateral-raise',
        role: 'isolation',
        sets: 4,
        repsMin: 12,
        repsMax: 15,
        restSec: 60,
        note: 'Strict control, no swinging'
      },
      {
        exerciseId: 'overhead-barbell-press',
        role: 'compound',
        sets: 3,
        repsMin: 6,
        repsMax: 8,
        restSec: 90
      },
      {
        exerciseId: 'triceps-rope-pushdown',
        role: 'finisher',
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSec: 60,
        note: 'Flatter flare at lockout'
      }
    ]
  },
  {
    id: 'col-pull-posterior',
    name: 'Pull & Posterior Strength',
    goal: 'strength',
    scheduleChip: 'TUE & FRI',
    lastPerformed: '3 days ago',
    items: [
      {
        exerciseId: 'barbell-deadlift',
        role: 'compound',
        sets: 4,
        repsMin: 5,
        repsMax: 5,
        restSec: 150
      },
      {
        exerciseId: 'weighted-pull-up',
        role: 'compound',
        sets: 4,
        repsMin: 6,
        repsMax: 8,
        restSec: 90
      },
      {
        exerciseId: 'barbell-bent-over-row',
        role: 'compound',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSec: 90
      },
      {
        exerciseId: 'face-pull',
        role: 'isolation',
        sets: 3,
        repsMin: 15,
        repsMax: 20,
        restSec: 60
      },
      {
        exerciseId: 'barbell-bicep-curl',
        role: 'isolation',
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSec: 60
      }
    ]
  },
  {
    id: 'col-legs-core',
    name: 'Lower Body & Core Armor',
    goal: 'hypertrophy',
    scheduleChip: 'WED & SAT',
    lastPerformed: '5 days ago',
    items: [
      {
        exerciseId: 'barbell-back-squat',
        role: 'compound',
        sets: 4,
        repsMin: 6,
        repsMax: 8,
        restSec: 120
      },
      {
        exerciseId: 'romanian-deadlift',
        role: 'compound',
        sets: 3,
        repsMin: 8,
        repsMax: 10,
        restSec: 90
      },
      {
        exerciseId: 'leg-press',
        role: 'compound',
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        restSec: 90
      },
      {
        exerciseId: 'seated-leg-curl',
        role: 'isolation',
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSec: 60
      },
      {
        exerciseId: 'hanging-leg-raise',
        role: 'finisher',
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        restSec: 60
      }
    ]
  },
  {
    id: 'col-fighter-rounds',
    name: 'Heavy Bag Fighter Rounds',
    goal: 'conditioning',
    scheduleChip: 'SUN',
    lastPerformed: '6 days ago',
    items: [
      {
        exerciseId: 'shadow-boxing',
        role: 'warmup',
        sets: 2,
        repsMin: 1,
        repsMax: 1,
        restSec: 45
      },
      {
        exerciseId: 'heavy-bag-rounds',
        role: 'skill',
        sets: 5,
        repsMin: 1,
        repsMax: 1,
        restSec: 60
      },
      {
        exerciseId: 'roundhouse-kick-bag',
        role: 'skill',
        sets: 3,
        repsMin: 1,
        repsMax: 1,
        restSec: 60
      },
      {
        exerciseId: 'jump-rope',
        role: 'finisher',
        sets: 3,
        repsMin: 1,
        repsMax: 1,
        restSec: 45
      }
    ]
  }
];

export const SEED_SCHEDULES: Schedule[] = [
  {
    id: 'sch-push',
    mode: 'weekly',
    days: [0, 3], // Mon & Thu
    time: '17:30',
    reminderOn: true,
    collectionId: 'col-push-hypertrophy'
  },
  {
    id: 'sch-pull',
    mode: 'weekly',
    days: [1, 4], // Tue & Fri
    time: '18:00',
    reminderOn: true,
    collectionId: 'col-pull-posterior'
  }
];

// 18 realistic completed workouts over the past 30 days
export function generateSeedSessions(): Session[] {
  const sessions: Session[] = [];
  const now = new Date();

  // Helper to make an ISO date days ago
  const daysAgo = (days: number, hour: number = 18): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  // 1. Yesterday: Push Day Hypertrophy (Session 18) - 18,450 kg volume, 54 min
  sessions.push({
    id: 'sess-18',
    number: 18,
    startedAt: daysAgo(1, 17),
    endedAt: daysAgo(1, 18),
    pausedMs: 0,
    collectionId: 'col-push-hypertrophy',
    collectionName: 'Push Day Hypertrophy',
    locationId: 'loc-metroflex',
    locationName: 'MetroFlex Gym, Seattle',
    effort: 8.0,
    notes: 'Felt strong on bench, arch was tight. Increased rest to 2 mins for set 3.',
    xpGained: 380,
    sets: [
      { id: 's18-1', exerciseId: 'barbell-bench-press', loadKg: 60, reps: 10, tag: 'warmup', done: true },
      { id: 's18-2', exerciseId: 'barbell-bench-press', loadKg: 85, reps: 8, tag: 'normal', done: true, rpe: 8.0 },
      { id: 's18-3', exerciseId: 'barbell-bench-press', loadKg: 95, reps: 8, tag: 'normal', done: true, rpe: 8.5 },
      { id: 's18-4', exerciseId: 'barbell-bench-press', loadKg: 102.5, reps: 6, tag: 'normal', done: true, rpe: 9.0 }, // NEW PR!
      { id: 's18-5', exerciseId: 'incline-db-press', loadKg: 30, reps: 10, tag: 'normal', done: true, rpe: 8.0 },
      { id: 's18-6', exerciseId: 'incline-db-press', loadKg: 34, reps: 10, tag: 'normal', done: true, rpe: 8.5 }, // PR
      { id: 's18-7', exerciseId: 'incline-db-press', loadKg: 34, reps: 9, tag: 'normal', done: true, rpe: 9.0 },
      { id: 's18-8', exerciseId: 'standing-cable-lateral-raise', loadKg: 15, reps: 15, tag: 'normal', done: true },
      { id: 's18-9', exerciseId: 'standing-cable-lateral-raise', loadKg: 15, reps: 15, tag: 'normal', done: true },
      { id: 's18-10', exerciseId: 'standing-cable-lateral-raise', loadKg: 17.5, reps: 12, tag: 'normal', done: true },
      { id: 's18-11', exerciseId: 'standing-cable-lateral-raise', loadKg: 17.5, reps: 12, tag: 'normal', done: true },
      { id: 's18-12', exerciseId: 'overhead-barbell-press', loadKg: 50, reps: 8, tag: 'normal', done: true },
      { id: 's18-13', exerciseId: 'overhead-barbell-press', loadKg: 55, reps: 8, tag: 'normal', done: true },
      { id: 's18-14', exerciseId: 'overhead-barbell-press', loadKg: 55, reps: 7, tag: 'normal', done: true },
      { id: 's18-15', exerciseId: 'triceps-rope-pushdown', loadKg: 32, reps: 15, tag: 'normal', done: true },
      { id: 's18-16', exerciseId: 'triceps-rope-pushdown', loadKg: 36, reps: 12, tag: 'normal', done: true },
      { id: 's18-17', exerciseId: 'triceps-rope-pushdown', loadKg: 36, reps: 12, tag: 'drop', done: true }
    ]
  });

  // 2. 3 days ago: Pull & Posterior Strength (Session 17)
  sessions.push({
    id: 'sess-17',
    number: 17,
    startedAt: daysAgo(3, 18),
    endedAt: daysAgo(3, 19),
    pausedMs: 0,
    collectionId: 'col-pull-posterior',
    collectionName: 'Pull & Posterior Strength',
    locationId: 'loc-metroflex',
    locationName: 'MetroFlex Gym',
    effort: 8.5,
    xpGained: 340,
    sets: [
      { id: 's17-1', exerciseId: 'barbell-deadlift', loadKg: 100, reps: 5, tag: 'warmup', done: true },
      { id: 's17-2', exerciseId: 'barbell-deadlift', loadKg: 140, reps: 5, tag: 'normal', done: true },
      { id: 's17-3', exerciseId: 'barbell-deadlift', loadKg: 155, reps: 5, tag: 'normal', done: true },
      { id: 's17-4', exerciseId: 'barbell-deadlift', loadKg: 165, reps: 5, tag: 'normal', done: true },
      { id: 's17-5', exerciseId: 'weighted-pull-up', loadKg: 15, reps: 8, tag: 'normal', done: true },
      { id: 's17-6', exerciseId: 'weighted-pull-up', loadKg: 20, reps: 6, tag: 'normal', done: true },
      { id: 's17-7', exerciseId: 'weighted-pull-up', loadKg: 25, reps: 4, tag: 'normal', done: true }, // +25kg PR
      { id: 's17-8', exerciseId: 'barbell-bent-over-row', loadKg: 75, reps: 8, tag: 'normal', done: true },
      { id: 's17-9', exerciseId: 'barbell-bent-over-row', loadKg: 75, reps: 8, tag: 'normal', done: true },
      { id: 's17-10', exerciseId: 'face-pull', loadKg: 25, reps: 15, tag: 'normal', done: true },
      { id: 's17-11', exerciseId: 'face-pull', loadKg: 25, reps: 15, tag: 'normal', done: true },
      { id: 's17-12', exerciseId: 'barbell-bicep-curl', loadKg: 35, reps: 10, tag: 'normal', done: true },
      { id: 's17-13', exerciseId: 'barbell-bicep-curl', loadKg: 35, reps: 10, tag: 'normal', done: true }
    ]
  });

  // 3. 5 days ago: Lower Body & Core (Session 16)
  sessions.push({
    id: 'sess-16',
    number: 16,
    startedAt: daysAgo(5, 17),
    endedAt: daysAgo(5, 18),
    pausedMs: 0,
    collectionId: 'col-legs-core',
    collectionName: 'Lower Body & Core Armor',
    locationId: 'loc-metroflex',
    locationName: 'MetroFlex Gym',
    effort: 8.5,
    xpGained: 320,
    sets: [
      { id: 's16-1', exerciseId: 'barbell-back-squat', loadKg: 80, reps: 6, tag: 'warmup', done: true },
      { id: 's16-2', exerciseId: 'barbell-back-squat', loadKg: 115, reps: 6, tag: 'normal', done: true },
      { id: 's16-3', exerciseId: 'barbell-back-squat', loadKg: 120, reps: 6, tag: 'normal', done: true },
      { id: 's16-4', exerciseId: 'barbell-back-squat', loadKg: 125, reps: 6, tag: 'normal', done: true },
      { id: 's16-5', exerciseId: 'romanian-deadlift', loadKg: 95, reps: 8, tag: 'normal', done: true },
      { id: 's16-6', exerciseId: 'romanian-deadlift', loadKg: 105, reps: 8, tag: 'normal', done: true },
      { id: 's16-7', exerciseId: 'leg-press', loadKg: 180, reps: 12, tag: 'normal', done: true },
      { id: 's16-8', exerciseId: 'seated-leg-curl', loadKg: 55, reps: 12, tag: 'normal', done: true },
      { id: 's16-9', exerciseId: 'hanging-leg-raise', reps: 15, tag: 'normal', done: true },
      { id: 's16-10', exerciseId: 'hanging-leg-raise', reps: 15, tag: 'normal', done: true }
    ]
  });

  // 4. 7 days ago: Heavy Bag Combat (Session 15)
  sessions.push({
    id: 'sess-15',
    number: 15,
    startedAt: daysAgo(7, 10),
    endedAt: daysAgo(7, 11),
    pausedMs: 0,
    collectionId: 'col-fighter-rounds',
    collectionName: 'Heavy Bag Fighter Rounds',
    locationId: 'loc-dojo',
    locationName: 'Kombat Combat Club',
    effort: 8.0,
    xpGained: 280,
    sets: [
      { id: 's15-1', exerciseId: 'shadow-boxing', rounds: 3, durationSec: 180, tag: 'normal', done: true },
      { id: 's15-2', exerciseId: 'heavy-bag-rounds', rounds: 5, durationSec: 180, tag: 'normal', done: true },
      { id: 's15-3', exerciseId: 'roundhouse-kick-bag', rounds: 3, durationSec: 180, tag: 'normal', done: true },
      { id: 's15-4', exerciseId: 'jump-rope', durationSec: 600, tag: 'normal', done: true }
    ]
  });

  // Additional realistic sessions from days 8 through 28 to give 18 sessions total for 1M/30D data
  const scheduleHistory = [
    { day: 9, coll: 'col-push-hypertrophy', name: 'Push Day Hypertrophy', bench: 100 },
    { day: 11, coll: 'col-pull-posterior', name: 'Pull & Posterior Strength', bench: 0 },
    { day: 13, coll: 'col-legs-core', name: 'Lower Body & Core Armor', bench: 0 },
    { day: 15, coll: 'col-push-hypertrophy', name: 'Push Day Hypertrophy', bench: 97.5 },
    { day: 17, coll: 'col-pull-posterior', name: 'Pull & Posterior Strength', bench: 0 },
    { day: 19, coll: 'col-fighter-rounds', name: 'Heavy Bag Fighter Rounds', bench: 0 },
    { day: 21, coll: 'col-push-hypertrophy', name: 'Push Day Hypertrophy', bench: 95 },
    { day: 23, coll: 'col-pull-posterior', name: 'Pull & Posterior Strength', bench: 0 },
    { day: 25, coll: 'col-legs-core', name: 'Lower Body & Core Armor', bench: 0 },
    { day: 27, coll: 'col-push-hypertrophy', name: 'Push Day Hypertrophy', bench: 92.5 }
  ];

  scheduleHistory.forEach((hist, i) => {
    const sessNum = 14 - i;
    sessions.push({
      id: `sess-${sessNum}`,
      number: sessNum,
      startedAt: daysAgo(hist.day, 18),
      endedAt: daysAgo(hist.day, 19),
      pausedMs: 0,
      collectionId: hist.coll,
      collectionName: hist.name,
      locationId: 'loc-metroflex',
      locationName: 'MetroFlex Gym',
      effort: 7.5,
      xpGained: 260,
      sets: hist.bench > 0 ? [
        { id: `s${sessNum}-1`, exerciseId: 'barbell-bench-press', loadKg: hist.bench, reps: 6, tag: 'normal', done: true },
        { id: `s${sessNum}-2`, exerciseId: 'incline-db-press', loadKg: 28, reps: 10, tag: 'normal', done: true },
        { id: `s${sessNum}-3`, exerciseId: 'triceps-rope-pushdown', loadKg: 30, reps: 12, tag: 'normal', done: true }
      ] : [
        { id: `s${sessNum}-1`, exerciseId: 'concept2-rowing', distanceM: 5000, durationSec: 1200, tag: 'normal', done: true }
      ]
    });
  });

  return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}
