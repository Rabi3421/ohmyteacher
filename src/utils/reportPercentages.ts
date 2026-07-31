export function toBasisPoints(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator * 10_000) / denominator);
}

export function collectionRate(
  collectedPaise: number,
  duePaise: number,
): number {
  return toBasisPoints(collectedPaise, duePaise);
}

export function average(values: readonly number[]): number {
  if (!values.length) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

export function minimum(values: readonly number[]): number {
  return values.length ? Math.min(...values) : 0;
}

export function maximum(values: readonly number[]): number {
  return values.length ? Math.max(...values) : 0;
}

export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function metricComparisonBasisPoints(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current === 0 ? 0 : 10_000;
  return Math.round(((current - previous) * 10_000) / Math.abs(previous));
}
