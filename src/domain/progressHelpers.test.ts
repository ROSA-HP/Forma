import test from 'node:test';
import assert from 'node:assert/strict';
import { totalEarnedXP, trainingSpanDays, muscleLoad } from './calculations.ts';
import { summarizeExerciseHistory, daysSince, calculateExercisePRs } from './analyticsCalculations.ts';
import { Exercise, Session, SetEntry } from '../types/index.ts';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 13, 12, 0, 0).getTime();

const bench: Exercise = {
  id: 'bench', name: 'Bench Press', category: 'gym', equipment: 'barbell',
  primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], trackingType: 'weight_reps',
  defaultRestSec: 90, incrementKg: 2.5, source: 'custom'
};

let setSeq = 0;
function set(exerciseId: string, loadKg: number | undefined, reps: number | undefined, extra: Partial<SetEntry> = {}): SetEntry {
  return { id: `set-${++setSeq}`, exerciseId, loadKg, reps, tag: 'normal', done: true, ...extra };
}

function session(id: string, daysAgo: number, sets: SetEntry[], xpGained = 0): Session {
  const startedAt = new Date(NOW - daysAgo * DAY).toISOString();
  return { id, number: 1, startedAt, endedAt: startedAt, pausedMs: 0, xpGained, sets };
}

test('totalEarnedXP: uses stored session XP and never invents PR bonuses', () => {
  assert.equal(totalEarnedXP([]), 0);
  const stored = session('a', 1, [set('bench', 60, 10)], 260);
  // No stored XP: 100 per workout + 10 per working set (the warm-up does not count)
  const legacy = session('b', 2, [set('bench', 60, 10), set('bench', 60, 10), set('bench', 30, 10, { tag: 'warmup' })]);
  assert.equal(totalEarnedXP([stored, legacy]), 260 + 120);
});

test('trainingSpanDays: days since the first session, at least one week', () => {
  assert.equal(trainingSpanDays([], NOW), 7);
  assert.equal(trainingSpanDays([session('a', 2, [])], NOW), 7);
  assert.equal(trainingSpanDays([session('a', 20, []), session('b', 3, [])], NOW), 20);
});

test('muscleLoad over the real training span gives a meaningful all-time average', () => {
  // 12 chest sets across 21 days = 4 sets/week = 29% of a 14-set target.
  const sessions = [
    session('a', 21, [set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10)]),
    session('b', 14, [set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10)]),
    session('c', 7, [set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10), set('bench', 60, 10)])
  ];
  const map = new Map([[bench.id, bench]]);
  const load = muscleLoad(sessions, trainingSpanDays(sessions, NOW), map, 14, NOW);
  assert.equal(load.chest.weeklyAvg, 4);
  assert.equal(load.chest.pct, 29);
  // Triceps assist: half credit
  assert.equal(load.triceps.weeklyAvg, 2);

  // The old "all time" window of 36 500 days averaged the same work down to nothing
  assert.equal(muscleLoad(sessions, 36500, map, 14, NOW).chest.pct, 0);
});

test('summarizeExerciseHistory: counts working sets, last session and best values', () => {
  const sessions = [
    session('new', 1, [set('bench', 65, 8), set('bench', 30, 12, { tag: 'warmup' }), set('bench', 70, 5, { done: false })]),
    session('old', 9, [set('bench', 60, 10), set('plank', undefined, undefined, { durationSec: 75 })])
  ];
  const history = summarizeExerciseHistory(sessions);

  const b = history.get('bench')!;
  assert.equal(b.setsLogged, 2);          // warm-up and unfinished set ignored
  assert.equal(b.bestLoadKg, 65);         // the unfinished 70 kg set is not a record
  assert.equal(b.maxReps, 10);
  assert.equal(b.lastLoggedAt, sessions[0].startedAt);

  assert.equal(history.get('plank')!.bestDurationSec, 75);
  assert.equal(history.get('squat'), undefined);
});

test('daysSince: counts local calendar days, not 24-hour blocks', () => {
  const now = new Date(2026, 10, 13, 0, 30);
  assert.equal(daysSince(new Date(2026, 10, 13, 0, 5).toISOString(), now), 0);
  assert.equal(daysSince(new Date(2026, 10, 12, 23, 50).toISOString(), now), 1); // 40 minutes ago, but yesterday
  assert.equal(daysSince(new Date(2026, 10, 10, 9, 0).toISOString(), now), 3);
});

test('calculateExercisePRs: a max-reps tie keeps the heavier set', () => {
  const sessions = [
    session('new', 1, [set('bench', 62.5, 10)]),
    session('old', 8, [set('bench', 60, 10)])
  ];
  for (const order of [sessions, [...sessions].reverse()]) {
    const pr = calculateExercisePRs(order, [bench]).find(p => p.exerciseId === 'bench')!;
    assert.equal(pr.maxReps, 10);
    assert.equal(pr.maxRepsWeightKg, 62.5);
  }
});
