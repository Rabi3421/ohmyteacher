import type {
  ApiResponse,
  PaginatedResponse,
} from '../../models/common';
import { ApiClientError, type ApiError } from '../api/apiError';
import { mockDelay } from './mockDelay';

export async function mockSuccess<T>(
  data: T,
  message = 'Success',
  delayMs?: number,
): Promise<ApiResponse<T>> {
  await mockDelay(delayMs);
  return { data, message, success: true };
}

export async function mockFailure(
  error: ApiError,
  delayMs?: number,
): Promise<never> {
  await mockDelay(delayMs);
  throw new ApiClientError(error);
}

export async function mockPaginated<T>(
  items: T[],
  options: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    message?: string;
    delayMs?: number;
  } = {},
): Promise<ApiResponse<PaginatedResponse<T>>> {
  await mockDelay(options.delayMs);
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? Math.max(items.length, 1);
  const totalItems = options.totalItems ?? items.length;

  return {
    data: {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
    message: options.message ?? 'Success',
    success: true,
  };
}
