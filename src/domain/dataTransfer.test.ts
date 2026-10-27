import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculatePlateBreakdown, 
  validateImportPayload, 
  calculateStorageStats,
  escapeCSVCell
} from './dataTransfer.ts';

describe('Data Transfer & Plate Calculation Domain Logic', () => {
  it('calculatePlateBreakdown correctly computes 100kg with 20kg bar', () => {
    // 100kg target on 20kg barbell = 80kg total plates = 40kg per side (20kg + 20kg)
    const res = calculatePlateBreakdown(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    assert.strictEqual(res.barWeightKg, 20);
    assert.strictEqual(res.weightPerSideKg, 40);
    assert.deepStrictEqual(res.platesPerSide, [25, 15]);
    assert.strictEqual(res.totalLoadedKg, 100);
    assert.strictEqual(res.unachievedKg, 0);
  });

  it('calculatePlateBreakdown handles light targets less than or equal to bar weight', () => {
    const res = calculatePlateBreakdown(20, 20, [20, 10, 5]);
    assert.strictEqual(res.weightPerSideKg, 0);
    assert.deepStrictEqual(res.platesPerSide, []);
    assert.strictEqual(res.totalLoadedKg, 20);
  });

  it('calculatePlateBreakdown calculates fractional plates (e.g. 102.5kg)', () => {
    // 102.5kg - 20kg bar = 82.5kg = 41.25kg per side (25 + 15 + 1.25)
    const res = calculatePlateBreakdown(102.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
    assert.strictEqual(res.weightPerSideKg, 41.25);
    assert.deepStrictEqual(res.platesPerSide, [25, 15, 1.25]);
    assert.strictEqual(res.totalLoadedKg, 102.5);
    assert.strictEqual(res.unachievedKg, 0);
  });

  it('escapeCSVCell escapes quotes and neutralizes formula injection characters', () => {
    // Normal string
    assert.strictEqual(escapeCSVCell('Barbell Bench Press'), '"Barbell Bench Press"');
    
    // Double quotes escaping
    assert.strictEqual(escapeCSVCell('Push "Heavy" Day'), '"Push ""Heavy"" Day"');

    // Leading formula injection characters: =, +, -, @
    assert.strictEqual(escapeCSVCell('=SUM(A1:B10)'), '"\'=SUM(A1:B10)"');
    assert.strictEqual(escapeCSVCell('+100kg'), '"\'+100kg"');
    assert.strictEqual(escapeCSVCell('-5.5'), '"\'-5.5"');
    assert.strictEqual(escapeCSVCell('@username'), '"\'@username"');

    // Null and undefined
    assert.strictEqual(escapeCSVCell(null), '""');
    assert.strictEqual(escapeCSVCell(undefined), '""');
  });

  it('validateImportPayload validates correct backup structure and rejects corrupted JSON', () => {
    assert.strictEqual(validateImportPayload(null).valid, false);
    assert.strictEqual(validateImportPayload('string').valid, false);

    // Missing version
    assert.strictEqual(validateImportPayload({ sessions: [] }).valid, false);

    const validPayload = {
      version: 1,
      sessions: [
        {
          id: 's1',
          number: 1,
          startedAt: '2026-05-01T10:00:00Z',
          sets: [{ id: 'set-1', exerciseId: 'ex-1', done: true, tag: 'normal' }]
        }
      ],
      exercises: [
        {
          id: 'e1',
          name: 'Squat',
          category: 'gym',
          trackingType: 'weight_reps',
          primaryMuscles: ['quadriceps']
        }
      ],
      collections: [
        {
          id: 'c1',
          name: 'Leg Day',
          items: [{ exerciseId: 'e1', sets: 4 }]
        }
      ]
    };

    const res = validateImportPayload(validPayload);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.summary?.sessionsCount, 1);
    assert.strictEqual(res.summary?.exercisesCount, 1);
    assert.strictEqual(res.summary?.collectionsCount, 1);

    // Reject invalid session sets
    const invalidSessionPayload = {
      version: 1,
      sessions: [
        { id: 's1', number: 1, startedAt: 'invalid-date', sets: 'not-an-array' }
      ]
    };
    assert.strictEqual(validateImportPayload(invalidSessionPayload).valid, false);

    // Reject missing exercise name
    const invalidExercisePayload = {
      version: 1,
      exercises: [{ id: 'e1' }]
    };
    assert.strictEqual(validateImportPayload(invalidExercisePayload).valid, false);
  });

  it('calculateStorageStats computes aggregated totals', () => {
    const stats = calculateStorageStats(
      [
        {
          id: 's1',
          number: 1,
          startedAt: '2026-05-01T10:00:00Z',
          endedAt: '2026-05-01T11:00:00Z',
          pausedMs: 0,
          xpGained: 100,
          sets: [
            { id: '1', exerciseId: 'e1', loadKg: 100, reps: 5, tag: 'normal', done: true }
          ]
        }
      ],
      [{ id: 'e1', name: 'Deadlift', category: 'gym', equipment: 'barbell', primaryMuscles: [], secondaryMuscles: [], trackingType: 'weight_reps', defaultRestSec: 90, incrementKg: 2.5, source: 'builtin' }],
      [{ id: 'c1', name: 'Powerlifting', goal: 'strength', items: [] }]
    );

    assert.strictEqual(stats.totalSets, 1);
    assert.strictEqual(stats.totalVolumeKg, 500);
    assert.strictEqual(stats.exercisesCount, 1);
    assert.strictEqual(stats.routinesCount, 1);
    assert.strictEqual(stats.sessionsCount, 1);
  });
});
