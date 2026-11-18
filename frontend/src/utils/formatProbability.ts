/** Render an estimator score without rounding near-certain values to 100.0%. */
export function formatProbability(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  const bounded = Math.max(0, Math.min(1, value));
  if (bounded === 1) return '100% (model estimate)';
  const percent = bounded * 100;
  if (percent >= 99.95) return '≥99.95%';
  return `${percent.toFixed(digits)}%`;
}
