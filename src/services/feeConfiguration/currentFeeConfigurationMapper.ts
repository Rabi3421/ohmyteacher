import type {
  CreateCurrentFeeHeadInput,
  CreateCurrentFeeStructureItemInput,
  CurrentFeeHead,
  CurrentFeeStructureItem,
  UpdateCurrentFeeHeadInput,
  UpdateCurrentFeeStructureItemInput,
} from '../../models/currentFeeConfiguration';
import { feePaiseToDto, parseFeeAmountDto } from '../../utils/feeMoney';
import { ApiClientError } from '../api/apiError';
import type {
  FeeHeadDto,
  FeeHeadWriteRequestDto,
  FeeStructureItemCreateRequestDto,
  FeeStructureItemDto,
  FeeStructureItemUpdateRequestDto,
} from './currentFeeConfigurationDtos';

type UnknownRecord = Record<string, unknown>;

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_FEE_CONFIGURATION_RESPONSE',
    kind: 'server',
    message,
  });
}

function validation(message: string, field: string): never {
  throw new ApiClientError({
    code: 'INVALID_FEE_CONFIGURATION_INPUT',
    fieldErrors: { [field]: message },
    kind: 'validation',
    message,
    status: 400,
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

export function feeRequestId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) validation(`${field} is invalid.`, field);
  const result = Number(value);
  if (!Number.isSafeInteger(result)) validation(`${field} is invalid.`, field);
  return result;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

function timestamp(value: unknown, field: string): string {
  const result = text(value, field);
  if (Number.isNaN(Date.parse(result))) malformed(`The server returned an invalid ${field}.`);
  return result;
}

function envelope(value: unknown, key: string): unknown {
  if (!isRecord(value) || value.success !== true || !(key in value)) {
    malformed(`The server returned an invalid ${key} envelope.`);
  }
  return value[key];
}

function readHead(value: unknown): FeeHeadDto {
  if (!isRecord(value)) malformed('The server returned invalid Fee Head details.');
  const frequency = text(value.frequency, 'Fee Head frequency');
  if (frequency !== 'monthly' && frequency !== 'one_time') {
    malformed('The server returned an unknown Fee Head frequency.');
  }
  if (typeof value.is_active !== 'boolean') malformed('The server returned an invalid Fee Head status.');
  return {
    created_at: timestamp(value.created_at, 'Fee Head creation date'),
    frequency,
    id: positiveId(value.id, 'Fee Head ID'),
    is_active: value.is_active,
    name: text(value.name, 'Fee Head name'),
    school: positiveId(value.school, 'Fee Head school ID'),
  };
}

function mapHead(dto: FeeHeadDto): CurrentFeeHead {
  return {
    createdAt: dto.created_at,
    frequency: dto.frequency === 'monthly' ? 'MONTHLY' : 'ONE_TIME',
    id: String(dto.id),
    name: dto.name,
    schoolId: String(dto.school),
    status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
  };
}

function readItem(value: unknown): FeeStructureItemDto {
  if (!isRecord(value)) malformed('The server returned invalid Structure Item details.');
  if (typeof value.is_mandatory !== 'boolean') malformed('The server returned an invalid mandatory flag.');
  return {
    amount: text(value.amount, 'Structure Item amount'),
    created_at: timestamp(value.created_at, 'Structure Item creation date'),
    fee_head: positiveId(value.fee_head, 'Fee Head ID'),
    id: positiveId(value.id, 'Structure Item ID'),
    is_mandatory: value.is_mandatory,
    school_class: positiveId(value.school_class, 'Class ID'),
  };
}

function mapItem(dto: FeeStructureItemDto): CurrentFeeStructureItem {
  return {
    amountPaise: parseFeeAmountDto(dto.amount),
    classId: String(dto.school_class),
    createdAt: dto.created_at,
    feeHeadId: String(dto.fee_head),
    id: String(dto.id),
    mandatory: dto.is_mandatory,
  };
}

export function parseFeeHeadList(value: unknown): CurrentFeeHead[] {
  const items = envelope(value, 'fee_heads');
  if (!Array.isArray(items)) malformed('The server returned an invalid Fee Head list.');
  return items.map(readHead).map(mapHead);
}

export function parseFeeHead(value: unknown): CurrentFeeHead {
  return mapHead(readHead(envelope(value, 'fee_head')));
}

export function parseFeeStructureItemList(value: unknown): CurrentFeeStructureItem[] {
  const items = envelope(value, 'fee_structure_items');
  if (!Array.isArray(items)) malformed('The server returned an invalid Structure Item list.');
  return items.map(readItem).map(mapItem);
}

export function parseFeeStructureItem(value: unknown): CurrentFeeStructureItem {
  return mapItem(readItem(envelope(value, 'fee_structure_item')));
}

function mapHeadWrite(input: CreateCurrentFeeHeadInput | UpdateCurrentFeeHeadInput): FeeHeadWriteRequestDto {
  const name = input.name.trim();
  if (!name || name.length > 100) validation('Name must contain 1 to 100 characters.', 'name');
  return {
    frequency: input.frequency === 'MONTHLY' ? 'monthly' : 'one_time',
    name,
  };
}

export const mapCreateFeeHeadRequest = mapHeadWrite;
export const mapUpdateFeeHeadRequest = mapHeadWrite;

export function mapCreateFeeStructureItemRequest(
  input: CreateCurrentFeeStructureItemInput,
): FeeStructureItemCreateRequestDto {
  return {
    amount: feePaiseToDto(input.amountPaise),
    fee_head: feeRequestId(input.feeHeadId, 'feeHeadId'),
    is_mandatory: input.mandatory,
    school_class: feeRequestId(input.classId, 'classId'),
  };
}

export function mapUpdateFeeStructureItemRequest(
  input: UpdateCurrentFeeStructureItemInput,
): FeeStructureItemUpdateRequestDto {
  const result: FeeStructureItemUpdateRequestDto = {};
  if (input.amountPaise !== undefined) result.amount = feePaiseToDto(input.amountPaise);
  if (input.mandatory !== undefined) result.is_mandatory = input.mandatory;
  if (Object.keys(result).length === 0) validation('No Structure Item changes were supplied.', 'item');
  return result;
}

const FEE_FIELD_MAP: Record<string, string> = {
  amount: 'amount',
  fee_head: 'feeHeadId',
  frequency: 'frequency',
  is_active: 'status',
  is_mandatory: 'mandatory',
  name: 'name',
  school_class: 'classId',
};

export function mapFeeConfigurationFieldErrors(
  errors?: Record<string, string>,
): Record<string, string> | undefined {
  if (!errors) return undefined;
  return Object.fromEntries(
    Object.entries(errors).map(([key, message]) => [FEE_FIELD_MAP[key] ?? key, message]),
  );
}
