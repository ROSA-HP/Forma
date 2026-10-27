import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCollectionStats, filterAndSortExercises } from './collectionCalculations.ts';
import { Collection, Exercise } from '../types/index.ts';

test('computeCollectionStats: correctly calculates sets, avg rest, and region breakdown', () => {
  const mockExercises = new Map<string, Exercise>([
    [
      'bench',
      {
        id: 'bench',
        name: 'Barbell Bench Press',
        category: 'gym',
        equipment: 'barbell',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps', 'front_delts'],
        trackingType: 'weight_reps',
        defaultRestSec: 90,
        incrementKg: 2.5,
        source: 'builtin'
      }
    ],
    [
      'pullup',
      {
        id: 'pullup',
        name: 'Weighted Pull-Up',
        category: 'calisthenics',
        equipment: 'bodyweight',
        primaryMuscles: ['lats', 'biceps'],
        secondaryMuscles: ['rear_delts'],
        trackingType: 'bodyweight',
        defaultRestSec: 90,
        incrementKg: 2.5,
        source: 'builtin'
      }
    ]
  ]);

  const collection: Collection = {
    id: 'col-1',
    name: 'Upper Hypertrophy',
    goal: 'hypertrophy',
    items: [
      { exerciseId: 'bench', role: 'compound', sets: 4, repsMin: 8, repsMax: 10, restSec: 90 },
      { exerciseId: 'pullup', role: 'compound', sets: 3, repsMin: 6, repsMax: 8, restSec: 60 }
    ]
  };

  const stats = computeCollectionStats(collection, mockExercises);

  // 4 + 3 = 7 sets
  assert.equal(stats.totalSets, 7);
  // Total weighted rest: (4*90 + 3*60) / 7 = (360 + 180)/7 = 540/7 ≈ 77s
  assert.equal(stats.avgRestSec, 77);
  // Total time: 4*(45+90) + 3*(45+60) = 4*135 + 3*105 = 540 + 315 = 855s = 14.25 min -> rounded to nearest 5 is 15 min
  assert.equal(stats.estimatedMinutes, 15);
  // Both gym and calisthenics -> mixed
  assert.equal(stats.isMixed, true);
  // Chest sets = 4 primary
  assert.equal(stats.regionSetCounts.chest, 4);
  // Back sets = 3 primary (lats)
  assert.equal(stats.regionSetCounts.back, 3);
});

test('filterAndSortExercises: supports searching, categories, and sorting', () => {
  const exercises: Exercise[] = [
    {
      id: 'e1',
      name: 'Barbell Bench Press',
      category: 'gym',
      equipment: 'barbell',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      trackingType: 'weight_reps',
      defaultRestSec: 90,
      incrementKg: 2.5,
      source: 'builtin'
    },
    {
      id: 'e2',
      name: 'Incline Dumbbell Press',
      category: 'gym',
      equipment: 'dumbbell',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      trackingType: 'weight_reps',
      defaultRestSec: 75,
      incrementKg: 2.0,
      source: 'builtin'
    },
    {
      id: 'e3',
      name: 'Weighted Pull-Up',
      category: 'calisthenics',
      equipment: 'bodyweight',
      primaryMuscles: ['lats'],
      secondaryMuscles: [],
      trackingType: 'bodyweight',
      defaultRestSec: 90,
      incrementKg: 2.5,
      source: 'builtin'
    }
  ];

  // Search 'dumbbell'
  const res1 = filterAndSortExercises(exercises, {
    searchQuery: 'dumbbell',
    category: 'all',
    equipment: [],
    muscleGroup: [],
    trackingType: [],
    loggedOnly: false,
    neverLoggedOnly: false,
    sortBy: 'name'
  });
  assert.equal(res1.length, 1);
  assert.equal(res1[0].id, 'e2');

  // Filter category 'calisthenics'
  const res2 = filterAndSortExercises(exercises, {
    searchQuery: '',
    category: 'calisthenics',
    equipment: [],
    muscleGroup: [],
    trackingType: [],
    loggedOnly: false,
    neverLoggedOnly: false,
    sortBy: 'name'
  });
  assert.equal(res2.length, 1);
  assert.equal(res2[0].id, 'e3');
});
