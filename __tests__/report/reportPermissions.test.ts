import { getEffectivePermissions } from '../../src/utils/effectivePermissions';
import * as access from '../../src/utils/reportPermissions';
import { getBaseRoleDefinition } from '../../src/services/userManagement/roleDefinitions';

describe('Report permissions', () => {
  it('grants School Admin the complete Report Center', () => {
    const permissions = getEffectivePermissions('SCHOOL_ADMIN');
    expect(access.canViewReportsDashboard(permissions)).toBe(true);
    expect(access.canViewStudentReports(permissions)).toBe(true);
    expect(access.canViewFeeReports(permissions)).toBe(true);
    expect(access.canViewCollectionReports(permissions)).toBe(true);
    expect(access.canViewExaminationReports(permissions)).toBe(true);
    expect(access.canViewCommunicationReports(permissions)).toBe(true);
    expect(access.canViewAuditReports(permissions)).toBe(true);
    expect(access.canExportFeeReports(permissions)).toBe(true);
    expect(access.canExportExaminationReports(permissions)).toBe(true);
  });

  it('gives Accountant finance reports/exports but no Examination reports', () => {
    const permissions = getEffectivePermissions('ACCOUNTANT');
    expect(access.canViewReportsDashboard(permissions)).toBe(true);
    expect(access.canViewFeeReports(permissions)).toBe(true);
    expect(access.canViewCollectionReports(permissions)).toBe(true);
    expect(access.canViewExportHistory(permissions)).toBe(true);
    expect(access.canExportFeeReports(permissions)).toBe(true);
    expect(access.canViewExaminationReports(permissions)).toBe(false);
    expect(access.canExportExaminationReports(permissions)).toBe(false);
  });

  it('keeps Parent, Student, and default Receptionist out of Report Center routes', () => {
    ['PARENT', 'STUDENT', 'RECEPTIONIST'].forEach(role => {
      expect(
        access.canViewReportsDashboard(
          getEffectivePermissions(role as 'PARENT'),
        ),
      ).toBe(false);
    });
    expect(
      getBaseRoleDefinition('RECEPTIONIST').configurablePermissions,
    ).toEqual(
      expect.arrayContaining([
        'reports.dashboard.view',
        'reports.students.view',
        'fee_reports.view',
      ]),
    );
    expect(
      getBaseRoleDefinition('RECEPTIONIST').prohibitedPermissions,
    ).toContain('fee_reports.export');
  });
});
