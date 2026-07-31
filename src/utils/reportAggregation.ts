export interface CurrencyRecord {
  key: string;
  amountPaise: number;
}
export interface CountRecord {
  key: string;
}

export function aggregateCurrency<T extends CurrencyRecord>(
  records: readonly T[],
): Array<{ key: string; amountPaise: number; count: number }> {
  const result = new Map<string, { amountPaise: number; count: number }>();
  records.forEach(record => {
    const current = result.get(record.key) ?? { amountPaise: 0, count: 0 };
    result.set(record.key, {
      amountPaise: current.amountPaise + record.amountPaise,
      count: current.count + 1,
    });
  });
  return [...result.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ key, ...value }));
}

export function aggregateCounts<T extends CountRecord>(
  records: readonly T[],
): Array<{ key: string; count: number }> {
  return aggregateCurrency(
    records.map(record => ({ ...record, amountPaise: 0 })),
  ).map(({ key, count }) => ({ key, count }));
}

export function aggregateByDate<T>(
  records: readonly T[],
  dateFor: (record: T) => string,
  amountFor: (record: T) => number,
): Array<{ date: string; amountPaise: number; count: number }> {
  return aggregateCurrency(
    records.map(record => ({
      key: dateFor(record).slice(0, 10),
      amountPaise: amountFor(record),
    })),
  ).map(({ key, ...rest }) => ({ date: key, ...rest }));
}
