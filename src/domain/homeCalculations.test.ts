import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startOfWeekMonday,
  calculateHomeWeekSummary,
  buildLastTrainedMap
} from './homeCalculations.ts';
import { Exercise, Session, SetEntry } from '../types/index.ts';

const bench: Exercise = {
  id: 'bench-press',
  name: 'Barbell Bench Press',
  category: 'gym',
  equipment: 'barbell',
  trackingType: 'weight_reps',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  defaultRestSec: 90,
  incrementKg: 2.5,
  source: 'builtin'
};

const squat: Exercise = { ...bench, id: 'squat', name: 'Back Squat', primaryMuscles: ['quads', 'glutes'] };

function set(exerciseId: string, loadKg: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry {
  return { id: `${exerciseId}-${loadKg}-${reps}-${Math.random()}`, exerciseId, loadKg, reps, tag: 'normal', done: true, ...extra };
}

function session(id: string, start: Date, sets: SetEntry[], extra: Partial<Session> = {}): Session {
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    id,
    number: 1,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    pausedMs: 0,
    xpGained: 0,
    sets,
    ...extra
  };
}

// Wednesday 2026-10-28, 18:00 local
const wednesday = new Date(2026, 9, 28, 18, 0, 0);

test('startOfWeekMonday: returns local midnight of the week\'s Monday', () => {
  const monday = startOfWeekMonday(wednesday);
  assert.equal(monday.getDay(), 1);
  assert.equal(monday.getDate(), 26);
  assert.equal(monday.getHours(), 0);

  const sunday = new Date(2026, 10, 1, 9, 0, 0);
  assert.equal(startOfWeekMonday(sunday).getDate(), 26);
});

test('calculateHomeWeekSummary: empty history gives an empty week', () => {
  const summary = calculateHomeWeekSummary([], [bench], wednesday);
  assert.equal(summary.days.length, 7);
  assert.equal(summary.trainedDays, 0);
  assert.equal(summary.sessionCount, 0);
  assert.equal(summary.volumeKg, 0);
  assert.equal(summary.prCount, 0);
  assert.equal(summary.days[2].isToday, true);
  assert.equal(summary.days[3].isFuture, true);
  assert.equal(summary.days[1].isFuture, false);
});

test('calculateHomeWeekSummary: counts trained days, sessions and working volume of this week only', () => {
  const sessions = [
    session('last-week', new Date(2026, 9, 22, 10), [set('bench-press', 100, 5)]),
    session('mon-am', new Date(2026, 9, 26, 8), [set('bench-press', 60, 10), set('bench-press', 40, 10, { tag: 'warmup' })]),
    session('mon-pm', new Date(2026, 9, 26, 19), [set('squat', 100, 5)]),
    session('wed', new Date(2026, 9, 28, 7), [set('bench-press', 70, 5), set('bench-press', 70, 5, { done: false })])
  ];
  const summary = calculateHomeWeekSummary(sessions, [bench, squat], wednesday);

  assert.equal(summary.sessionCount, 3);
  assert.equal(summary.trainedDays, 2);
  assert.deepEqual(summary.days.map(d => d.trained), [true, false, true, false, false, false, false]);
  // 60×10 + 100×5 + 70×5 (warm-ups and unfinished sets excluded)
  assert.equal(summary.volumeKg, 600 + 500 + 350);
});

test('calculateHomeWeekSummary: PRs only count when this week beats earlier history', () => {
  const sessions = [
    session('old', new Date(2026, 9, 20, 10), [set('bench-press', 80, 5)]),
    session('pr', new Date(2026, 9, 26, 10), [set('bench-press', 85, 3), set('bench-press', 82.5, 5)]),
    session('first-squat', new Date(2026, 9, 27, 10), [set('squat', 120, 5)]),
    session('no-pr', new Date(2026, 9, 28, 10), [set('bench-press', 85, 3)])
  ];
  const summary = calculateHomeWeekSummary(sessions, [bench, squat], wednesday);
  // bench 85 > 80 is a PR; first-ever squat is a baseline; repeating 85 is not
  assert.equal(summary.prCount, 1);
});

test('buildLastTrainedMap: keeps the most recent session per primary muscle', () => {
  const sessions = [
    session('older', new Date(2026, 9, 26, 10), [set('bench-press', 80, 5)]),
    session('recent', new Date(2026, 9, 28, 6), [set('bench-press', 80, 5, { tag: 'failure' })]),
    session('warmup-only', new Date(2026, 9, 28, 16), [set('squat', 40, 5, { tag: 'warmup' })])
  ];
  const map = buildLastTrainedMap(sessions, [bench, squat], wednesday);

  assert.ok(map.chest);
  assert.equal(Math.round(map.chest!.hours), 11); // ended 07:00, reference 18:00
  assert.equal(map.chest!.heavy, true);
  assert.equal(map.quads, undefined);
  assert.equal(map.triceps, undefined); // secondary muscles do not drive recovery
});
