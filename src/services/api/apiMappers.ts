import type { ID } from '../../models/common';
import type { BackendPaginatedDto } from './apiContracts';
import type { BackendPage, PageMetadata } from './apiTypes';

export function mapBackendId(value: number | string): ID {
  return String(value);
}

export function mapBackendDecimalToPaise(value: string | number): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    throw new Error('Backend decimal value is invalid.');
  }
  return Math.round(amount * 100);
}

export function mapBackendPage<TDto, TDomain>(
  page: BackendPaginatedDto<TDto> | BackendPage<TDto>,
  mapper: (item: TDto) => TDomain,
): { items: TDomain[]; metadata: PageMetadata } {
  return {
    items: page.results.map(mapper),
    metadata: {
      count: page.count,
      next: page.next,
      previous: page.previous,
    },
  };
}
