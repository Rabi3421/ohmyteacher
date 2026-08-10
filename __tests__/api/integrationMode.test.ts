import {
  MODULE_INTEGRATION_MODES,
  selectRepository,
  type ModuleIntegrationModes,
} from '../../src/services/integration/integrationMode';
import { liveAuthService } from '../../src/services/auth/liveAuthService';
import { resolveAuthService } from '../../src/services/auth/authServiceResolver';
import { livePlatformService } from '../../src/services/platform/livePlatformService';
import { resolvePlatformService } from '../../src/services/platform/platformServiceResolver';
import { mockOrganizationService } from '../../src/services/organization/mockOrganizationService';
import { apiAcademicService } from '../../src/services/academic/apiAcademicService';
import { resolveAcademicService } from '../../src/services/academic/academicServiceResolver';
import { mockAcademicService } from '../../src/services/academic/mockAcademicService';
import { liveCurrentOrganizationService } from '../../src/services/organization/liveCurrentOrganizationService';
import {
  resolveCurrentOrganizationService,
  resolveOrganizationService,
} from '../../src/services/organization/organizationServiceResolver';
import { liveBranchService } from '../../src/services/organization/liveBranchService';
import { resolveBranchService } from '../../src/services/organization/branchServiceResolver';
import { liveStaffUserService } from '../../src/services/userManagement/liveStaffUserService';
import { resolveStaffUserService } from '../../src/services/userManagement/staffUserServiceResolver';
import { mockUserManagementService } from '../../src/services/userManagement/mockUserManagementService';
import { resolveUserManagementService } from '../../src/services/userManagement/userManagementServiceResolver';

describe('module repository selection', () => {
  const implementations = {
    live: { source: 'live' },
    mock: { source: 'mock' },
    unsupported: { source: 'unsupported' },
  };

  function modes(
    mode: ModuleIntegrationModes['academics'],
  ): ModuleIntegrationModes {
    return { ...MODULE_INTEGRATION_MODES, academics: mode };
  }

  it.each(['mock', 'live', 'unsupported'] as const)(
    'selects %s explicitly without fallback',
    mode => {
      expect(
        selectRepository({
          ...implementations,
          modes: modes(mode),
          module: 'academics',
        }).source,
      ).toBe(mode);
    },
  );

  it('enables the confirmed Phase 22 fee-configuration boundaries without enabling later modules', () => {
    expect(MODULE_INTEGRATION_MODES.authentication).toBe('live');
    expect(MODULE_INTEGRATION_MODES.platform).toBe('live');
    Object.entries(MODULE_INTEGRATION_MODES)
      .filter(
        ([module]) =>
          ![
            'authentication',
            'platform',
            'organization',
            'branches',
            'staff',
            'academics',
            'academic-sessions',
            'academic-classes',
            'academic-sections',
            'academic-subjects',
            'teacher-assignments',
            'students',
            'student-admissions',
            'student-lifecycle',
            'student-self-service',
            'student-guardians',
            'student-enrolments',
            'fee-setup',
            'fee-heads',
            'fee-structures',
            'fee-structure-items',
            'fee-discounts',
            'fee-fines',
          ].includes(
            module,
          ),
      )
      .forEach(([, mode]) => expect(mode).toBe('mock'));
    expect(MODULE_INTEGRATION_MODES.students).toBe('live');
    expect(MODULE_INTEGRATION_MODES['student-admissions']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['student-lifecycle']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['student-self-service']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['student-guardians']).toBe('unsupported');
    expect(MODULE_INTEGRATION_MODES['student-enrolments']).toBe('unsupported');
    expect(MODULE_INTEGRATION_MODES['student-demo-identity']).toBe('mock');
    expect(MODULE_INTEGRATION_MODES['fee-setup']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['fee-heads']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['fee-structures']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['fee-structure-items']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['fee-discounts']).toBe('unsupported');
    expect(MODULE_INTEGRATION_MODES['fee-fines']).toBe('unsupported');
    expect(MODULE_INTEGRATION_MODES['fee-setup-demo']).toBe('mock');
    expect(MODULE_INTEGRATION_MODES['fee-dues']).toBe('mock');
  });

  it('resolves the authentication service to live with no mock fallback', () => {
    expect(resolveAuthService()).toBe(liveAuthService);
  });

  it('preserves the isolated organization and branch boundaries', () => {
    expect(resolvePlatformService()).toBe(livePlatformService);
    expect(resolveCurrentOrganizationService()).toBe(
      liveCurrentOrganizationService,
    );
    expect(resolveBranchService()).toBe(liveBranchService);
    expect(MODULE_INTEGRATION_MODES.organization).toBe('live');
    expect(MODULE_INTEGRATION_MODES.branches).toBe('live');
    expect(MODULE_INTEGRATION_MODES.academics).toBe('live');
    expect(resolveOrganizationService()).not.toBe(mockOrganizationService);
  });

  it('resolves live academic setup without mock fallback', () => {
    expect(resolveAcademicService().getClasses).not.toBe(mockAcademicService.getClasses);
    expect(apiAcademicService).toBeDefined();
    expect(MODULE_INTEGRATION_MODES['academic-sessions']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['academic-classes']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['academic-sections']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['academic-subjects']).toBe('live');
    expect(MODULE_INTEGRATION_MODES['teacher-assignments']).toBe('live');
  });

  it('resolves fixed-role staff live while configurable roles remain mock', () => {
    expect(MODULE_INTEGRATION_MODES.staff).toBe('live');
    expect(resolveStaffUserService()).toBe(liveStaffUserService);
    expect(resolveUserManagementService()).toBe(mockUserManagementService);
  });
});
