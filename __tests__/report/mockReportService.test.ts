import type { ReportAccessContext } from '../../src/models/report';
import { REPORT_TYPES } from '../../src/models/report';
import { createMockReportService } from '../../src/services/report/mockReportService';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const admin: ReportAccessContext = {
  userId: 'admin',
  userName: 'Admin',
  membershipId: 'membership-admin',
  role: 'SCHOOL_ADMIN',
  permissionKeys: getEffectivePermissions('SCHOOL_ADMIN'),
  permittedBranchIds: [],
};
const branch: ReportAccessContext = {
  userId: 'branch',
  userName: 'Branch Admin',
  membershipId: 'membership-branch',
  role: 'BRANCH_ADMIN',
  permissionKeys: getEffectivePermissions('BRANCH_ADMIN'),
  permittedBranchIds: ['branch-main'],
};
const filters = {
  schoolId: 'school-omt',
  branchIds: ['branch-main'],
  academicSessionIds: ['session-school-omt-current'],
  asOfDate: '2026-07-31',
  access: admin,
};

describe('Mock Report service', () => {
  it('runs all 22 reports with metadata, warnings, typed rows, and stable ordering', async () => {
    const service = createMockReportService();
    for (const type of REPORT_TYPES) {
      const result = (await service.runReport('school-omt', type, filters))
        .data;
      expect(result.reportType).toBe(type);
      expect(result.metadata).toMatchObject({
        asOfDate: '2026-07-31',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      });
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.rows.map(item => item.title)).toEqual(
        result.rows
          .map(item => item.title)
          .slice()
          .sort(),
      );
    }
  });

  it('revalidates scope and rejects invalid date ranges', async () => {
    const service = createMockReportService();
    const scoped = (
      await service.runReport('school-omt', 'FEE_OUTSTANDING', {
        ...filters,
        access: branch,
        branchIds: ['branch-east', 'branch-main'],
      })
    ).data;
    expect(scoped.warnings[0]?.code).toBe('IGNORED_OUT_OF_SCOPE_FILTER');
    await expect(
      service.runReport('school-omt', 'FEE_OUTSTANDING', {
        ...filters,
        dateFrom: '2026-08-01',
        dateTo: '2026-07-01',
      }),
    ).rejects.toThrow('Date From');
  });

  it('owns saved filters by membership, archives instead of deleting, and keeps one default', async () => {
    const service = createMockReportService();
    const first = (
      await service.saveReportFilter('school-omt', {
        access: admin,
        reportType: 'FEE_OUTSTANDING',
        name: 'First',
        filters: { schoolId: 'school-omt' },
        isDefault: true,
      })
    ).data;
    await service.saveReportFilter('school-omt', {
      access: admin,
      reportType: 'FEE_OUTSTANDING',
      name: 'Second',
      filters: { schoolId: 'school-omt' },
      isDefault: true,
    });
    const values = (
      await service.getSavedFilters('school-omt', admin, 'FEE_OUTSTANDING')
    ).data;
    expect(values.filter(item => item.isDefault)).toHaveLength(1);
    expect(
      (
        await service.archiveSavedReportFilter('school-omt', first.id, {
          access: admin,
        })
      ).data.status,
    ).toBe('ARCHIVED');
  });

  it('previews without a job, then creates idempotent development jobs and advances lifecycle', async () => {
    const service = createMockReportService();
    const input = {
      reportType: 'FEE_OUTSTANDING' as const,
      format: 'CSV' as const,
      filters,
      clientRequestId: 'request-1',
    };
    const preview = (await service.previewExport('school-omt', input)).data;
    expect(preview.isDevelopmentMock).toBe(true);
    expect(
      (await service.getExportJobs('school-omt', { access: admin })).data
        .totalItems,
    ).toBe(0);
    const first = (await service.createExportJob('school-omt', input)).data;
    const duplicate = (await service.createExportJob('school-omt', input)).data;
    expect(duplicate.id).toBe(first.id);
    expect(
      (await service.getExportJob('school-omt', first.id, { access: admin }))
        .data.job.status,
    ).toBe('PROCESSING');
    const ready = (
      await service.getExportJob('school-omt', first.id, { access: admin })
    ).data.job;
    expect(ready.status).toBe('READY');
    expect(ready.documentUrl).toContain('mock-report://');
  });
});
