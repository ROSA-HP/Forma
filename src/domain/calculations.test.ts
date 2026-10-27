import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  epley1RM, 
  workingVolume, 
  detectPRs, 
  smartTarget, 
  estimateCalories, 
  estimateMinutes, 
  getMuscleBand, 
  muscleLoad, 
  regionValues, 
  calculateBalanceScore, 
  calculateRecovery, 
  calculateXP, 
  calculateStreak, 
  autoRebalanceSuggestions, 
  kgToLb, 
  lbToKg 
} from './calculations.ts';
import { Exercise, Schedule, Session, SetEntry } from '../types/index.ts';

test('epley1RM: calculates correct 1RM values', () => {
  // 1 rep should equal exact weight
  assert.equal(epley1RM(100, 1), 100);

  // 100kg x 6 reps = 100 * (1 + 6/30) = 120kg
  assert.equal(epley1RM(100, 6), 120);

  // 100kg x 10 reps = 100 * (1 + 10/30) = 133.3kg
  assert.equal(epley1RM(100, 10), 133.3);

  // >12 reps should be ignored per reliability rules
  assert.equal(epley1RM(100, 13), 0);

  // 0 reps should be 0
  assert.equal(epley1RM(100, 0), 0);

  // Bodyweight with added load: 75kg bodyweight + 25kg belt x 6 reps = 100 * 1.2 = 120kg
  assert.equal(epley1RM(25, 6, true, 75), 120);

  // Bodyweight assisted (-15kg band on 75kg bw = 60kg) x 1 rep = 60kg
  assert.equal(epley1RM(-15, 1, true, 75), 60);
});

test('workingVolume: calculates total tonnage excluding warmups', () => {
  const sets: SetEntry[] = [
    { id: '1', exerciseId: 'ex1', loadKg: 60, reps: 10, tag: 'warmup', done: true }, // warmup excluded: 0
    { id: '2', exerciseId: 'ex1', loadKg: 100, reps: 8, tag: 'normal', done: true }, // 800
    { id: '3', exerciseId: 'ex1', loadKg: 100, reps: 8, tag: 'normal', done: true }, // 800
    { id: '4', exerciseId: 'ex1', loadKg: 90, reps: 10, tag: 'drop', done: true },   // 900
    { id: '5', exerciseId: 'ex1', loadKg: 100, reps: 5, tag: 'normal', done: false } // not done: 0
  ];

  // 800 + 800 + 900 = 2500
  assert.equal(workingVolume(sets), 2500);

  // Bodyweight volume (75kg user + 10kg load) x 10 reps = 850
  const bwSets: SetEntry[] = [
    { id: 'b1', exerciseId: 'pullup', loadKg: 10, reps: 10, tag: 'normal', done: true }
  ];
  assert.equal(workingVolume(bwSets, true, 75), 850);
});

test('detectPRs: identifies weight, reps, 1RM and volume milestones', () => {
  const benchExercise: Exercise = {
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
  };

  const historySessions: Session[] = [
    {
      id: 's1',
      number: 1,
      startedAt: '2026-03-01T10:00:00Z',
      endedAt: '2026-03-01T11:00:00Z',
      pausedMs: 0,
      xpGained: 200,
      sets: [
        { id: 'p1', exerciseId: 'bench', loadKg: 100, reps: 5, tag: 'normal', done: true } // 1RM: 116.7kg, Vol: 500kg
      ]
    }
  ];

  // New session with 102.5kg x 6 reps
  const currentSets: SetEntry[] = [
    { id: 'c1', exerciseId: 'bench', loadKg: 102.5, reps: 6, tag: 'normal', done: true } // 1RM: 123.0kg, Vol: 615kg
  ];

  const prs = detectPRs(benchExercise, currentSets, historySessions);

  assert.ok(prs.length > 0);
  const weightPR = prs.find(p => p.prType === 'weight');
  assert.ok(weightPR);
  assert.equal(weightPR.newValue, 102.5);
  assert.equal(weightPR.previousValue, 100);
  assert.equal(weightPR.delta, 2.5);

  const volPR = prs.find(p => p.prType === 'volume');
  assert.ok(volPR);
  assert.equal(volPR.newValue, 615);
  assert.equal(volPR.previousValue, 500);
});

test('smartTarget: recommends weight overload when reps hit at low RPE', () => {
  // Case A: Hit top of rep range (10) at RPE 8.0 -> Overload +2.5kg
  const easySets: SetEntry[] = [
    { id: '1', exerciseId: 'e', loadKg: 100, reps: 10, rpe: 8.0, tag: 'normal', done: true },
    { id: '2', exerciseId: 'e', loadKg: 100, reps: 10, rpe: 8.5, tag: 'normal', done: true }
  ];
  const targetA = smartTarget(easySets, 8, 10, 2.5);
  assert.equal(targetA.weightKg, 102.5);
  assert.equal(targetA.reps, 8);
  assert.ok(targetA.reason.includes('Overload +2.5 kg'));

  // Case B: Hit only 8 reps at RPE 9.0 -> Suggest +1 rep (9 reps) at same weight
  const hardSets: SetEntry[] = [
    { id: '3', exerciseId: 'e', loadKg: 100, reps: 8, rpe: 9.0, tag: 'normal', done: true }
  ];
  const targetB = smartTarget(hardSets, 8, 10, 2.5);
  assert.equal(targetB.weightKg, 100);
  assert.equal(targetB.reps, 9);
  assert.ok(targetB.reason.includes('+1 rep'));
});

test('muscleLoad & regionValues: calculates weighted sets and distribution', () => {
  const exercisesMap = new Map<string, Exercise>([
    [
      'bench',
      {
        id: 'bench',
        name: 'Bench Press',
        category: 'gym',
        equipment: 'barbell',
        primaryMuscles: ['chest'],
        secondaryMuscles: ['triceps', 'front_delts'],
        trackingType: 'weight_reps',
        defaultRestSec: 90,
        incrementKg: 2.5,
        source: 'builtin'
      }
    ]
  ]);

  const recentSessions: Session[] = [
    {
      id: 's1',
      number: 1,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      pausedMs: 0,
      xpGained: 150,
      sets: [
        { id: '1', exerciseId: 'bench', loadKg: 80, reps: 10, tag: 'normal', done: true },
        { id: '2', exerciseId: 'bench', loadKg: 80, reps: 10, tag: 'normal', done: true }
      ]
    }
  ];

  const loads = muscleLoad(recentSessions, 7, exercisesMap, 14);
  // Chest got 2 primary sets = 2 sets / (7/7) = 2.0 weeklyAvg
  assert.equal(loads.chest.sets, 2);
  assert.equal(loads.chest.weeklyAvg, 2);

  // Triceps got 2 secondary sets = 1.0 sets
  assert.equal(loads.triceps.sets, 1);
  assert.equal(loads.triceps.weeklyAvg, 1);

  const regions = regionValues(loads);
  assert.ok(regions.chest);
  assert.ok(regions.delts);
  assert.ok(regions.arms);
});

test('calculateRecovery: handles 48h normal and 72h heavy fatigue recovery windows', () => {
  const recovery = calculateRecovery({
    chest: { hours: 24, heavy: false }, // 24 / 48 = 50% (recovering)
    quads: { hours: 48, heavy: false }, // 48 / 48 = 100% (primed)
    lats: { hours: 36, heavy: true }    // 36 / 72 = 50% (recovering)
  });

  assert.equal(recovery.muscles.chest.pct, 50);
  assert.equal(recovery.muscles.chest.status, 'recovering');
  assert.equal(recovery.muscles.quads.pct, 100);
  assert.equal(recovery.muscles.quads.status, 'primed');
  assert.equal(recovery.muscles.lats.pct, 50);

  // Untrained muscle should default to 100% primed
  assert.equal(recovery.muscles.biceps.pct, 100);
  assert.equal(recovery.muscles.biceps.status, 'primed');
});

test('calculateXP: follows 100 per workout + 10 per working set + 50 per PR with rank thresholds', () => {
  const sessions: Session[] = [
    {
      id: 's1',
      number: 1,
      startedAt: '2026-03-01T10:00:00Z',
      endedAt: '2026-03-01T11:00:00Z',
      pausedMs: 0,
      xpGained: 140,
      sets: [
        { id: '1', exerciseId: 'e', loadKg: 50, reps: 10, tag: 'normal', done: true },
        { id: '2', exerciseId: 'e', loadKg: 50, reps: 10, tag: 'normal', done: true },
        { id: '3', exerciseId: 'e', loadKg: 50, reps: 10, tag: 'normal', done: true },
        { id: '4', exerciseId: 'e', loadKg: 50, reps: 10, tag: 'normal', done: true }
      ]
    }
  ];

  // 1 session (100) + 4 sets (40) + 1 PR (50) = 190 XP
  const xp = calculateXP(sessions, 1);
  assert.equal(xp.totalXP, 190);
  assert.equal(xp.level, 1);
  assert.equal(xp.rankTitle, 'Starter');
});

test('calculateStreak: maintains streak with active training and rest protection', () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sessions: Session[] = [
    {
      id: 's1',
      number: 1,
      startedAt: yesterday.toISOString(),
      endedAt: yesterday.toISOString(),
      pausedMs: 0,
      xpGained: 100,
      sets: []
    }
  ];

  const streak = calculateStreak(sessions, [], today);
  assert.ok(streak.currentStreak >= 1);
});

test('calculateStreak: a long gap with no training resets the streak to 0', () => {
  const today = new Date(2026, 9, 27, 12, 0, 0);
  const tenDaysAgo = new Date(2026, 9, 17, 12, 0, 0);

  const sessions: Session[] = [{
    id: 's-gap', number: 1,
    startedAt: tenDaysAgo.toISOString(), endedAt: tenDaysAgo.toISOString(),
    pausedMs: 0, xpGained: 100, sets: []
  }];

  // Last workout 10 days ago, no schedule: the gap rule (> 2 days) kills the streak,
  // and the rest days after the workout must not be counted without an anchor.
  const streak = calculateStreak(sessions, [], today);
  assert.equal(streak.currentStreak, 0);
});

test('calculateStreak: rest days before the first workout do not inflate the streak', () => {
  const today = new Date(2026, 9, 27, 12, 0, 0);
  const twoDaysAgo = new Date(2026, 9, 25, 12, 0, 0);

  const sessions: Session[] = [{
    id: 's-first', number: 1,
    startedAt: twoDaysAgo.toISOString(), endedAt: twoDaysAgo.toISOString(),
    pausedMs: 0, xpGained: 100, sets: []
  }];

  // First-ever workout 2 days ago = workout + 1 rest day after it = 2.
  // Rest days OLDER than the first workout are unanchored and must not count.
  const streak = calculateStreak(sessions, [], today);
  assert.equal(streak.currentStreak, 2);
});

test('calculateStreak: sessions are bucketed by local calendar day, not UTC', () => {
  const today = new Date(2026, 9, 27, 12, 0, 0);

  // UTC midnight of Oct 27 falls on Oct 26 or 28 locally depending on the offset.
  // The walk must line up with the session\'s LOCAL day in every timezone.
  const sessions: Session[] = [{
    id: 's-utc', number: 1,
    startedAt: '2026-10-27T00:00:00.000Z', endedAt: '2026-10-27T00:00:00.000Z',
    pausedMs: 0, xpGained: 100, sets: []
  }];

  // Local day is Oct 26 for any non-zero offset and Oct 27 for UTC — either way
  // exactly one counted day: the session itself, with no unanchored rest days.
  const streak = calculateStreak(sessions, [], today);
  assert.equal(streak.currentStreak, 1);
});

test('calculateStreak: freeze protects one missed scheduled workout, the next one breaks the streak', () => {
  const today = new Date(2026, 9, 27, 12, 0, 0);
  const yesterday = new Date(2026, 9, 26, 12, 0, 0);

  const sessions: Session[] = [
    { id: 's-today', number: 2, startedAt: today.toISOString(), endedAt: today.toISOString(), pausedMs: 0, xpGained: 100, sets: [] },
    { id: 's-yday', number: 1, startedAt: yesterday.toISOString(), endedAt: yesterday.toISOString(), pausedMs: 0, xpGained: 100, sets: [] }
  ];

  const schedule: Schedule = {
    id: 'sched', mode: 'weekly', days: [0, 1, 2, 3, 4, 5, 6],
    time: '18:00', reminderOn: false, collectionId: 'c1'
  };

  // Today + yesterday count; day -2 is a missed scheduled day protected by the freeze;
  // day -3 is the second consecutive miss → streak stops at 2.
  const streak = calculateStreak(sessions, [schedule], today);
  assert.equal(streak.currentStreak, 2);
});

test('estimateCalories and estimateMinutes utilities', () => {
  // Gym 1 hour (3600s) for 75kg user at MET 5.0 = 5 * 75 * 1 = 375 kcal
  const kcal = estimateCalories('gym', 3600, 75);
  assert.equal(kcal, 375);

  // 3 items with sets and rest times
  const min = estimateMinutes([
    { exerciseId: 'e1', role: 'compound', sets: 4, repsMin: 8, repsMax: 10, restSec: 90 }, // 4 * (45+90) = 540s
    { exerciseId: 'e2', role: 'isolation', sets: 3, repsMin: 10, repsMax: 12, restSec: 60 } // 3 * (45+60) = 315s
  ]);
  // Total 855s = 14.25 min -> rounded to nearest 5 is 15 min
  assert.equal(min, 15);
});

test('unit conversion: kgToLb and lbToKg', () => {
  assert.equal(kgToLb(100), 220.5);
  assert.equal(lbToKg(220.5), 100);
});
