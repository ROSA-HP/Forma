import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatDateKey,
  getCalendarMonthMatrix,
  groupSessionsByDate,
  getSessionDominantCategory,
  calculateVolumeTrend,
  calculateExercisePRs,
  calculateAthleteTier,
  filterSessionsByDiscipline
} from './analyticsCalculations.ts';
import { Session, Exercise } from '../types/index.ts';

describe('Analytics & History Domain Calculations', () => {
  it('formatDateKey formats dates properly as YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 15); // May 15, 2026
    assert.strictEqual(formatDateKey(d), '2026-05-15');
  });

  it('getCalendarMonthMatrix generates a 35 or 42 cell grid aligned from Monday', () => {
    // May 2026: May 1 is Friday (dayOfWeek index 4: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4)
    const today = new Date(2026, 4, 15);
    const matrix = getCalendarMonthMatrix(2026, 4, today);

    assert.ok(matrix.length === 35 || matrix.length === 42);
    // First cell should be Monday
    assert.strictEqual(matrix[0].dayOfWeek, 0);
    // Find today's cell
    const todayCell = matrix.find(c => c.isToday);
    assert.ok(todayCell);
    assert.strictEqual(todayCell?.dateKey, '2026-05-15');
    assert.strictEqual(todayCell?.isCurrentMonth, true);
  });

  it('groupSessionsByDate groups sessions by date key', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        number: 1,
        startedAt: '2026-05-10T10:00:00Z',
        endedAt: '2026-05-10T11:00:00Z',
        pausedMs: 0,
        xpGained: 100,
        sets: []
      },
      {
        id: 's2',
        number: 2,
        startedAt: '2026-05-10T16:00:00Z',
        endedAt: '2026-05-10T17:00:00Z',
        pausedMs: 0,
        xpGained: 120,
        sets: []
      },
      {
        id: 's3',
        number: 3,
        startedAt: '2026-05-12T09:00:00Z',
        endedAt: '2026-05-12T10:00:00Z',
        pausedMs: 0,
        xpGained: 80,
        sets: []
      }
    ];

    const grouped = groupSessionsByDate(sessions);
    const date1 = formatDateKey(new Date('2026-05-10T10:00:00Z'));
    const date2 = formatDateKey(new Date('2026-05-12T09:00:00Z'));

    assert.strictEqual(grouped.get(date1)?.length, 2);
    assert.strictEqual(grouped.get(date2)?.length, 1);
  });

  it('getSessionDominantCategory identifies the discipline with the most completed sets', () => {
    const exercises: Exercise[] = [
      {
        id: 'ex-bench',
        name: 'Bench Press',
        category: 'gym',
        equipment: 'barbell',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps'],
        trackingType: 'weight_reps',
        defaultRestSec: 90,
        incrementKg: 2.5,
        source: 'builtin'
      },
      {
        id: 'ex-pullup',
        name: 'Pull-up',
        category: 'calisthenics',
        equipment: 'bodyweight',
        primaryMuscles: ['lats'],
        secondaryMuscles: ['biceps'],
        trackingType: 'bodyweight',
        defaultRestSec: 90,
        incrementKg: 1,
        source: 'builtin'
      }
    ];
    const map = new Map(exercises.map(e => [e.id, e]));

    const session: Session = {
      id: 's-mix',
      number: 1,
      startedAt: '2026-05-10T10:00:00Z',
      endedAt: '2026-05-10T11:00:00Z',
      pausedMs: 0,
      xpGained: 150,
      sets: [
        { id: '1', exerciseId: 'ex-bench', loadKg: 80, reps: 8, tag: 'normal', done: true },
        { id: '2', exerciseId: 'ex-bench', loadKg: 80, reps: 8, tag: 'normal', done: true },
        { id: '3', exerciseId: 'ex-pullup', reps: 10, tag: 'normal', done: true }
      ]
    };

    const dom = getSessionDominantCategory(session, map);
    assert.strictEqual(dom, 'gym');
  });

  it('calculateVolumeTrend computes weekly volume tonnage and sets over time', () => {
    const now = new Date(2026, 4, 15);
    const sessions: Session[] = [
      {
        id: 's-recent',
        number: 1,
        startedAt: new Date(2026, 4, 12, 10, 0).toISOString(),
        endedAt: new Date(2026, 4, 12, 11, 0).toISOString(),
        pausedMs: 0,
        xpGained: 100,
        sets: [
          { id: 'st1', exerciseId: 'ex1', loadKg: 100, reps: 10, tag: 'normal', done: true },
          { id: 'st2', exerciseId: 'ex1', loadKg: 100, reps: 10, tag: 'normal', done: true }
        ]
      }
    ];

    const trend = calculateVolumeTrend(sessions, 4, now);
    assert.strictEqual(trend.length, 4);
    // Latest week should have 2000kg
    const latest = trend[trend.length - 1];
    assert.strictEqual(latest.totalVolumeKg, 2000);
    assert.strictEqual(latest.totalReps, 20);
    assert.strictEqual(latest.sessionCount, 1);
  });

  it('calculateExercisePRs accurately determines heaviest load and est 1RM', () => {
    const exercises: Exercise[] = [
      {
        id: 'ex-bench',
        name: 'Barbell Bench Press',
        category: 'gym',
        equipment: 'barbell',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps'],
        trackingType: 'weight_reps',
        defaultRestSec: 90,
        incrementKg: 2.5,
        source: 'builtin'
      }
    ];

    const sessions: Session[] = [
      {
        id: 's1',
        number: 1,
        startedAt: '2026-05-01T10:00:00Z',
        endedAt: '2026-05-01T11:00:00Z',
        pausedMs: 0,
        xpGained: 100,
        sets: [
          { id: '1', exerciseId: 'ex-bench', loadKg: 80, reps: 10, tag: 'normal', done: true }, // 80 * (1 + 10/30) = 106.7
          { id: '2', exerciseId: 'ex-bench', loadKg: 100, reps: 5, tag: 'normal', done: true }   // 100 * (1 + 5/30) = 116.7
        ]
      }
    ];

    const prs = calculateExercisePRs(sessions, exercises);
    const benchPR = prs.find(p => p.exerciseId === 'ex-bench');
    assert.ok(benchPR);
    assert.strictEqual(benchPR?.heaviestWeightKg, 100);
    assert.strictEqual(benchPR?.bestEstimated1RM, 116.7);
    assert.strictEqual(benchPR?.maxReps, 10);
    assert.strictEqual(benchPR?.lifetimeVolumeKg, 80 * 10 + 100 * 5);
  });

  it('calculateAthleteTier calculates rank and progress percentage', () => {
    const tier0 = calculateAthleteTier(0);
    assert.strictEqual(tier0.rankTitle, 'Novice Initiate');
    assert.strictEqual(tier0.level, 1);

    const tierMid = calculateAthleteTier(1400); // 1400 is between 800 (Apprentice) and 2000 (Warrior Adept)
    assert.strictEqual(tierMid.rankTitle, 'Apprentice Lifter');
    assert.strictEqual(tierMid.level, 2);
    assert.strictEqual(tierMid.progressPct, 50); // (1400-800) / (2000-800) = 600 / 1200 = 50%
  });
});
