export type ID = string;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  state: string;
  pinCode: string;
  country: string;
}

export type EntityStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DRAFT'
  | 'COMPLETED'
  | 'LOCKED'
  | 'PUBLISHED'
  | 'CANCELLED';

export interface TimestampedEntity {
  createdAt?: string;
  updatedAt?: string;
}
