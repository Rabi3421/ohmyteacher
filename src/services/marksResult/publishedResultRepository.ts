import type { PublishedResultSnapshot } from '../../models/marksResult';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let values: PublishedResultSnapshot[] = [];
const listeners = new Set<(items: PublishedResultSnapshot[]) => void>();

export const publishedResultRepository = {
  list(): PublishedResultSnapshot[] {
    return clone(values);
  },
  replace(next: readonly PublishedResultSnapshot[]): void {
    values = clone([...next]);
    listeners.forEach(listener => listener(clone(values)));
  },
  upsert(next: readonly PublishedResultSnapshot[]): void {
    const map = new Map(values.map(item => [item.id, item]));
    next.forEach(item => map.set(item.id, clone(item)));
    values = [...map.values()];
    listeners.forEach(listener => listener(clone(values)));
  },
  updatePublicationStatus(
    batchId: string,
    status: PublishedResultSnapshot['status'],
  ): void {
    values = values.map(item =>
      item.publicationBatchId === batchId ? { ...item, status } : item,
    );
    listeners.forEach(listener => listener(clone(values)));
  },
  subscribe(listener: (items: PublishedResultSnapshot[]) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
