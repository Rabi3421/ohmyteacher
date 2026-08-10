import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
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
import { isRequired } from '../../utils/validation';

export function EditStaffUserScreen({
  navigation,
  route,
}: RoleScreenProps<'EditStaffUser'>) {
  const { membershipId: staffId, schoolId } = route.params;
  const staff = useCurrentStaffStore(state => state.currentStaff);
  const loadStaff = useCurrentStaffStore(state => state.loadStaffUser);
  const updateStaff = useCurrentStaffStore(state => state.updateStaff);
  const isLoading = useCurrentStaffStore(state => state.isLoadingDetails);
  const isSaving = useCurrentStaffStore(state => state.isSaving);
  const error = useCurrentStaffStore(state => state.error);
  const loadSchool = useCurrentOrganizationStore(state => state.loadCurrentSchool);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();

  useEffect(() => {
    if (staff?.id !== staffId) loadStaff(schoolId, staffId).catch(() => undefined);
    loadSchool(schoolId).catch(() => undefined);
  }, [loadSchool, loadStaff, schoolId, staff?.id, staffId]);

  useEffect(() => {
    if (staff?.id === staffId) setName(staff.name);
  }, [staff, staffId]);

  if (isLoading && staff?.id !== staffId) {
    return <LoadingView message="Preparing staff form…" />;
  }
  if (!staff || staff.id !== staffId) {
    return <ErrorState message={error?.message ?? 'Staff information is unavailable.'} onRetry={() => loadStaff(schoolId, staffId)} />;
  }

  const save = async (): Promise<void> => {
    if (!isRequired(name)) {
      setNameError('Full name is required.');
      return;
    }
    setNameError(undefined);
    if (name.trim() === staff.name.trim()) {
      navigation.goBack();
      return;
    }
    const updated = await updateStaff(schoolId, staffId, { name });
    if (updated) navigation.goBack();
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scrollable testID="edit-staff-user-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} onBackPress={navigation.goBack} title="Edit Staff User" />
        <AppCard style={styles.card} variant="elevated">
          <AppInput
            error={nameError ?? error?.fieldErrors?.name}
            label="Full Name"
            onChangeText={setName}
            required
            value={name}
          />
          <AppText style={styles.helper} variant="caption">
            Mobile number and fixed role are read-only in Django.
          </AppText>
          {error ? <InlineError message={error.message} style={styles.error} /> : null}
          <AppButton fullWidth loading={isSaving} onPress={save} style={styles.submit} title="Save Name" />
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 20 },
  error: { marginTop: 16 },
  helper: { marginTop: 10 },
  maxWidth: { alignSelf: 'center', maxWidth: 680, width: '100%' },
  screenContent: { paddingBottom: 32 },
  submit: { marginTop: 20 },
});
