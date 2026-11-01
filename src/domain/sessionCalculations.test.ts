import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  formatDuration, 
  calculateSessionSummary, 
  buildInitialDraftSets 
} from './sessionCalculations.ts';
import { Session, Exercise, Collection } from '../types/index.ts';

const mockExercise: Exercise = {
  id: 'bench-press',
  name: 'Barbell Bench Press',
  category: 'gym',
  equipment: 'barbell',
  trackingType: 'weight_reps',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'front_delts'],
  defaultRestSec: 90,
  incrementKg: 2.5,
  source: 'builtin'
};

const mockCollection: Collection = {
  id: 'chest-routine',
  name: 'Chest Hypertrophy',
  goal: 'hypertrophy',
  items: [
    {
      exerciseId: 'bench-press',
      role: 'compound',
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      restSec: 90
    }
  ]
};

test('formatDuration: formats MM:SS and HH:MM:SS accurately', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(45), '00:45');
  assert.equal(formatDuration(75), '01:15');
  assert.equal(formatDuration(3665), '1:01:05');
});

test('calculateSessionSummary: computes tonnage, sets, XP and duration', () => {
  const session: Session = {
    id: 'sess-1',
    number: 1,
    startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
    pausedMs: 0,
    xpGained: 0,
    sets: [
      { id: 's1', exerciseId: 'bench-press', tag: 'warmup', done: true, loadKg: 50, reps: 10 },
      { id: 's2', exerciseId: 'bench-press', tag: 'normal', done: true, loadKg: 100, reps: 10 },
      { id: 's3', exerciseId: 'bench-press', tag: 'normal', done: true, loadKg: 100, reps: 8 },
      { id: 's4', exerciseId: 'bench-press', tag: 'normal', done: false, loadKg: 100, reps: 8 }
    ]
  };

  const summary = calculateSessionSummary(session, [mockExercise], 75, []);
  assert.equal(summary.totalSets, 4);
  assert.equal(summary.completedSets, 3);
  assert.equal(summary.warmupSets, 1);
  assert.equal(summary.workingSets, 2);
  // Working tonnage: 100*10 + 100*8 = 1800 kg
  assert.equal(summary.tonnageKg, 1800);
  assert.ok(summary.xpEarned >= 120); // 100 base + 2*10
  assert.equal(summary.primaryCategory, 'gym');
});

test('buildInitialDraftSets: generates sets from collection items', () => {
  const result = buildInitialDraftSets(mockCollection, [mockExercise], []);
  assert.equal(result.draftExercises.length, 1);
  assert.equal(result.sets.length, 3);
  assert.equal(result.sets[0].tag, 'warmup');
  assert.equal(result.sets[1].tag, 'normal');
  assert.equal(result.sets[2].tag, 'normal');
});

test('calculateSessionSummary: an old session still shows its own muscle load', () => {
  const oldSession: Session = {
    id: 'old',
    number: 1,
    startedAt: '2025-01-10T10:00:00Z',
    endedAt: '2025-01-10T11:00:00Z',
    pausedMs: 0,
    xpGained: 0,
    sets: [{ id: 'o1', exerciseId: 'bench-press', loadKg: 80, reps: 8, tag: 'normal', done: true }]
  };
  const summary = calculateSessionSummary(oldSession, [mockExercise], 75, [oldSession]);
  assert.ok(summary.regionDistribution.chest.pct > 0);
});

test('calculateSessionSummary: PRs are judged only against sessions before it', () => {
  const mk = (id: string, start: string, load: number): Session => ({
    id, number: 1, startedAt: start, endedAt: start, pausedMs: 0, xpGained: 0,
    sets: [{ id: `${id}-1`, exerciseId: 'bench-press', loadKg: load, reps: 5, tag: 'normal', done: true }]
  });
  const first = mk('a', '2026-01-01T10:00:00Z', 80);
  const second = mk('b', '2026-01-08T10:00:00Z', 90);
  const later = mk('c', '2026-01-15T10:00:00Z', 120);
  const summary = calculateSessionSummary(second, [mockExercise], 75, [first, second, later]);
  assert.ok(summary.prsAchieved.some(pr => pr.prType === 'weight' && pr.newValue === 90));
});
