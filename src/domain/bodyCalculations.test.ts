import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBodyProfile, classifyBMI } from './bodyCalculations.ts';

test('classifyBMI: WHO adult cut-offs, boundaries belong to the higher band', () => {
  assert.equal(classifyBMI(18.49), 'underweight');
  assert.equal(classifyBMI(18.5), 'healthy');
  assert.equal(classifyBMI(24.99), 'healthy');
  assert.equal(classifyBMI(25), 'overweight');
  assert.equal(classifyBMI(29.99), 'overweight');
  assert.equal(classifyBMI(30), 'obese');
});

test('calculateBodyProfile: skinny, healthy, overweight and obese at 175 cm', () => {
  const skinny = calculateBodyProfile(175, 52)!;
  assert.equal(skinny.bmi, 17);
  assert.equal(skinny.category, 'underweight');
  // Healthy range at 1.75 m: 18.5 * 3.0625 = 56.7 kg … 25 * 3.0625 = 76.6 kg
  assert.equal(skinny.healthyMinKg, 56.7);
  assert.equal(skinny.healthyMaxKg, 76.6);
  assert.equal(skinny.deltaToHealthyKg, 4.7);

  const healthy = calculateBodyProfile(175, 70)!;
  assert.equal(healthy.bmi, 22.9);
  assert.equal(healthy.category, 'healthy');
  assert.equal(healthy.deltaToHealthyKg, 0);

  const over = calculateBodyProfile(175, 85)!;
  assert.equal(over.bmi, 27.8);
  assert.equal(over.category, 'overweight');
  assert.equal(over.deltaToHealthyKg, -8.4);

  const obese = calculateBodyProfile(175, 100)!;
  assert.equal(obese.bmi, 32.7);
  assert.equal(obese.category, 'obese');
});

test('calculateBodyProfile: classifies on the unrounded BMI', () => {
  // 76.4 kg at 175 cm is BMI 24.947: displayed 24.9 and still healthy
  const p = calculateBodyProfile(175, 76.4)!;
  assert.equal(p.bmi, 24.9);
  assert.equal(p.category, 'healthy');
});

test('calculateBodyProfile: missing or implausible input gives null, never a guess', () => {
  assert.equal(calculateBodyProfile(undefined, 75), null);
  assert.equal(calculateBodyProfile(175, undefined), null);
  assert.equal(calculateBodyProfile(0, 75), null);
  assert.equal(calculateBodyProfile(1.75, 75), null); // metres typed instead of cm
  assert.equal(calculateBodyProfile(175, 0), null);
  assert.equal(calculateBodyProfile(Number.NaN, 75), null);
  assert.equal(calculateBodyProfile(175, 900), null);
});
