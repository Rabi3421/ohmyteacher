import type {
  CreateDiscountDefinitionInput,
  CreateFeeHeadInput,
  CreateFeeStructureInput,
  CreateFineRuleInput,
  FeeHead,
} from '../models/fee';
import { isRequired } from './validation';

export type FeeFormErrors = Record<string, string>;

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export function getAcademicSessionMonths(
  startDate: string,
  endDate: string,
): number[] {
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
    return [];
  }
  const cursor = new Date(`${startDate.slice(0, 7)}-01T00:00:00.000Z`);
  const end = new Date(`${endDate.slice(0, 7)}-01T00:00:00.000Z`);
  const months: number[] = [];
  while (cursor <= end && months.length < 24) {
    const month = cursor.getUTCMonth() + 1;
    if (!months.includes(month)) months.push(month);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function validateFeeHead(input: CreateFeeHeadInput): FeeFormErrors {
  const errors: FeeFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Fee Head name is required.';
  if (!isRequired(input.code)) errors.code = 'Fee Head code is required.';
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 1) {
    errors.displayOrder = 'Display order must be a positive whole number.';
  }
  if (
    input.type === 'ONE_TIME' &&
    input.defaultFrequency !== 'ONE_TIME'
  ) {
    errors.defaultFrequency = 'One-time Fee Heads require ONE TIME frequency.';
  }
  if (
    input.type === 'RECURRING' &&
    input.defaultFrequency === 'ONE_TIME'
  ) {
    errors.defaultFrequency = 'Recurring Fee Heads require recurring frequency.';
  }
  return errors;
}

export function validateFeeStructure(
  input: CreateFeeStructureInput,
  heads: readonly FeeHead[],
  sessionStart?: string,
  sessionEnd?: string,
): FeeFormErrors {
  const errors: FeeFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Structure name is required.';
  if (!input.classId) errors.classId = 'Class is required.';
  if (!validDate(input.effectiveFrom)) {
    errors.effectiveFrom = 'Enter a valid effective date.';
  }
  if (input.items.length === 0) {
    errors.items = 'Add at least one Fee Structure Item.';
  }
  const used = new Set<string>();
  input.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    const head = heads.find(candidate => candidate.id === item.feeHeadId);
    if (!head || head.status !== 'ACTIVE') {
      errors[`${prefix}.feeHeadId`] = 'Select an active school Fee Head.';
    }
    if (used.has(item.feeHeadId)) {
      errors[`${prefix}.feeHeadId`] = 'A Fee Head can be added only once.';
    }
    used.add(item.feeHeadId);
    if (!Number.isFinite(item.amount) || item.amount <= 0) {
      errors[`${prefix}.amount`] = 'Amount must be greater than zero.';
    }
    if (!Number.isInteger(item.displayOrder) || item.displayOrder < 1) {
      errors[`${prefix}.displayOrder`] = 'Use a positive display order.';
    }
    if (head?.type === 'ONE_TIME' && item.frequency !== 'ONE_TIME') {
      errors[`${prefix}.frequency`] = 'One-time Fee Head requires ONE TIME.';
    }
    if (head?.type === 'RECURRING' && item.frequency === 'ONE_TIME') {
      errors[`${prefix}.frequency`] = 'Recurring Fee Head needs a recurring frequency.';
    }
    if (item.dueRule.type === 'FIXED_DAY_OF_PERIOD') {
      if (item.dueRule.day < 1 || item.dueRule.day > 28) {
        errors[`${prefix}.dueRule`] = 'Due day must be between 1 and 28.';
      }
    } else if (
      !validDate(item.dueRule.date) ||
      (sessionStart && item.dueRule.date < sessionStart) ||
      (sessionEnd && item.dueRule.date > sessionEnd)
    ) {
      errors[`${prefix}.dueRule`] = 'Due date must be inside the session.';
    }
    if (
      item.frequency === 'MONTHLY' &&
      (!item.applicableMonths?.length ||
        item.applicableMonths.some(month => month < 1 || month > 12) ||
        new Set(item.applicableMonths).size !== item.applicableMonths.length ||
        (sessionStart &&
          sessionEnd &&
          item.applicableMonths.some(
            month =>
              !getAcademicSessionMonths(sessionStart, sessionEnd).includes(
                month,
              ),
          )))
    ) {
      errors[`${prefix}.applicableMonths`] = 'Select valid session months.';
    }
    if (
      item.frequency !== 'MONTHLY' &&
      item.frequency !== 'ONE_TIME' &&
      item.installmentCount !== undefined &&
      (!Number.isInteger(item.installmentCount) || item.installmentCount < 1)
    ) {
      errors[`${prefix}.installmentCount`] =
        'Installment count must be a positive whole number.';
    }
  });
  return errors;
}

export function validateDiscount(
  input: CreateDiscountDefinitionInput,
): FeeFormErrors {
  const errors: FeeFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Discount name is required.';
  if (!isRequired(input.code)) errors.code = 'Discount code is required.';
  if (!Number.isFinite(input.value) || input.value <= 0) {
    errors.value = 'Discount value must be greater than zero.';
  }
  if (input.type === 'PERCENTAGE' && input.value > 100) {
    errors.value = 'Percentage cannot exceed 100.';
  }
  if (
    input.maximumAmount !== undefined &&
    (!Number.isFinite(input.maximumAmount) || input.maximumAmount <= 0)
  ) {
    errors.maximumAmount = 'Maximum amount must be positive.';
  }
  if (!validDate(input.startDate)) errors.startDate = 'Enter a valid start date.';
  if (
    input.endDate &&
    (!validDate(input.endDate) || input.endDate < input.startDate)
  ) {
    errors.endDate = 'End date must be after start date.';
  }
  return errors;
}

export function validateFineRule(input: CreateFineRuleInput): FeeFormErrors {
  const errors: FeeFormErrors = {};
  if (!isRequired(input.name)) errors.name = 'Fine Rule name is required.';
  if (!isRequired(input.code)) errors.code = 'Fine Rule code is required.';
  if (!Number.isInteger(input.graceDays) || input.graceDays < 0) {
    errors.graceDays = 'Grace days must be zero or a positive whole number.';
  }
  if (
    input.type === 'FIXED_AFTER_DUE' &&
    (!input.fixedAmount || input.fixedAmount <= 0)
  ) {
    errors.fixedAmount = 'Fixed amount must be positive.';
  }
  if (
    input.type === 'DAILY_AFTER_DUE' &&
    (!input.dailyAmount || input.dailyAmount <= 0)
  ) {
    errors.dailyAmount = 'Daily amount must be positive.';
  }
  if (
    input.maximumAmount !== undefined &&
    input.maximumAmount <= 0
  ) {
    errors.maximumAmount = 'Maximum amount must be positive.';
  }
  if (input.type === 'SLAB_BASED') {
    const slabs = [...(input.slabs ?? [])].sort(
      (a, b) => a.fromDay - b.fromDay,
    );
    if (!slabs.length) errors.slabs = 'Add at least one fine slab.';
    slabs.forEach((slab, index) => {
      if (
        slab.fromDay < 1 ||
        (slab.toDay !== undefined && slab.toDay < slab.fromDay) ||
        slab.amount < 0
      ) {
        errors.slabs = 'Fine slab ranges and amounts are invalid.';
      }
      const next = slabs[index + 1];
      if (next && (slab.toDay === undefined || slab.toDay >= next.fromDay)) {
        errors.slabs = 'Fine slab ranges cannot overlap.';
      }
    });
  }
  return errors;
}
