export type TrendDirection = 'UP' | 'DOWN' | 'FLAT';

export function trendDirection(
  current: number,
  previous: number,
): TrendDirection {
  return current === previous ? 'FLAT' : current > previous ? 'UP' : 'DOWN';
}

export function groupIsoDatesByMonth<T>(
  records: readonly T[],
  dateFor: (record: T) => string,
): Array<{ month: string; count: number }> {
  const counts = new Map<string, number>();
  records.forEach(record => {
    const month = dateFor(record).slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, count]) => ({ month, count }));
}
