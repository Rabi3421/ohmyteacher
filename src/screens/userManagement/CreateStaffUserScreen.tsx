import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { ROUTES } from '../../constants/routes';
import type { BackendStaffRole } from '../../models/liveStaff';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useAuthStore,
  useCurrentOrganizationStore,
  useCurrentStaffStore,
} from '../../store';
import { getBackendStaffRoleLabel } from '../../utils/role';
import {
  isIndianMobile,
  isRequired,
  normalizeIndianMobile,
} from '../../utils/validation';

export function CreateStaffUserScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateStaffUser'>) {
  const schoolId = route.params.schoolId;
  const actor = useAuthStore(state => state.activeMembership);
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const school = useCurrentOrganizationStore(state => state.currentSchool);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const createStaff = useCurrentStaffStore(state => state.createStaff);
  const isCreating = useCurrentStaffStore(state => state.isCreating);
  const error = useCurrentStaffStore(state => state.error);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<BackendStaffRole>(
    actor?.role === 'BRANCH_ADMIN' ? 'TEACHER' : 'BRANCH_ADMIN',
  );
  const [branchId, setBranchId] = useState(actor?.branchId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeBranches = useMemo(
    () => branches.filter(branch => branch.status === 'ACTIVE'),
    [branches],
  );

  useEffect(() => {
    loadBranches(schoolId).catch(() => undefined);
    loadSchool(schoolId).catch(() => undefined);
  }, [loadBranches, loadSchool, schoolId]);

  useEffect(() => {
    if (actor?.role === 'BRANCH_ADMIN' && actor.branchId) {
      setBranchId(actor.branchId);
      setRole('TEACHER');
    }
  }, [actor]);

  const submit = async (): Promise<void> => {
    const validation: Record<string, string> = {};
    if (!isRequired(name)) validation.name = 'Full name is required.';
    if (!isIndianMobile(mobile)) {
      validation.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!branchId) validation.branchId = 'Select an active branch.';
    setErrors(validation);
    if (Object.keys(validation).length > 0 || isCreating) return;

    const created = await createStaff(schoolId, {
      branchId,
      mobile,
      name,
      role,
    });
    if (created) {
      navigation.replace(ROUTES.STAFF_USER_DETAILS, {
        membershipId: created.id,
        schoolId,
      });
    }
  };

  const fieldErrors = { ...errors, ...error?.fieldErrors };
  const roleOptions: BackendStaffRole[] =
    actor?.role === 'BRANCH_ADMIN' ? ['TEACHER'] : ['BRANCH_ADMIN', 'TEACHER'];

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="create-staff-user-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Add Staff User" />
        <AppCard style={styles.schoolContext} variant="outlined">
          <AppText variant="label">CURRENT SCHOOL</AppText>
          <AppText variant="title">{school?.id === schoolId ? school.name : 'Current school'}</AppText>
          <AppText variant="caption">School ownership is assigned by Django.</AppText>
        </AppCard>
        <AppCard style={styles.card} variant="elevated">
          <AppInput
            error={fieldErrors.name}
            label="Full Name"
            onChangeText={setName}
            required
            value={name}
          />
          <AppInput
            error={fieldErrors.mobile}
            helperText="The staff member signs in later using OTP. No OTP is sent now."
            keyboardType="phone-pad"
            label="Mobile Number"
            maxLength={10}
            onChangeText={value => setMobile(normalizeIndianMobile(value))}
            required
            value={mobile}
          />
          <AppText style={styles.section} variant="heading3">Fixed backend role</AppText>
          <View style={styles.options}>
            {roleOptions.map(option => (
              <AppButton
                key={option}
                onPress={() => setRole(option)}
                title={getBackendStaffRoleLabel(option)}
                variant={role === option ? 'primary' : 'outline'}
              />
            ))}
          </View>
          <AppText style={styles.section} variant="heading3">Assigned branch</AppText>
          <AppText style={styles.helper} variant="caption">
            Django supports one branch per staff account.
          </AppText>
          <View style={styles.options}>
            {activeBranches.map(branch => (
              <AppButton
                disabled={actor?.role === 'BRANCH_ADMIN'}
                key={branch.id}
                onPress={() => setBranchId(branch.id)}
                title={`${branchId === branch.id ? '✓ ' : ''}${branch.name}`}
                variant={branchId === branch.id ? 'primary' : 'outline'}
              />
            ))}
          </View>
          {fieldErrors.branchId ? <AppText style={styles.fieldError}>{fieldErrors.branchId}</AppText> : null}
          {activeBranches.length === 0 ? (
            <InlineError message="No active accessible branch is available." style={styles.error} />
          ) : null}
          {error ? <InlineError message={error.message} style={styles.error} /> : null}
          <AppButton
            disabled={activeBranches.length === 0}
            fullWidth
            loading={isCreating}
            onPress={submit}
            style={styles.submit}
            title="Create Staff Account"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, marginTop: 20 },
  error: { marginTop: 8 },
  fieldError: { marginTop: 8 },
  helper: { marginTop: 4 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  schoolContext: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
  section: { marginTop: 12 },
  submit: { marginTop: 16 },
});
