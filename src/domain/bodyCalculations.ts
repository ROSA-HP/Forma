/**
 * Body-type classification from height and weight (Body Mass Index).
 * Pure functions; the UI decides how to word and colour the result.
 *
 * BMI = weight (kg) / height (m)^2, classified with the WHO adult cut-offs.
 * It only compares weight with height, so it cannot tell muscle from fat:
 * a muscular lifter can land in "overweight" while carrying little fat.
 */

export type BodyCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

export interface BodyProfile {
  /** Body Mass Index, one decimal. */
  bmi: number;
  category: BodyCategory;
  /** Weight range (kg, one decimal) that is BMI 18.5–24.9 at this height. */
  healthyMinKg: number;
  healthyMaxKg: number;
  /**
   * Distance to the healthy range in kg (one decimal):
   * positive = this much below it, negative = this much above it, 0 = inside.
   */
  deltaToHealthyKg: number;
}

export const BMI_UNDERWEIGHT_MAX = 18.5;
export const BMI_HEALTHY_MAX = 25;
export const BMI_OVERWEIGHT_MAX = 30;

/** Plausible adult limits; anything outside is treated as a typo, not classified. */
export const HEIGHT_CM_MIN = 100;
export const HEIGHT_CM_MAX = 250;
export const WEIGHT_KG_MIN = 25;
export const WEIGHT_KG_MAX = 350;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function isValidHeightCm(heightCm: unknown): heightCm is number {
  return typeof heightCm === 'number' && Number.isFinite(heightCm)
    && heightCm >= HEIGHT_CM_MIN && heightCm <= HEIGHT_CM_MAX;
}

export function isValidWeightKg(weightKg: unknown): weightKg is number {
  return typeof weightKg === 'number' && Number.isFinite(weightKg)
    && weightKg >= WEIGHT_KG_MIN && weightKg <= WEIGHT_KG_MAX;
}

export function classifyBMI(bmi: number): BodyCategory {
  if (bmi < BMI_UNDERWEIGHT_MAX) return 'underweight';
  if (bmi < BMI_HEALTHY_MAX) return 'healthy';
  if (bmi < BMI_OVERWEIGHT_MAX) return 'overweight';
  return 'obese';
}

/**
 * Returns null when height or weight is missing or implausible, so callers
 * show a prompt instead of a made-up category.
 */
export function calculateBodyProfile(heightCm?: number, weightKg?: number): BodyProfile | null {
  if (!isValidHeightCm(heightCm) || !isValidWeightKg(weightKg)) return null;

  const m2 = (heightCm / 100) ** 2;
  // Classify on the unrounded value so 24.96 is "healthy", not rounded up to 25.0
  const rawBmi = weightKg / m2;
  const healthyMinKg = round1(BMI_UNDERWEIGHT_MAX * m2);
  const healthyMaxKg = round1(BMI_HEALTHY_MAX * m2);

  const category = classifyBMI(rawBmi);
  let deltaToHealthyKg = 0;
  if (category === 'underweight') deltaToHealthyKg = round1(healthyMinKg - weightKg);
  else if (category !== 'healthy') deltaToHealthyKg = round1(healthyMaxKg - weightKg);

  return {
    bmi: round1(rawBmi),
    category,
    healthyMinKg,
    healthyMaxKg,
    deltaToHealthyKg
  };
}
