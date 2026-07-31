import type { SerializedReportFilters } from '../models/report';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return [...value].sort();
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

export function normalizeReportFilters(
  filters: SerializedReportFilters,
): SerializedReportFilters {
  return stableValue(filters) as SerializedReportFilters;
}

export function hashReportFilters(filters: SerializedReportFilters): string {
  const input = JSON.stringify(normalizeReportFilters(filters));
  let hash = 7;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2_147_483_647;
  }
  return hash.toString(16).padStart(8, '0');
}
