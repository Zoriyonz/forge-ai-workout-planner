export type Units = "metric" | "imperial";

export const lengthLabel = (u: Units) => (u === "metric" ? "cm" : "in");
export const weightLabel = (u: Units) => (u === "metric" ? "kg" : "lb");

export const toCm = (v: number, u: Units) => (u === "metric" ? v : v * 2.54);
export const toKg = (v: number, u: Units) => (u === "metric" ? v : v * 0.45359237);
export const fromCm = (cm: number, u: Units) => (u === "metric" ? cm : cm / 2.54);
export const fromKg = (kg: number, u: Units) => (u === "metric" ? kg : kg / 0.45359237);

export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Parses an optional numeric input; returns undefined for blank or invalid. */
export function num(s: string): number | undefined {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
