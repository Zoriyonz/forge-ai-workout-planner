import type { Measurements, Metrics } from "./types";

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Simple ratios from body dimensions. These are context, not a diagnosis. */
export function computeMetrics(heightCm: number, weightKg: number, m?: Measurements): Metrics {
  const h = heightCm / 100;
  return {
    bmi: round(weightKg / (h * h), 1),
    waistToHeight: m?.waistCm ? round(m.waistCm / heightCm, 2) : undefined,
    waistToHip: m?.waistCm && m.hipsCm ? round(m.waistCm / m.hipsCm, 2) : undefined,
  };
}
