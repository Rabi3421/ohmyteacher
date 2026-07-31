import type { AppRole } from '../../constants/permissions';
import type { PermissionKey } from '../../constants/userPermissions';
import type { PaginatedResponse } from '../../models/common';
import type {
  CreateStaffMembershipInput,
  RoleDefinition,
  SchoolRoleConfiguration,
  StaffMembership,
  StaffRole,
  StaffUserDetails,
  StaffUserSummary,
  UserActivityAction,
  UserIdentity,
} from '../../models/userManagement';
import { INITIAL_BRANCHES, INITIAL_SCHOOLS } from '../organization/organizationFixtures';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { ApiClientError } from '../api/apiError';
import {
  SCHOOL_AUTH_FIXTURES,
  type AuthFixture,
} from '../auth/authFixtures';
import { mockDelay } from '../mock/mockDelay';
import { getBaseRoleDefinition } from './roleDefinitions';
import type { UserManagementService } from './userManagementService';
import {
  INITIAL_ROLE_CONFIGURATIONS,
  INITIAL_STAFF_MEMBERSHIPS,
  INITIAL_USER_ACTIVITY,
  INITIAL_USER_IDENTITIES,
  INITIAL_USER_SESSIONS,
} from './userManagementFixtures';

let identities: UserIdentity[] = [];
let memberships: StaffMembership[] = [];
let configurations: SchoolRoleConfiguration[] = [];
let sessions = [...INITIAL_USER_SESSIONS];
let activity = [...INITIAL_USER_ACTIVITY];
let sequence = 200;
const BASE_AUTH_FIXTURES = JSON.parse(
  JSON.stringify(SCHOOL_AUTH_FIXTURES),
) as Record<string, AuthFixture>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resetMockUserManagementData(): void {
  identities = clone(INITIAL_USER_IDENTITIES);
  memberships = clone(INITIAL_STAFF_MEMBERSHIPS);
  configurations = clone(INITIAL_ROLE_CONFIGURATIONS);
  sessions = clone(INITIAL_USER_SESSIONS);
  activity = clone(INITIAL_USER_ACTIVITY);
  sequence = 200;
  Object.keys(SCHOOL_AUTH_FIXTURES).forEach(key => {
    delete SCHOOL_AUTH_FIXTURES[key];
  });
  Object.assign(SCHOOL_AUTH_FIXTURES, clone(BASE_AUTH_FIXTURES));
  identities.forEach(identity => syncIdentityWithAuth(identity.id));
}

resetMockUserManagementData();

function success<T>(data: T, message = 'Success') {
  return { data: clone(data), message, success: true as const };
}

function fail(
  code: string,
  message: string,
  status = 409,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}

function findIdentity(userId: string): UserIdentity {
  return identities.find(item => item.id === userId) ??
    fail('USER_NOT_FOUND', 'User identity could not be found.', 404);
}

function findMembership(
  schoolId: string,
  membershipId: string,
): StaffMembership {
  return memberships.find(
    item => item.id === membershipId && item.schoolId === schoolId,
  ) ?? fail('MEMBERSHIP_NOT_FOUND', 'Staff membership could not be found.', 404);
}

function syncIdentityWithAuth(userId: string): void {
  const identity = identities.find(item => item.id === userId);
  if (!identity) return;
  const userMemberships = memberships.filter(item => item.userId === userId);
  if (userMemberships.length === 0) return;
  Object.keys(SCHOOL_AUTH_FIXTURES).forEach(key => {
    if (
      SCHOOL_AUTH_FIXTURES[key].user.id === userId &&
      key !== identity.mobile
    ) {
      delete SCHOOL_AUTH_FIXTURES[key];
    }
  });
  SCHOOL_AUTH_FIXTURES[identity.mobile] = {
    key:
      Object.values(BASE_AUTH_FIXTURES).find(
        fixture => fixture.user.id === userId,
      )?.key ?? `staff-${userId}`,
    memberships: userMemberships.map(item => {
      const school = INITIAL_SCHOOLS.find(
        candidate => candidate.id === item.schoolId,
      );
      const branch = INITIAL_BRANCHES.find(
        candidate => candidate.id === item.branchIds[0],
      );
      return {
        branchId: branch?.id,
        branchName: branch?.name,
        id: item.id,
        role: item.role,
        schoolCode: school?.code,
        schoolId: item.schoolId,
        schoolName: school?.name,
        status: item.status,
        userId,
      };
    }),
    user: {
      email: identity.email,
      id: identity.id,
      mobile: identity.mobile,
      name: identity.name,
      status: identity.status,
    },
  };
}

function getConfiguration(
  schoolId: string,
  role: AppRole,
): SchoolRoleConfiguration {
  return (
    configurations.find(
      item => item.schoolId === schoolId && item.role === role,
    ) ?? {
      disabledPermissions: [],
      enabledPermissions: [],
      role,
      schoolId,
      updatedAt: new Date().toISOString(),
    }
  );
}

function branchSummaries(schoolId: string, branchIds: string[]) {
  return INITIAL_BRANCHES.filter(
    branch => branch.schoolId === schoolId && branchIds.includes(branch.id),
  ).map(branch => ({ code: branch.code, id: branch.id, name: branch.name }));
}

function buildSummary(membership: StaffMembership): StaffUserSummary {
  return {
    branches: branchSummaries(membership.schoolId, membership.branchIds),
    identity: findIdentity(membership.userId),
    membership,
  };
}

function buildDetails(membership: StaffMembership): StaffUserDetails {
  const school = INITIAL_SCHOOLS.find(item => item.id === membership.schoolId);
  if (!school) fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  const definition = getBaseRoleDefinition(membership.role);
  return {
    ...buildSummary(membership),
    activeSessionCount: sessions.filter(
      item =>
        item.membershipId === membership.id && item.status === 'ACTIVE',
    ).length,
    effectiveAccess: {
      branchIds: membership.branchIds,
      permissions: getEffectivePermissions(
        membership.role,
        getConfiguration(membership.schoolId, membership.role),
      ),
      role: membership.role,
      scope: definition.scope,
    },
    schoolName: school.name,
  };
}

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / safeSize),
  };
}

function validateBranches(
  schoolId: string,
  role: StaffRole,
  branchIds: string[],
): void {
  if (role === 'SCHOOL_ADMIN') {
    if (branchIds.length > 0) {
      fail(
        'SCHOOL_ADMIN_BRANCH_SCOPE',
        'School Admin access automatically covers all school branches.',
        400,
      );
    }
    return;
  }
  if (branchIds.length === 0) {
    fail(
      'BRANCH_ASSIGNMENT_REQUIRED',
      'Select at least one active branch.',
      400,
      { branchIds: 'At least one active branch is required.' },
    );
  }
  const uniqueIds = [...new Set(branchIds)];
  const validBranches = INITIAL_BRANCHES.filter(
    branch =>
      uniqueIds.includes(branch.id) &&
      branch.schoolId === schoolId &&
      branch.status === 'ACTIVE',
  );
  if (validBranches.length !== uniqueIds.length) {
    fail(
      'INVALID_BRANCH_ASSIGNMENT',
      'Every assigned branch must be active and belong to this school.',
      403,
      { branchIds: 'One or more branches are unavailable.' },
    );
  }
}

function isLastSchoolAdmin(membership: StaffMembership): boolean {
  return (
    membership.role === 'SCHOOL_ADMIN' &&
    membership.status === 'ACTIVE' &&
    memberships.filter(
      item =>
        item.schoolId === membership.schoolId &&
        item.role === 'SCHOOL_ADMIN' &&
        item.status === 'ACTIVE',
    ).length <= 1
  );
}

function addActivity(
  membership: StaffMembership,
  action: UserActivityAction,
  description: string,
  metadata?: Record<string, string | number | boolean>,
): void {
  sequence += 1;
  activity.unshift({
    action,
    description,
    id: `activity-created-${sequence}`,
    metadata,
    performedAt: new Date().toISOString(),
    performedByName: 'Ananya Sharma',
    performedByUserId: 'user-school-admin',
    schoolId: membership.schoolId,
    targetMembershipId: membership.id,
    targetUserId: membership.userId,
  });
}

function revokeSessions(
  membership: StaffMembership,
  predicate: (isCurrent: boolean) => boolean = () => true,
): number {
  let count = 0;
  sessions.forEach(session => {
    if (
      session.membershipId === membership.id &&
      session.status === 'ACTIVE' &&
      predicate(session.isCurrent)
    ) {
      session.status = 'REVOKED';
      count += 1;
    }
  });
  return count;
}

function validateRoleConfiguration(
  role: AppRole,
  enabled: PermissionKey[],
  disabled: PermissionKey[],
): void {
  const definition = getBaseRoleDefinition(role);
  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'PARENT' || role === 'STUDENT') {
    fail('ROLE_PERMISSIONS_FIXED', 'Permissions for this role are fixed.');
  }
  const changes = [...enabled, ...disabled];
  if (
    changes.some(
      permission =>
        !definition.configurablePermissions.includes(permission) ||
        definition.prohibitedPermissions.includes(permission),
    )
  ) {
    fail(
      'PERMISSION_BOUNDARY_VIOLATION',
      'One or more permissions cannot be configured for this role.',
      403,
    );
  }
  if (enabled.some(permission => disabled.includes(permission))) {
    fail(
      'CONFLICTING_PERMISSION_OVERRIDE',
      'A permission cannot be both enabled and disabled.',
      400,
    );
  }
}

export const mockUserManagementService: UserManagementService = {
  async getStaffUsers(schoolId, query) {
    await mockDelay(140);
    if (!INITIAL_SCHOOLS.some(item => item.id === schoolId)) {
      fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
    }
    const search = query.search?.trim().toLowerCase() ?? '';
    const filtered = memberships
      .filter(item => item.schoolId === schoolId)
      .map(buildSummary)
      .filter(
        item =>
          (query.role === undefined ||
            query.role === 'ALL' ||
            item.membership.role === query.role) &&
          (query.status === undefined ||
            query.status === 'ALL' ||
            item.membership.status === query.status) &&
          (query.branchId === undefined ||
            query.branchId === 'ALL' ||
            item.membership.branchIds.includes(query.branchId)) &&
          (!search ||
            item.identity.name.toLowerCase().includes(search) ||
            item.identity.mobile.includes(search) ||
            item.identity.email?.toLowerCase().includes(search)),
      );
    return success(paginate(filtered, query.page, query.pageSize));
  },

  async getStaffUser(schoolId, membershipId) {
    await mockDelay(110);
    return success(buildDetails(findMembership(schoolId, membershipId)));
  },

  async findUserByMobile(mobile) {
    await mockDelay(90);
    const normalized = mobile.replace(/\D/g, '').slice(-10);
    return success(
      identities.find(item => item.mobile === normalized) ?? null,
      identities.some(item => item.mobile === normalized)
        ? 'Existing identity found.'
        : 'No existing identity found.',
    );
  },

  async createStaffMembership(
    schoolId,
    input: CreateStaffMembershipInput,
  ) {
    await mockDelay(180);
    if (!INITIAL_SCHOOLS.some(item => item.id === schoolId)) {
      fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
    }
    validateBranches(schoolId, input.role, input.branchIds);
    const mobile = input.identity.mobile.replace(/\D/g, '').slice(-10);
    let identity = identities.find(item => item.mobile === mobile);
    if (identity?.status === 'INACTIVE') {
      fail(
        'INACTIVE_USER_CONFLICT',
        'This mobile belongs to an inactive identity. A platform administrator must reactivate it first.',
        409,
      );
    }
    if (
      identity &&
      memberships.some(
        item =>
          item.userId === identity!.id &&
          item.schoolId === schoolId &&
          item.role === input.role &&
          item.status === 'ACTIVE',
      )
    ) {
      fail(
        'DUPLICATE_MEMBERSHIP',
        'This user already has an active membership with the selected role.',
        409,
        { mobile: 'An active membership already exists.' },
      );
    }
    const timestamp = new Date().toISOString();
    const identityCreated = !identity;
    if (!identity) {
      sequence += 1;
      identity = {
        createdAt: timestamp,
        email: input.identity.email,
        id: `user-created-${sequence}`,
        mobile,
        name: input.identity.name.trim(),
        status: 'ACTIVE',
        updatedAt: timestamp,
      };
      identities.push(identity);
    }
    sequence += 1;
    const membership: StaffMembership = {
      branchIds: [...new Set(input.branchIds)],
      createdAt: timestamp,
      id: `membership-created-${sequence}`,
      role: input.role,
      schoolId,
      status: input.status,
      updatedAt: timestamp,
      userId: identity.id,
    };
    memberships.push(membership);
    syncIdentityWithAuth(identity.id);
    if (identityCreated) {
      addActivity(
        membership,
        'STAFF_USER_CREATED',
        `Global identity ${identity.name} was created without a password.`,
      );
    }
    addActivity(
      membership,
      'MEMBERSHIP_CREATED',
      identityCreated
        ? `${input.role} membership was created for ${identity.name}.`
        : `Existing identity ${identity.name} received a new ${input.role} membership.`,
      { identityReused: !identityCreated },
    );
    return success(buildDetails(membership), 'Staff membership created.');
  },

  async updateUserIdentity(userId, input) {
    await mockDelay(150);
    const identity = findIdentity(userId);
    const mobile = input.mobile.replace(/\D/g, '').slice(-10);
    if (
      identities.some(item => item.id !== userId && item.mobile === mobile)
    ) {
      fail(
        'DUPLICATE_MOBILE',
        'Another global identity already uses this mobile number.',
        409,
        { mobile: 'This mobile number is already registered.' },
      );
    }
    const mobileChanged = identity.mobile !== mobile;
    Object.assign(identity, input, {
      mobile,
      name: input.name.trim(),
      updatedAt: new Date().toISOString(),
    });
    if (mobileChanged) {
      memberships
        .filter(item => item.userId === userId)
        .forEach(item => {
          const count = revokeSessions(item);
          if (count) {
            addActivity(
              item,
              'SESSIONS_REVOKED',
              'Sessions revoked after sensitive mobile change.',
              { revokedCount: count },
            );
          }
        });
    }
    syncIdentityWithAuth(identity.id);
    return success(identity, 'User identity updated.');
  },

  async updateUserStatus(userId, status) {
    await mockDelay(130);
    const identity = findIdentity(userId);
    identity.status = status;
    identity.updatedAt = new Date().toISOString();
    memberships
      .filter(item => item.userId === userId)
      .forEach(item => {
        if (status === 'INACTIVE') revokeSessions(item);
        addActivity(
          item,
          'USER_STATUS_CHANGED',
          `Global user status changed to ${status}.`,
        );
      });
    syncIdentityWithAuth(identity.id);
    return success(identity, `User ${status.toLowerCase()}.`);
  },

  async updateMembership(schoolId, membershipId, input) {
    await mockDelay(150);
    const membership = findMembership(schoolId, membershipId);
    validateBranches(schoolId, membership.role, input.branchIds);
    if (
      input.status === 'INACTIVE' &&
      membership.status === 'ACTIVE' &&
      isLastSchoolAdmin(membership)
    ) {
      fail(
        'LAST_ACTIVE_SCHOOL_ADMIN',
        'A school must always have at least one active School Admin.',
      );
    }
    const branchesChanged =
      [...membership.branchIds].sort().join(',') !==
      [...input.branchIds].sort().join(',');
    const statusChanged = membership.status !== input.status;
    membership.branchIds = [...new Set(input.branchIds)];
    membership.status = input.status;
    membership.updatedAt = new Date().toISOString();
    if (branchesChanged) {
      addActivity(
        membership,
        'BRANCH_ASSIGNMENT_CHANGED',
        'Assigned branches were updated.',
      );
    }
    if (statusChanged) {
      if (input.status === 'INACTIVE') revokeSessions(membership);
      addActivity(
        membership,
        input.status === 'ACTIVE'
          ? 'MEMBERSHIP_ACTIVATED'
          : 'MEMBERSHIP_DEACTIVATED',
        `Membership ${input.status.toLowerCase()}.`,
      );
    }
    syncIdentityWithAuth(membership.userId);
    return success(membership, 'Membership updated.');
  },

  async changeMembershipRole(schoolId, membershipId, role) {
    await mockDelay(160);
    const membership = findMembership(schoolId, membershipId);
    if (membership.role === 'SCHOOL_ADMIN' && role !== 'SCHOOL_ADMIN' && isLastSchoolAdmin(membership)) {
      fail(
        'LAST_ACTIVE_SCHOOL_ADMIN',
        'Assign another active School Admin before changing this role.',
      );
    }
    validateBranches(schoolId, role, membership.branchIds);
    const previousRole = membership.role;
    membership.role = role;
    membership.updatedAt = new Date().toISOString();
    const revokedCount = revokeSessions(membership);
    addActivity(
      membership,
      'ROLE_CHANGED',
      `Role changed from ${previousRole} to ${role}; active sessions were revoked.`,
      { previousRole, revokedCount },
    );
    syncIdentityWithAuth(membership.userId);
    return success(buildDetails(membership), 'Role changed.');
  },

  async assignBranches(schoolId, membershipId, branchIds) {
    await mockDelay(140);
    const membership = findMembership(schoolId, membershipId);
    validateBranches(schoolId, membership.role, branchIds);
    membership.branchIds = [...new Set(branchIds)];
    membership.updatedAt = new Date().toISOString();
    addActivity(
      membership,
      'BRANCH_ASSIGNMENT_CHANGED',
      'Assigned branches were updated.',
      { branchCount: membership.branchIds.length },
    );
    syncIdentityWithAuth(membership.userId);
    return success(membership, 'Branch assignments updated.');
  },

  async updateMembershipStatus(schoolId, membershipId, status) {
    await mockDelay(130);
    const membership = findMembership(schoolId, membershipId);
    if (
      status === 'INACTIVE' &&
      membership.status === 'ACTIVE' &&
      isLastSchoolAdmin(membership)
    ) {
      fail(
        'LAST_ACTIVE_SCHOOL_ADMIN',
        'A school must always have at least one active School Admin.',
      );
    }
    membership.status = status;
    membership.updatedAt = new Date().toISOString();
    const revokedCount = status === 'INACTIVE' ? revokeSessions(membership) : 0;
    addActivity(
      membership,
      status === 'ACTIVE'
        ? 'MEMBERSHIP_ACTIVATED'
        : 'MEMBERSHIP_DEACTIVATED',
      `Membership ${status.toLowerCase()}.`,
      { revokedCount },
    );
    syncIdentityWithAuth(membership.userId);
    return success(membership, `Membership ${status.toLowerCase()}.`);
  },

  async getRoles(schoolId) {
    await mockDelay(100);
    const roles = Object.keys(
      {
        SUPER_ADMIN: true,
        SCHOOL_ADMIN: true,
        BRANCH_ADMIN: true,
        ACCOUNTANT: true,
        RECEPTIONIST: true,
        PARENT: true,
        STUDENT: true,
      } satisfies Record<AppRole, true>,
    ) as AppRole[];
    return success(
      roles.map(role => ({
        ...getBaseRoleDefinition(role),
        activeMembershipCount: memberships.filter(
          item =>
            item.schoolId === schoolId &&
            item.role === role &&
            item.status === 'ACTIVE',
        ).length,
      })) as RoleDefinition[],
    );
  },

  async getRoleConfiguration(schoolId, role) {
    await mockDelay(90);
    return success(getConfiguration(schoolId, role));
  },

  async updateRoleConfiguration(schoolId, role, input) {
    await mockDelay(150);
    validateRoleConfiguration(
      role,
      input.enabledPermissions,
      input.disabledPermissions,
    );
    let configuration = configurations.find(
      item => item.schoolId === schoolId && item.role === role,
    );
    if (!configuration) {
      configuration = {
        disabledPermissions: [],
        enabledPermissions: [],
        role,
        schoolId,
        updatedAt: new Date().toISOString(),
      };
      configurations.push(configuration);
    }
    configuration.enabledPermissions = [...new Set(input.enabledPermissions)];
    configuration.disabledPermissions = [
      ...new Set(input.disabledPermissions),
    ];
    configuration.updatedAt = new Date().toISOString();
    const actor = memberships.find(
      item =>
        item.schoolId === schoolId &&
        item.role === 'SCHOOL_ADMIN' &&
        item.status === 'ACTIVE',
    );
    if (actor) {
      addActivity(
        actor,
        'PERMISSIONS_UPDATED',
        `${role} school permission overrides were updated.`,
      );
    }
    return success(configuration, 'Role permissions updated.');
  },

  async getActiveSessions(schoolId, membershipId) {
    await mockDelay(90);
    findMembership(schoolId, membershipId);
    return success(
      sessions.filter(
        item =>
          item.membershipId === membershipId && item.status === 'ACTIVE',
      ),
    );
  },

  async revokeSession(schoolId, membershipId, sessionId) {
    await mockDelay(100);
    const membership = findMembership(schoolId, membershipId);
    const session = sessions.find(
      item => item.id === sessionId && item.membershipId === membershipId,
    );
    if (!session) fail('SESSION_NOT_FOUND', 'Session could not be found.', 404);
    session.status = 'REVOKED';
    addActivity(
      membership,
      'SESSIONS_REVOKED',
      `Device session ${session.deviceLabel} was revoked.`,
      { revokedCount: 1 },
    );
    return success(null, 'Session revoked.');
  },

  async revokeOtherSessions(schoolId, membershipId) {
    await mockDelay(110);
    const membership = findMembership(schoolId, membershipId);
    const count = revokeSessions(membership, isCurrent => !isCurrent);
    addActivity(
      membership,
      'SESSIONS_REVOKED',
      'All other device sessions were revoked.',
      { revokedCount: count },
    );
    return success(null, 'Other sessions revoked.');
  },

  async revokeAllSessions(schoolId, membershipId) {
    await mockDelay(110);
    const membership = findMembership(schoolId, membershipId);
    const count = revokeSessions(membership);
    addActivity(
      membership,
      'SESSIONS_REVOKED',
      'All device sessions were revoked.',
      { revokedCount: count },
    );
    return success(null, 'All sessions revoked.');
  },

  async resendLoginInstructions(schoolId, membershipId) {
    await mockDelay(120);
    const membership = findMembership(schoolId, membershipId);
    const identity = findIdentity(membership.userId);
    addActivity(
      membership,
      'LOGIN_INSTRUCTIONS_SENT',
      `OTP login instructions sent to mobile ending ${identity.mobile.slice(-4)}.`,
    );
    return success(
      null,
      `Login instructions sent to ••••••${identity.mobile.slice(-4)}.`,
    );
  },

  async getUserActivity(schoolId, membershipId, query = {}) {
    await mockDelay(100);
    findMembership(schoolId, membershipId);
    return success(
      paginate(
        activity.filter(
          item =>
            item.schoolId === schoolId &&
            item.targetMembershipId === membershipId,
        ),
        query.page,
        query.pageSize,
      ),
    );
  },
};
