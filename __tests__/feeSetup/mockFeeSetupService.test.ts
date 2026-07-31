import type {
  CreateFeeHeadInput,
  CreateFeeStructureInput,
} from '../../src/models/fee';
import {
  mockFeeSetupService,
  resetMockFeeSetupData,
} from '../../src/services/feeSetup/mockFeeSetupService';

const schoolId = 'school-omt';
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId,
};
const head: CreateFeeHeadInput = {
  code: 'LAB',
  defaultFrequency: 'MONTHLY',
  displayOrder: 20,
  mandatoryByDefault: false,
  name: 'Laboratory Fee',
  refundable: false,
  status: 'ACTIVE',
  type: 'RECURRING',
};
const structure: CreateFeeStructureInput = {
  classId: 'class-omt-c04',
  effectiveFrom: '2026-04-01',
  items: [
    {
      amount: 900,
      applicability: 'ALL_STUDENTS',
      applicableMonths: [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
      displayOrder: 1,
      dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
      feeHeadId: 'fee-head-tuition',
      frequency: 'MONTHLY',
      mandatory: true,
      status: 'ACTIVE',
    },
  ],
  name: 'Class 4 Fees',
  status: 'DRAFT',
};

async function finish<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}
async function sequence<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.finally(() => {
    settled = true;
  });
  for (let i = 0; i < 12 && !settled; i += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockFeeSetupData();
});
afterEach(() => jest.useRealTimers());

describe('mock Fee Setup service', () => {
  it('lists, searches, and filters Fee Heads', async () => {
    const list = await finish(mockFeeSetupService.getFeeHeads(schoolId, {}));
    expect(list.data.totalItems).toBe(10);
    const search = await finish(
      mockFeeSetupService.getFeeHeads(schoolId, {
        search: 'transport',
        type: 'RECURRING',
      }),
    );
    expect(search.data.items[0].code).toBe('TRN');
  });
  it('creates and updates a normalized Fee Head', async () => {
    const created = await finish(
      mockFeeSetupService.createFeeHead(schoolId, head),
    );
    expect(created.data.code).toBe('LAB');
    const updated = await finish(
      mockFeeSetupService.updateFeeHead(schoolId, created.data.id, {
        ...head,
        name: 'Science Laboratory Fee',
      }),
    );
    expect(updated.data.name).toBe('Science Laboratory Fee');
  });
  it('rejects duplicate Fee Head name and code', async () => {
    await expect(
      finish(
        mockFeeSetupService.createFeeHead(schoolId, {
          ...head,
          code: 'TUI',
        }),
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_FEE_HEAD_CODE' });
    await expect(
      finish(
        mockFeeSetupService.createFeeHead(schoolId, {
          ...head,
          name: 'Tuition Fee',
        }),
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_FEE_HEAD_NAME' });
  });
  it('validates Fee Head type and frequency compatibility', async () => {
    await expect(
      finish(
        mockFeeSetupService.createFeeHead(schoolId, {
          ...head,
          defaultFrequency: 'MONTHLY',
          type: 'ONE_TIME',
        }),
      ),
    ).rejects.toMatchObject({ code: 'FEE_VALIDATION_ERROR' });
  });
  it('protects active Fee Head references from deactivation', async () => {
    await expect(
      finish(
        mockFeeSetupService.updateFeeHeadStatus(
          schoolId,
          'fee-head-tuition',
          'INACTIVE',
        ),
      ),
    ).rejects.toMatchObject({ code: 'FEE_HEAD_IN_USE' });
  });
  it('protects Fee Heads from cross-school IDs', async () => {
    await expect(
      finish(
        mockFeeSetupService.getFeeHead(
          'school-greenfield',
          'fee-head-tuition',
        ),
      ),
    ).rejects.toMatchObject({ code: 'FEE_HEAD_NOT_FOUND' });
  });
  it('creates an atomic draft with multiple items', async () => {
    const response = await finish(
      mockFeeSetupService.createFeeStructure(
        schoolId,
        context.branchId,
        context.academicSessionId,
        {
          ...structure,
          items: [
            ...structure.items,
            {
              amount: 250,
              applicability: 'OPTIONAL_SELECTION',
              applicableMonths: [4, 5, 6],
              displayOrder: 2,
              dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
              feeHeadId: 'fee-head-transport',
              frequency: 'MONTHLY',
              mandatory: false,
              status: 'ACTIVE',
            },
          ],
        },
      ),
    );
    expect(response.data.status).toBe('DRAFT');
    expect(response.data.items).toHaveLength(2);
  });
  it('rejects duplicate items and invalid class context', async () => {
    await expect(
      finish(
        mockFeeSetupService.createFeeStructure(
          schoolId,
          context.branchId,
          context.academicSessionId,
          { ...structure, items: [structure.items[0], structure.items[0]] },
        ),
      ),
    ).rejects.toMatchObject({ code: 'FEE_VALIDATION_ERROR' });
    await expect(
      finish(
        mockFeeSetupService.createFeeStructure(
          schoolId,
          context.branchId,
          context.academicSessionId,
          { ...structure, classId: 'class-greenfield-c01' },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_CLASS' });
  });
  it('makes closed-session structure mutation read-only', async () => {
    await expect(
      finish(
        mockFeeSetupService.createFeeStructure(
          schoolId,
          'branch-main',
          'session-school-omt-closed',
          {
            ...structure,
            classId: 'class-omt-closed-c05',
            effectiveFrom: '2025-04-01',
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'FEE_SESSION_CLOSED' });
  });
  it('activates, updates, deactivates, and detects active conflicts', async () => {
    const created = await finish(
      mockFeeSetupService.createFeeStructure(
        schoolId,
        context.branchId,
        context.academicSessionId,
        structure,
      ),
    );
    const active = await finish(
      mockFeeSetupService.updateFeeStructureStatus(
        schoolId,
        context.branchId,
        context.academicSessionId,
        created.data.id,
        'ACTIVE',
      ),
    );
    expect(active.data.status).toBe('ACTIVE');
    const duplicate = mockFeeSetupService.createFeeStructure(
      schoolId,
      context.branchId,
      context.academicSessionId,
      { ...structure, status: 'ACTIVE' },
    );
    await expect(finish(duplicate)).rejects.toMatchObject({
      code: 'ACTIVE_FEE_STRUCTURE_CONFLICT',
    });
    const inactive = await finish(
      mockFeeSetupService.updateFeeStructureStatus(
        schoolId,
        context.branchId,
        context.academicSessionId,
        created.data.id,
        'INACTIVE',
      ),
    );
    expect(inactive.data.status).toBe('INACTIVE');
  });
  it('copies a Fee Structure as a draft', async () => {
    const response = await sequence(
      mockFeeSetupService.copyFeeStructure(schoolId, {
        effectiveFrom: '2026-04-01',
        name: 'Class 4 Copy',
        sourceFeeStructureId: 'fee-structure-c01-active',
        targetAcademicSessionId: context.academicSessionId,
        targetBranchId: context.branchId,
        targetClassId: 'class-omt-c04',
      }),
    );
    expect(response.data.status).toBe('DRAFT');
  });
  it('excludes inactive historical Fee Heads from a copied draft', async () => {
    const response = await sequence(
      mockFeeSetupService.copyFeeStructure(schoolId, {
        effectiveFrom: '2026-04-01',
        name: 'Historical Copy',
        sourceFeeStructureId: 'fee-structure-c01-inactive',
        targetAcademicSessionId: context.academicSessionId,
        targetBranchId: context.branchId,
        targetClassId: 'class-omt-c04',
      }),
    );
    expect(response.data.items.some(item => item.feeHeadId === 'fee-head-custom')).toBe(false);
    expect(response.message).toContain('inactive Fee Head');
  });
  it('rejects an inactive or cross-school Fine Rule attachment', async () => {
    const response = await finish(
      mockFeeSetupService.createFineRule(schoolId, {
        code: 'OFF',
        fixedAmount: 10,
        graceDays: 0,
        name: 'Inactive Fine',
        status: 'INACTIVE',
        type: 'FIXED_AFTER_DUE',
      }),
    );
    await expect(
      finish(
        mockFeeSetupService.createFeeStructure(
          schoolId,
          context.branchId,
          context.academicSessionId,
          {
            ...structure,
            items: [{ ...structure.items[0], fineRuleId: response.data.id }],
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FINE_RULE' });
  });
  it('returns structure and effective fee previews', async () => {
    const details = await finish(
      mockFeeSetupService.getFeeStructure(
        schoolId,
        context.branchId,
        context.academicSessionId,
        'fee-structure-c01-active',
      ),
    );
    expect(details.data.items.length).toBeGreaterThan(1);
    const preview = await finish(
      mockFeeSetupService.previewStudentPayable(schoolId, {
        amountOverrides: [],
        discountAssignments: [],
        enrollmentId: 'enrollment-student-rahul-current',
        feeStructureId: 'fee-structure-c01-active',
        optionalItemSelections: [],
        studentId: 'student-rahul',
      }),
    );
    expect(preview.data.title).toBe('Estimated Fee Configuration');
  });
  it('bulk assigns defaults and skips existing customized assignments', async () => {
    const response = await finish(
      mockFeeSetupService.assignDefaultFeeStructure(schoolId, {
        ...context,
        classId: 'class-omt-c02',
        effectiveFrom: '2026-04-01',
        feeStructureId: 'fee-structure-c02-active',
      }),
    );
    expect(response.data.skipped).toBeGreaterThanOrEqual(1);
    expect(response.data.assigned).toBeGreaterThanOrEqual(1);
  });
  it('updates optional selection, custom override, and discount assignment', async () => {
    const response = await finish(
      mockFeeSetupService.updateStudentFeeAssignment(
        schoolId,
        'student-rahul',
        'enrollment-student-rahul-current',
        {
          amountOverrides: [
            {
              customAmount: 500,
              effectiveFrom: '2026-04-01',
              feeStructureItemId:
                'fee-structure-c01-active-transport',
              reason: 'Long route',
              type: 'CUSTOM_AMOUNT',
            },
          ],
          approvedByUserId: 'admin',
          discountAssignments: [
            {
              discountDefinitionId: 'discount-scholarship',
              effectiveFrom: '2026-04-01',
              feeHeadIds: ['fee-head-tuition'],
              reason: 'Approved',
              status: 'ACTIVE',
            },
          ],
          effectiveFrom: '2026-04-01',
          feeStructureId: 'fee-structure-c01-active',
          optionalItemSelections: [
            {
              effectiveFrom: '2026-04-01',
              feeStructureItemId:
                'fee-structure-c01-active-transport',
              selected: true,
            },
          ],
        },
      ),
    );
    expect(response.data.assignment?.amountOverrides[0].customAmount).toBe(500);
    expect(response.data.preview?.discountAmountPaise).toBeGreaterThan(0);
    const second = await finish(
      mockFeeSetupService.updateStudentFeeAssignment(
        schoolId,
        'student-rahul',
        'enrollment-student-rahul-current',
        {
          amountOverrides: [],
          approvedByUserId: 'admin',
          discountAssignments: [],
          effectiveFrom: '2026-05-01',
          feeStructureId: 'fee-structure-c01-active',
          optionalItemSelections: [],
        },
      ),
    );
    expect(second.data.assignment?.amountOverrideHistory).toHaveLength(1);
    expect(second.data.assignment?.discountAssignmentHistory).toHaveLength(1);
  });
  it('filters assignments by a selected optional Fee Head', async () => {
    const response = await finish(
      mockFeeSetupService.getStudentFeeAssignments(
        schoolId,
        context.branchId,
        context.academicSessionId,
        { optionalFeeHeadId: 'fee-head-transport' },
      ),
    );
    expect(response.data.items.length).toBeGreaterThan(0);
    expect(response.data.items.every(item => item.selectedOptionalCount > 0)).toBe(true);
  });
  it('returns closed-session historical assignments as read-only records', async () => {
    const list = await finish(
      mockFeeSetupService.getStudentFeeAssignments(
        schoolId,
        context.branchId,
        'session-school-omt-closed',
        {},
      ),
    );
    expect(list.data.items.some(item => item.studentId === 'student-rahul')).toBe(true);
    const details = await finish(
      mockFeeSetupService.getStudentFeeAssignment(
        schoolId,
        'student-rahul',
        'enrollment-student-rahul-previous',
      ),
    );
    expect(details.data.assignment?.status).toBe('INACTIVE');
  });
  it('protects mandatory exemptions without elevated permission', async () => {
    const request = mockFeeSetupService.updateStudentFeeAssignment(
      schoolId,
      'student-rahul',
      'enrollment-student-rahul-current',
      {
        amountOverrides: [
          {
            effectiveFrom: '2026-04-01',
            feeStructureItemId: 'fee-structure-c01-active-tuition',
            reason: 'Waiver',
            type: 'EXEMPT',
          },
        ],
        approvedByUserId: 'admin',
        discountAssignments: [],
        effectiveFrom: '2026-04-01',
        feeStructureId: 'fee-structure-c01-active',
        optionalItemSelections: [],
      },
    );
    await expect(finish(request)).rejects.toMatchObject({
      code: 'FEE_EXEMPTION_PERMISSION_REQUIRED',
    });
  });
  it('rejects transferred and mismatched enrollment assignment', async () => {
    await expect(
      finish(
        mockFeeSetupService.getStudentFeeAssignment(
          schoolId,
          'student-saanvi',
          'enrollment-student-saanvi-before-transfer',
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_ENROLLMENT' });
  });
  it('rejects cross-branch Fee Structure access', async () => {
    await expect(
      finish(
        mockFeeSetupService.getFeeStructures(
          schoolId,
          'branch-greenfield-puri',
          context.academicSessionId,
          {},
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_BRANCH' });
  });
  it('validates, creates, and protects Discount Definitions', async () => {
    const created = await finish(
      mockFeeSetupService.createDiscountDefinition(schoolId, {
        applicableFeeHeadIds: ['fee-head-tuition'],
        category: 'MERIT',
        code: 'MER10',
        maximumAmount: 100,
        name: 'Merit 10%',
        reasonRequired: true,
        startDate: '2026-04-01',
        status: 'ACTIVE',
        type: 'PERCENTAGE',
        value: 10,
      }),
    );
    expect(created.data.maximumAmount).toBe(100);
    await expect(
      finish(
        mockFeeSetupService.createDiscountDefinition(schoolId, {
          applicableFeeHeadIds: ['fee-head-tuition'],
          category: 'MERIT',
          code: 'BAD',
          endDate: '2025-01-01',
          maximumAmount: 100,
          name: 'Bad Dates',
          reasonRequired: false,
          startDate: '2026-04-01',
          status: 'ACTIVE',
          type: 'PERCENTAGE',
          value: 10,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FEE_VALIDATION_ERROR' });
    await expect(
      finish(
        mockFeeSetupService.updateDiscountStatus(
          schoolId,
          'discount-sibling',
          'INACTIVE',
        ),
      ),
    ).rejects.toMatchObject({ code: 'DISCOUNT_IN_USE' });
  });
  it('rejects invalid discount assignment dates and Fee Head scope', async () => {
    const base = {
      amountOverrides: [],
      approvedByUserId: 'admin',
      effectiveFrom: '2026-04-01',
      feeStructureId: 'fee-structure-c01-active',
      optionalItemSelections: [],
    };
    await expect(
      finish(
        mockFeeSetupService.updateStudentFeeAssignment(
          schoolId,
          'student-rahul',
          'enrollment-student-rahul-current',
          {
            ...base,
            discountAssignments: [
              {
                discountDefinitionId: 'discount-scholarship',
                effectiveFrom: '2025-01-01',
                feeHeadIds: ['fee-head-tuition'],
                reason: 'Approved',
                status: 'ACTIVE',
              },
            ],
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DISCOUNT_PERIOD' });
    await expect(
      finish(
        mockFeeSetupService.updateStudentFeeAssignment(
          schoolId,
          'student-rahul',
          'enrollment-student-rahul-current',
          {
            ...base,
            discountAssignments: [
              {
                discountDefinitionId: 'discount-scholarship',
                effectiveFrom: '2026-04-01',
                feeHeadIds: ['fee-head-transport'],
                reason: 'Approved',
                status: 'ACTIVE',
              },
            ],
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DISCOUNT_FEE_HEAD' });
  });
  it('creates fixed/daily Fine Rules and validates overlapping slabs', async () => {
    const fixed = await finish(
      mockFeeSetupService.createFineRule(schoolId, {
        code: 'NEW50',
        fixedAmount: 50,
        graceDays: 2,
        name: 'New Fixed',
        status: 'ACTIVE',
        type: 'FIXED_AFTER_DUE',
      }),
    );
    expect(fixed.data.fixedAmount).toBe(50);
    const daily = await finish(
      mockFeeSetupService.createFineRule(schoolId, {
        code: 'NEW10D',
        dailyAmount: 10,
        graceDays: 2,
        maximumAmount: 200,
        name: 'New Daily',
        status: 'ACTIVE',
        type: 'DAILY_AFTER_DUE',
      }),
    );
    expect(daily.data.maximumAmount).toBe(200);
    await expect(
      finish(
        mockFeeSetupService.createFineRule(schoolId, {
          code: 'BADSLAB',
          graceDays: 0,
          name: 'Bad Slab',
          slabs: [
            { amount: 50, fromDay: 1, toDay: 10 },
            { amount: 100, fromDay: 10, toDay: 20 },
          ],
          status: 'ACTIVE',
          type: 'SLAB_BASED',
        }),
      ),
    ).rejects.toMatchObject({ code: 'FEE_VALIDATION_ERROR' });
  });
  it('protects a Fine Rule attached to an active item', async () => {
    await expect(
      finish(
        mockFeeSetupService.updateFineRuleStatus(
          schoolId,
          'fine-daily',
          'INACTIVE',
        ),
      ),
    ).rejects.toMatchObject({ code: 'FINE_RULE_IN_USE' });
  });
});
