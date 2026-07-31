export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function uniqueBy<T>(
  items: readonly T[],
  getKey: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
