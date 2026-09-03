import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import {
  useCurrentOrganizationStore,
  useCurrentStaffStore,
} from '../../store';

export function AssignBranchesScreen({
  navigation,
  route,
}: RoleScreenProps<'AssignBranches'>) {
  const { membershipId: staffId, schoolId } = route.params;
  const staff = useCurrentStaffStore(state => state.currentStaff);
  const loadStaff = useCurrentStaffStore(state => state.loadStaffUser);
  const updateStaff = useCurrentStaffStore(state => state.updateStaff);
  const isLoading = useCurrentStaffStore(state => state.isLoadingDetails);
  const isSaving = useCurrentStaffStore(state => state.isSaving);
  const error = useCurrentStaffStore(state => state.error);
  const branches = useCurrentOrganizationStore(state => state.branches.items);
  const loadBranches = useCurrentOrganizationStore(state => state.loadBranches);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const [selectedId, setSelectedId] = useState('');
  const [validationError, setValidationError] = useState<string>();

  const activeBranches = useMemo(
    () => branches.filter(branch => branch.status === 'ACTIVE'),
    [branches],
  );

  useEffect(() => {
    loadStaff(schoolId, staffId).catch(() => undefined);
    loadBranches(schoolId).catch(() => undefined);
    loadSchool(schoolId).catch(() => undefined);
  }, [loadBranches, loadSchool, loadStaff, schoolId, staffId]);

  useEffect(() => {
    if (staff?.id === staffId) setSelectedId(staff.branch.id);
  }, [staff, staffId]);

  if (isLoading && staff?.id !== staffId) {
    return <LoadingView message="Loading branch assignment…" />;
  }
  if (!staff || staff.id !== staffId) {
    return <ErrorState message={error?.message ?? 'Staff information is unavailable.'} onRetry={() => loadStaff(schoolId, staffId)} />;
  }

  const submit = async (): Promise<void> => {
    if (!selectedId) {
      setValidationError('Select one active branch.');
      return;
    }
    setValidationError(undefined);
    if (selectedId === staff.branch.id) {
      navigation.goBack();
      return;
    }
    if (await updateStaff(schoolId, staffId, { branchId: selectedId })) {
      navigation.goBack();
    }
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="assign-branches-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} subtitle={staff.name} title="Change Branch" />
        <AppCard style={styles.card} variant="elevated">
          <AppText variant="heading3">Assigned branch</AppText>
          <AppText style={styles.helper} variant="caption">
            Django supports exactly one branch assignment. Only live, active and accessible branches are available.
          </AppText>
          <View style={styles.options}>
            {activeBranches.map(branch => (
              <AppChoiceChip
                key={branch.id}
                onPress={() => setSelectedId(branch.id)}
                label={`${selectedId === branch.id ? '✓ ' : ''}${branch.name}`}
                selected={selectedId === branch.id}
              />
            ))}
          </View>
          {validationError ? <AppText style={styles.fieldError}>{validationError}</AppText> : null}
          {error ? <InlineError message={error.message} style={styles.error} /> : null}
          <AppButton
            disabled={activeBranches.length === 0}
            fullWidth
            loading={isSaving}
            onPress={submit}
            style={styles.submit}
            title="Save Branch"
          />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  fieldError: { marginTop: 8 },
  helper: { marginTop: 4 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 22 },
});
