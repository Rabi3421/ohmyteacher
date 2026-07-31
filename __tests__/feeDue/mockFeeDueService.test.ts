import type { PreviewFeeGenerationInput } from '../../src/models/feeDue';
import {
  mockFeeDueService,
  resetMockFeeDueData,
} from '../../src/services/feeDue/mockFeeDueService';
import {
  mockFeeSetupService,
  resetMockFeeSetupData,
} from '../../src/services/feeSetup/mockFeeSetupService';

const schoolId = 'school-omt';
const input: PreviewFeeGenerationInput = {
  academicSessionId: 'session-school-omt-current',
  asOfDate: '2026-07-31',
  branchId: 'branch-main',
  classIds: ['class-omt-c01'],
  feeHeadIds: [],
  feeScope: 'RECURRING',
  generationType: 'CLASS',
  includePreviousEligiblePeriods: false,
  requestedByUserId: 'user-school-admin',
  requestedPeriodKeys: ['2026-09'],
  schoolId,
  sectionIds: [],
  studentIds: [],
};

async function finish<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  for (let index = 0; index < 20 && !settled; index += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockFeeSetupData();
  resetMockFeeDueData();
});
afterEach(() => jest.useRealTimers());

describe('mock Fee Due service', () => {
  it('returns a deterministic outstanding summary', async () => {
    const response = await finish(
      mockFeeDueService.getOutstandingSummary(
        schoolId,
        'branch-main',
        'session-school-omt-current',
        '2026-07-31',
      ),
    );
    expect(response.data.totalOutstandingPaise).toBeGreaterThan(0);
    expect(response.data.asOfDate).toBe('2026-07-31');
    expect(response.data.studentsWithOutstanding).toBeGreaterThan(0);
  });

  it('creates a mutation-free generation preview with snapshots', async () => {
    const before = await finish(
      mockFeeDueService.getFeeDues(schoolId, {
        academicSessionId: input.academicSessionId,
        asOfDate: input.asOfDate,
        branchId: input.branchId,
      }),
    );
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    const after = await finish(
      mockFeeDueService.getFeeDues(schoolId, {
        academicSessionId: input.academicSessionId,
        asOfDate: input.asOfDate,
        branchId: input.branchId,
      }),
    );
    expect(preview.data.newDueCount).toBeGreaterThan(0);
    expect(
      preview.data.items.find(item => item.status === 'NEW')?.snapshot,
    ).toMatchObject({
      academicSessionId: input.academicSessionId,
      schoolId,
    });
    expect(after.data.totalItems).toBe(before.data.totalItems);
  });

  it('commits a preview and records a Generation Run', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    const committed = await finish(
      mockFeeDueService.commitFeeGeneration(schoolId, {
        previewId: preview.data.previewId,
        requestedByUserId: input.requestedByUserId,
        schoolId,
      }),
    );
    expect(committed.data.createdCount).toBe(preview.data.newDueCount);
    const run = await finish(
      mockFeeDueService.getGenerationRun(
        schoolId,
        committed.data.generationRunId,
      ),
    );
    expect(run.data.run.totalGeneratedAmountPaise).toBe(
      preview.data.totalAmountPaise,
    );
  });

  it('generates one-time Fee Dues from their stable period', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: ['class-omt-c01'],
        feeScope: 'ONE_TIME',
        requestedPeriodKeys: ['ONE_TIME-FEE-HEAD-ADMISSION'],
      }),
    );
    expect(
      preview.data.items.some(
        item =>
          item.feeHeadId === 'fee-head-admission' &&
          item.periodType === 'ONE_TIME',
      ),
    ).toBe(true);
  });

  it('generates quarterly, half-yearly, yearly, and installment schedules', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: ['class-omt-c02'],
        generationType: 'FULL_SESSION',
        requestedPeriodKeys: [],
      }),
    );
    const types = preview.data.items
      .filter(item => item.status === 'NEW')
      .map(item => item.periodType);
    expect(types).toEqual(
      expect.arrayContaining([
        'QUARTER',
        'HALF_YEAR',
        'YEAR',
        'INSTALLMENT',
      ]),
    );
  });

  it('generates for a selected Student without including classmates', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: [],
        generationType: 'INDIVIDUAL_STUDENT',
        studentIds: ['student-rahul'],
      }),
    );
    expect(
      preview.data.items.every(item => item.studentId === 'student-rahul'),
    ).toBe(true);
  });

  it('reports missing assignments and inactive Students as skips', async () => {
    const missing = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: [],
        generationType: 'INDIVIDUAL_STUDENT',
        studentIds: ['student-isha'],
      }),
    );
    expect(missing.data.items[0].reason).toContain('Assignment is missing');
    const inactive = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: [],
        generationType: 'INDIVIDUAL_STUDENT',
        studentIds: ['student-kabir'],
      }),
    );
    expect(inactive.data.items[0].reason).toContain('inactive');
  });

  it('keeps transferred enrollment candidates enrollment-specific', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, {
        ...input,
        classIds: [],
        generationType: 'INDIVIDUAL_STUDENT',
        requestedPeriodKeys: ['2026-06'],
        studentIds: ['student-saanvi'],
      }),
    );
    expect(
      new Set(preview.data.items.map(item => item.enrollmentId)).size,
    ).toBeGreaterThan(1);
    expect(
      preview.data.items.every(item => item.status === 'SKIPPED'),
    ).toBe(true);
  });

  it('prevents duplicate commit of the same preview', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    await finish(
      mockFeeDueService.commitFeeGeneration(schoolId, {
        previewId: preview.data.previewId,
        requestedByUserId: input.requestedByUserId,
        schoolId,
      }),
    );
    await expect(
      finish(
        mockFeeDueService.commitFeeGeneration(schoolId, {
          previewId: preview.data.previewId,
          requestedByUserId: input.requestedByUserId,
          schoolId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_GENERATION_PREVIEW' });
  });

  it('marks already generated candidates as existing', async () => {
    const first = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    await finish(
      mockFeeDueService.commitFeeGeneration(schoolId, {
        previewId: first.data.previewId,
        requestedByUserId: input.requestedByUserId,
        schoolId,
      }),
    );
    const second = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    expect(second.data.newDueCount).toBe(0);
    expect(second.data.existingDueCount).toBeGreaterThan(0);
  });

  it('preserves generated snapshots after Fee Structure changes', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    const committed = await finish(
      mockFeeDueService.commitFeeGeneration(schoolId, {
        previewId: preview.data.previewId,
        requestedByUserId: input.requestedByUserId,
        schoolId,
      }),
    );
    const dueId = committed.data.items.find(
      item => item.status === 'CREATED',
    )?.feeDueId!;
    const before = await finish(
      mockFeeDueService.getFeeDue(schoolId, dueId),
    );
    const structure = await finish(
      mockFeeSetupService.getFeeStructure(
        schoolId,
        input.branchId,
        input.academicSessionId,
        'fee-structure-c01-active',
      ),
    );
    await finish(
      mockFeeSetupService.updateFeeStructure(
        schoolId,
        input.branchId,
        input.academicSessionId,
        structure.data.id,
        {
          classId: structure.data.classId,
          description: structure.data.description,
          effectiveFrom: structure.data.effectiveFrom,
          items: structure.data.items.map(
            ({
              feeHeadName: _feeHeadName,
              feeStructureId: _feeStructureId,
              id: _id,
              ...feeItem
            }) => ({
              ...feeItem,
              amount:
                feeItem.feeHeadId === 'fee-head-tuition'
                  ? 900
                  : feeItem.amount,
            }),
          ),
          name: structure.data.name,
          status: 'ACTIVE',
        },
      ),
    );
    const after = await finish(
      mockFeeDueService.getFeeDue(schoolId, dueId),
    );
    expect(before.data.item.due.baseAmountPaise).toBe(80_000);
    expect(after.data.item.due.baseAmountPaise).toBe(80_000);
  });

  it('rolls back commit when a critical snapshot relationship changed', async () => {
    const preview = await finish(
      mockFeeDueService.previewFeeGeneration(schoolId, input),
    );
    const before = await finish(
      mockFeeDueService.getFeeDues(schoolId, {
        asOfDate: input.asOfDate,
      }),
    );
    const structure = await finish(
      mockFeeSetupService.getFeeStructure(
        schoolId,
        input.branchId,
        input.academicSessionId,
        'fee-structure-c01-active',
      ),
    );
    await finish(
      mockFeeSetupService.updateFeeStructure(
        schoolId,
        input.branchId,
        input.academicSessionId,
        structure.data.id,
        {
          classId: structure.data.classId,
          description: structure.data.description,
          effectiveFrom: structure.data.effectiveFrom,
          items: structure.data.items
            .filter(item => item.feeHeadId !== 'fee-head-tuition')
            .map(
              ({
                feeHeadName: _feeHeadName,
                feeStructureId: _feeStructureId,
                id: _id,
                ...feeItem
              }) => feeItem,
            ),
          name: structure.data.name,
          status: 'ACTIVE',
        },
      ),
    );
    await expect(
      finish(
        mockFeeDueService.commitFeeGeneration(schoolId, {
          previewId: preview.data.previewId,
          requestedByUserId: input.requestedByUserId,
          schoolId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FEE_GENERATION_SNAPSHOT_INVALID' });
    const after = await finish(
      mockFeeDueService.getFeeDues(schoolId, {
        asOfDate: input.asOfDate,
      }),
    );
    expect(after.data.totalItems).toBe(before.data.totalItems);
  });

  it('rejects generation in a closed session', async () => {
    await expect(
      finish(
        mockFeeDueService.previewFeeGeneration(schoolId, {
          ...input,
          academicSessionId: 'session-school-omt-closed',
          classIds: ['class-omt-closed-c05'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'FEE_DUE_SESSION_CLOSED' });
  });

  it('rejects cross-school, cross-branch, and cross-session selection IDs', async () => {
    await expect(
      finish(
        mockFeeDueService.previewFeeGeneration(schoolId, {
          ...input,
          classIds: ['class-greenfield-c01'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_GENERATION_CLASS' });
    await expect(
      finish(
        mockFeeDueService.previewFeeGeneration(schoolId, {
          ...input,
          classIds: ['class-omt-next-c01'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_GENERATION_CLASS' });
    await expect(
      finish(
        mockFeeDueService.previewFeeGeneration(schoolId, {
          ...input,
          branchId: 'branch-school-greenfield-main',
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FEE_DUE_BRANCH' });
  });

  it('derives list status from the requested as-of date', async () => {
    const response = await finish(
      mockFeeDueService.getFeeDues(schoolId, {
        asOfDate: '2026-08-11',
        studentId: 'student-rahul',
      }),
    );
    expect(
      response.data.items.find(item => item.due.id === 'due-rahul-august')
        ?.due.status,
    ).toBe('OVERDUE');
  });

  it('filters and recomputes student totals by academic session', async () => {
    const current = await finish(
      mockFeeDueService.getStudentFeeDues(schoolId, 'student-rahul', {
        academicSessionId: 'session-school-omt-current',
        asOfDate: '2026-07-31',
      }),
    );
    const all = await finish(
      mockFeeDueService.getStudentFeeDues(schoolId, 'student-rahul', {
        academicSessionId: 'ALL',
        asOfDate: '2026-07-31',
      }),
    );
    expect(
      current.data.dues.every(
        item =>
          item.due.academicSessionId ===
          'session-school-omt-current',
      ),
    ).toBe(true);
    expect(all.data.totalGeneratedPaise).toBeGreaterThan(
      current.data.totalGeneratedPaise,
    );
  });

  it('previews and refreshes Fine from its stored snapshot', async () => {
    const preview = await finish(
      mockFeeDueService.calculateFinePreview(
        schoolId,
        'due-rahul-june-daily',
        '2026-07-15',
      ),
    );
    const refreshed = await finish(
      mockFeeDueService.refreshFeeDueFine(
        schoolId,
        'due-rahul-june-daily',
        '2026-07-15',
        'user-school-admin',
      ),
    );
    expect(refreshed.data.item.due.fineAmountPaise).toBe(
      preview.data.fineAmountPaise,
    );
    expect(
      refreshed.data.activities.some(
        activity => activity.action === 'FEE_FINE_REFRESHED',
      ),
    ).toBe(true);
  });

  it('bulk refreshes Fine without creating payments', async () => {
    const response = await finish(
      mockFeeDueService.bulkRefreshFines(schoolId, {
        academicSessionId: input.academicSessionId,
        asOfDate: '2026-07-20',
        branchId: input.branchId,
        feeDueIds: ['due-rahul-june-daily'],
        requestedByUserId: input.requestedByUserId,
      }),
    );
    expect(response.data.errorCount).toBe(0);
    expect(response.data.feeDueIds).toEqual([
      'due-rahul-june-daily',
    ]);
  });

  it('supports a full Fine waiver and reason validation', async () => {
    const response = await finish(
      mockFeeDueService.waiveFeeDueFine(
        schoolId,
        'due-rahul-june-daily',
        {
          amountPaise: 0,
          approvedByUserId: input.requestedByUserId,
          reason: 'Approved full Fine waiver',
          type: 'FULL_FINE',
        },
      ),
    );
    expect(response.data.item.due.fineWaivedAmountPaise).toBe(30_000);
    await expect(
      finish(
        mockFeeDueService.cancelFeeDue(
          schoolId,
          'due-rahul-august',
          {
            cancelledByUserId: input.requestedByUserId,
            reason: ' ',
          },
        ),
      ),
    ).rejects.toMatchObject({
      code: 'FEE_DUE_CANCELLATION_REASON_REQUIRED',
    });
  });

  it('records partial Fine waiver and preserves the accrued Fine', async () => {
    const response = await finish(
      mockFeeDueService.waiveFeeDueFine(
        schoolId,
        'due-rahul-june-daily',
        {
          amountPaise: 5_000,
          approvedByUserId: 'user-school-admin',
          reason: 'Approved correction',
          type: 'PARTIAL_FINE',
        },
      ),
    );
    expect(response.data.item.due.fineAmountPaise).toBe(30_000);
    expect(response.data.item.due.fineWaivedAmountPaise).toBe(5_000);
    expect(response.data.fineWaivers).toHaveLength(1);
  });

  it('rejects a Fine waiver greater than available Fine', async () => {
    await expect(
      finish(
        mockFeeDueService.waiveFeeDueFine(
          schoolId,
          'due-rahul-june-daily',
          {
            amountPaise: 50_000,
            approvedByUserId: 'user-school-admin',
            reason: 'Too much',
            type: 'PARTIAL_FINE',
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_FINE_WAIVER_AMOUNT' });
  });

  it('waives a whole Due without deleting its snapshot', async () => {
    const response = await finish(
      mockFeeDueService.waiveFeeDue(
        schoolId,
        'due-rahul-july-pending',
        {
          approvedByUserId: 'user-school-admin',
          reason: 'Approved full waiver',
        },
      ),
    );
    expect(response.data.item.due.status).toBe('WAIVED');
    expect(response.data.item.due.baseAmountPaise).toBe(80_000);
    expect(response.data.item.due.outstandingAmountPaise).toBe(0);
  });

  it('cancels a Due and keeps it readable in history', async () => {
    const response = await finish(
      mockFeeDueService.cancelFeeDue(
        schoolId,
        'due-rahul-july-pending',
        {
          cancelledByUserId: 'user-school-admin',
          reason: 'Incorrect period',
        },
      ),
    );
    expect(response.data.item.due.status).toBe('CANCELLED');
    const details = await finish(
      mockFeeDueService.getFeeDue(
        schoolId,
        'due-rahul-july-pending',
      ),
    );
    expect(details.data.item.due.cancellationReason).toBe(
      'Incorrect period',
    );
  });

  it('validates Parent ownership across linked children', async () => {
    const linked = await finish(
      mockFeeDueService.getParentStudentFees(
        schoolId,
        'membership-parent',
        'student-rahul',
        '2026-07-31',
      ),
    );
    expect(linked.data.studentId).toBe('student-rahul');
    await expect(
      finish(
        mockFeeDueService.getParentStudentFees(
          schoolId,
          'membership-parent',
          'student-aarav',
          '2026-07-31',
        ),
      ),
    ).rejects.toMatchObject({ code: 'PARENT_FEE_OWNERSHIP_DENIED' });
  });

  it('resolves Student self access from the membership', async () => {
    const response = await finish(
      mockFeeDueService.getStudentSelfFees(
        schoolId,
        'membership-student',
        '2026-07-31',
      ),
    );
    expect(response.data.studentId).toBe('student-arjun');
    await expect(
      finish(
        mockFeeDueService.getStudentSelfFees(
          schoolId,
          'membership-parent',
          '2026-07-31',
        ),
      ),
    ).rejects.toMatchObject({ code: 'STUDENT_FEE_OWNERSHIP_DENIED' });
  });
});
