import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { BranchAssignmentPicker } from '../../components/userManagement/BranchAssignmentPicker';
import { StaffIdentityFormFields } from '../../components/userManagement/StaffIdentityFormFields';
import { ROUTES } from '../../constants/routes';
import type {
  CreateStaffMembershipInput,
  MembershipStatus,
  StaffRole,
  UpdateUserIdentityInput,
} from '../../models/userManagement';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';
import { getRoleLabel } from '../../utils/role';
import { isEmail, isIndianMobile, isRequired } from '../../utils/validation';

type FormErrors = Record<string, string>;

export function CreateStaffUserScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateStaffUser'>) {
  const schoolId = route.params.schoolId;
  const actor = useAuthStore(state => state.activeMembership);
  const branches = useOrganizationStore(state => state.branches.items);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const school = useOrganizationStore(state => state.currentSchool);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const foundIdentity = useUserManagementStore(state => state.foundIdentity);
  const findIdentity = useUserManagementStore(state => state.findIdentity);
  const createStaff = useUserManagementStore(state => state.createStaff);
  const isSearching = useUserManagementStore(
    state => state.isSearchingIdentity,
  );
  const isCreating = useUserManagementStore(state => state.isCreatingStaff);
  const error = useUserManagementStore(state => state.error);
  const [identity, setIdentity] = useState<UpdateUserIdentityInput>({
    email: '',
    mobile: '',
    name: '',
  });
  const [role, setRole] = useState<StaffRole>(
    actor?.role === 'SUPER_ADMIN' ? 'SCHOOL_ADMIN' : 'BRANCH_ADMIN',
  );
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [status, setStatus] = useState<MembershipStatus>('ACTIVE');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadBranches(schoolId).catch(() => undefined);
    if (school?.id !== schoolId) {
      loadSchool(schoolId).catch(() => undefined);
    }
  }, [loadBranches, loadSchool, school?.id, schoolId]);

  useEffect(() => {
    if (foundIdentity?.mobile === identity.mobile) {
      setIdentity(current => ({
        email: foundIdentity.email ?? current.email,
        mobile: foundIdentity.mobile,
        name: foundIdentity.name,
      }));
    }
  }, [foundIdentity, identity.mobile]);

  const roles: StaffRole[] =
    actor?.role === 'SUPER_ADMIN'
      ? ['SCHOOL_ADMIN']
      : ['BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'];

  const validate = (): FormErrors => {
    const validation: FormErrors = {};
    if (!isRequired(identity.name)) validation.name = 'Full name is required.';
    if (!isIndianMobile(identity.mobile)) {
      validation.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (identity.email && !isEmail(identity.email)) {
      validation.email = 'Enter a valid email.';
    }
    if (role !== 'SCHOOL_ADMIN' && branchIds.length === 0) {
      validation.branchIds = 'Select at least one active branch.';
    }
    return validation;
  };

  const submit = async (): Promise<void> => {
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isCreating) return;
    const input: CreateStaffMembershipInput = {
      branchIds: role === 'SCHOOL_ADMIN' ? [] : branchIds,
      identity,
      role,
      status,
    };
    const created = await createStaff(schoolId, input);
    if (created) {
      navigation.replace(ROUTES.STAFF_USER_DETAILS, {
        membershipId: created.membership.id,
        schoolId,
      });
    }
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="create-staff-user-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Add Staff User"
        />
        <AppCard style={styles.schoolContext} variant="outlined">
          <AppText variant="label">SELECTED SCHOOL</AppText>
          <AppText variant="title">
            {school?.id === schoolId ? school.name : schoolId}
          </AppText>
          {school?.id === schoolId ? (
            <AppText variant="caption">{school.code}</AppText>
          ) : null}
        </AppCard>
        <AppCard style={styles.card} variant="elevated">
          <StaffIdentityFormFields
            errors={errors}
            onChange={setIdentity}
            value={identity}
          />
          <AppButton
            disabled={!isIndianMobile(identity.mobile)}
            fullWidth
            loading={isSearching}
            onPress={() => findIdentity(identity.mobile)}
            style={styles.section}
            title="Check Existing User"
            variant="outline"
          />
          {foundIdentity?.mobile === identity.mobile ? (
            <AppCard style={styles.identityNotice} variant="outlined">
              <AppText variant="title">Existing identity found</AppText>
              <AppText>
                {foundIdentity.name} · {foundIdentity.mobile}
              </AppText>
              <AppText variant="caption">
                A new school membership will reuse this global identity.
              </AppText>
            </AppCard>
          ) : null}
          <AppText style={styles.section} variant="heading3">
            Role
          </AppText>
          <View style={styles.options}>
            {roles.map(option => (
              <AppButton
                key={option}
                onPress={() => {
                  setRole(option);
                  if (option === 'SCHOOL_ADMIN') setBranchIds([]);
                }}
                title={getRoleLabel(option)}
                variant={role === option ? 'primary' : 'outline'}
              />
            ))}
          </View>
          {role !== 'SCHOOL_ADMIN' ? (
            <View style={styles.section}>
              <BranchAssignmentPicker
                branches={branches}
                error={errors.branchIds}
                onChange={setBranchIds}
                selectedIds={branchIds}
              />
            </View>
          ) : (
            <AppText style={styles.helper} variant="caption">
              School Admin automatically receives school-wide branch scope.
            </AppText>
          )}
          <AppText style={styles.section} variant="heading3">
            Membership status
          </AppText>
          <View style={styles.options}>
            {(['ACTIVE', 'INACTIVE'] as const).map(option => (
              <AppButton
                key={option}
                onPress={() => setStatus(option)}
                title={
                  option[0] + option.slice(1).toLowerCase()
                }
                variant={status === option ? 'primary' : 'outline'}
              />
            ))}
          </View>
          {error ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          <AppButton
            fullWidth
            loading={isCreating}
            onPress={submit}
            style={styles.submit}
            title="Create Staff Membership"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  helper: { marginTop: 12 },
  identityNotice: { marginTop: 14 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  screenContent: { paddingBottom: 32 },
  schoolContext: { marginTop: 16 },
  section: { marginTop: 22 },
  submit: { marginTop: 24 },
});
