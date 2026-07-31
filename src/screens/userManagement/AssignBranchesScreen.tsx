import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { BranchAssignmentPicker } from '../../components/userManagement/BranchAssignmentPicker';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useOrganizationStore,
  useUserManagementStore,
} from '../../store';

export function AssignBranchesScreen({
  navigation,
  route,
}: RoleScreenProps<'AssignBranches'>) {
  const { membershipId, schoolId } = route.params;
  const staff = useUserManagementStore(state => state.currentStaff);
  const loadStaff = useUserManagementStore(state => state.loadStaffUser);
  const assignBranches = useUserManagementStore(state => state.assignBranches);
  const isLoading = useUserManagementStore(
    state => state.isLoadingStaffDetails,
  );
  const isSaving = useUserManagementStore(
    state => state.isUpdatingMembership,
  );
  const error = useUserManagementStore(state => state.error);
  const branches = useOrganizationStore(state => state.branches.items);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string>();

  useEffect(() => {
    loadStaff(schoolId, membershipId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
  }, [loadBranches, loadStaff, membershipId, schoolId]);

  useEffect(() => {
    if (staff?.membership.id === membershipId) {
      setSelectedIds(staff.membership.branchIds);
    }
  }, [membershipId, staff]);

  if (isLoading && !staff) {
    return <LoadingView message="Loading branch assignments…" />;
  }
  if (!staff) {
    return (
      <ErrorState
        message={error?.message ?? 'Staff information is unavailable.'}
        onRetry={() => loadStaff(schoolId, membershipId)}
      />
    );
  }

  const submit = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      setValidationError('Select at least one active branch.');
      return;
    }
    setValidationError(undefined);
    const updated = await assignBranches(
      schoolId,
      membershipId,
      selectedIds,
    );
    if (updated) navigation.goBack();
  };

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="assign-branches-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle={staff.identity.name}
          title="Assign Branches"
        />
        <AppCard style={styles.card} variant="elevated">
          <BranchAssignmentPicker
            branches={branches}
            error={validationError}
            onChange={setSelectedIds}
            selectedIds={selectedIds}
          />
          {error ? (
            <InlineError message={error.message} style={styles.error} />
          ) : null}
          <AppButton
            fullWidth
            loading={isSaving}
            onPress={submit}
            style={styles.submit}
            title="Save Branch Assignments"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 22 },
});
