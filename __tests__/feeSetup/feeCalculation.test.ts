import type {
  DiscountDefinition,
  FeeStructure,
  StudentDiscountAssignment,
} from '../../src/models/fee';
import {
  calculateEffectiveFee,
  paiseToRupees,
  rupeesToPaise,
} from '../../src/utils/feeCalculation';
import { getAcademicSessionMonths } from '../../src/utils/feeValidation';

const structure: FeeStructure = {
  academicSessionId: 'session',
  academicSessionName: '2026-27',
  assignedStudentCount: 0,
  branchId: 'branch',
  branchName: 'Main',
  classId: 'class',
  className: 'Class 1',
  createdAt: '',
  effectiveFrom: '2026-04-01',
  id: 'structure',
  items: [
    {
      amount: 800,
      applicability: 'ALL_STUDENTS',
      applicableMonths: [4, 5],
      displayOrder: 1,
      dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
      feeHeadId: 'tuition',
      feeHeadName: 'Tuition',
      feeStructureId: 'structure',
      frequency: 'MONTHLY',
      id: 'tuition-item',
      mandatory: true,
      status: 'ACTIVE',
    },
    {
      amount: 300,
      applicability: 'OPTIONAL_SELECTION',
      applicableMonths: [4, 5],
      displayOrder: 2,
      dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
      feeHeadId: 'transport',
      feeHeadName: 'Transport',
      feeStructureId: 'structure',
      frequency: 'MONTHLY',
      id: 'transport-item',
      mandatory: false,
      status: 'ACTIVE',
    },
  ],
  name: 'Fees',
  schoolId: 'school',
  status: 'ACTIVE',
  totalNominalAmount: 1100,
  updatedAt: '',
};
const percentage: DiscountDefinition = {
  activeAssignmentCount: 1,
  applicableFeeHeadIds: ['tuition'],
  category: 'SCHOLARSHIP',
  code: 'P20',
  createdAt: '',
  id: 'percentage',
  name: '20 Percent',
  reasonRequired: false,
  schoolId: 'school',
  startDate: '2026-04-01',
  status: 'ACTIVE',
  type: 'PERCENTAGE',
  updatedAt: '',
  value: 20,
};
const fixed: DiscountDefinition = {
  ...percentage,
  applicableFeeHeadIds: [],
  code: 'F100',
  id: 'fixed',
  name: 'Fixed 100',
  type: 'FIXED',
  value: 100,
};
const assignment = (
  id: string,
): StudentDiscountAssignment => ({
  approvedByUserId: 'admin',
  createdAt: '',
  discountDefinitionId: id,
  effectiveFrom: '2026-04-01',
  feeHeadIds: [],
  id,
  status: 'ACTIVE',
  studentFeeAssignmentId: 'assignment',
});

function calculate(
  patch: Partial<Parameters<typeof calculateEffectiveFee>[0]> = {},
) {
  return calculateEffectiveFee({
    discountAssignments: [],
    discountDefinitions: [],
    overrides: [],
    selections: [],
    structure,
    ...patch,
  });
}

describe('Fee Setup calculation utility', () => {
  it('orders months using the actual academic session dates', () => {
    expect(getAcademicSessionMonths('2026-07-01', '2027-06-30')).toEqual([
      7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6,
    ]);
    expect(getAcademicSessionMonths('invalid', '2027-06-30')).toEqual([]);
  });
  it('calculates a monthly mandatory Fee Item', () => {
    expect(calculate().netConfiguredAmountPaise).toBe(80_000);
  });
  it('includes a selected optional Fee Item', () => {
    expect(
      calculate({
        selections: [
          {
            effectiveFrom: '',
            feeStructureItemId: 'transport-item',
            selected: true,
          },
        ],
      }).netConfiguredAmountPaise,
    ).toBe(110_000);
  });
  it('excludes an unselected optional Fee Item', () => {
    expect(calculate().lineItems[1].effectiveAmountPaise).toBe(0);
  });
  it('applies a custom amount without mutating the structure', () => {
    const preview = calculate({
      overrides: [
        {
          createdAt: '',
          customAmount: 500,
          effectiveFrom: '',
          feeStructureItemId: 'transport-item',
          id: 'override',
          reason: 'Route',
          type: 'CUSTOM_AMOUNT',
        },
      ],
      selections: [
        {
          effectiveFrom: '',
          feeStructureItemId: 'transport-item',
          selected: true,
        },
      ],
    });
    expect(preview.netConfiguredAmountPaise).toBe(130_000);
    expect(structure.items[1].amount).toBe(300);
  });
  it('supports an exemption', () => {
    expect(
      calculate({
        overrides: [
          {
            createdAt: '',
            effectiveFrom: '',
            feeStructureItemId: 'tuition-item',
            id: 'exempt',
            reason: 'Scholarship',
            type: 'EXEMPT',
          },
        ],
      }).netConfiguredAmountPaise,
    ).toBe(0);
  });
  it('applies a fixed discount', () => {
    expect(
      calculate({
        discountAssignments: [assignment('fixed')],
        discountDefinitions: [fixed],
      }).discountAmountPaise,
    ).toBe(10_000);
  });
  it('applies a scoped percentage discount', () => {
    expect(
      calculate({
        discountAssignments: [assignment('percentage')],
        discountDefinitions: [percentage],
      }).discountAmountPaise,
    ).toBe(16_000);
  });
  it('honors a percentage maximum cap', () => {
    expect(
      calculate({
        discountAssignments: [assignment('percentage')],
        discountDefinitions: [{ ...percentage, maximumAmount: 50 }],
      }).discountAmountPaise,
    ).toBe(5_000);
  });
  it('combines multiple discounts deterministically', () => {
    expect(
      calculate({
        discountAssignments: [assignment('percentage'), assignment('fixed')],
        discountDefinitions: [percentage, fixed],
      }).discountAmountPaise,
    ).toBe(26_000);
  });
  it('never returns a negative total', () => {
    expect(
      calculate({
        discountAssignments: [assignment('fixed')],
        discountDefinitions: [{ ...fixed, value: 50_000 }],
      }).netConfiguredAmountPaise,
    ).toBe(0);
  });
  it('uses stable integer-paise conversion', () => {
    expect(rupeesToPaise(10.1)).toBe(1010);
    expect(paiseToRupees(1010)).toBe(10.1);
  });
  it('returns detailed line-item output and month multiplication', () => {
    const preview = calculate({ selectedMonths: [4, 5] });
    expect(preview.lineItems).toHaveLength(2);
    expect(preview.lineItems[0].baseAmountPaise).toBe(160_000);
  });
  it('charges only applicable months in the selected period', () => {
    const preview = calculate({ selectedMonths: [3, 4] });
    expect(preview.lineItems[0].baseAmountPaise).toBe(80_000);
  });
});
