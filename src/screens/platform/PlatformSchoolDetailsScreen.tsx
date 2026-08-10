import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, usePlatformStore } from '../../store';
import { formatDisplayDate } from '../../utils/date';

function maskedPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits ? `••••••${digits.slice(-4)}` : '—';
}

export function PlatformSchoolDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'SchoolDetails'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const isSuperAdmin = useAuthStore(
    state => state.activeMembership?.role === 'SUPER_ADMIN',
  );
  const school = usePlatformStore(state => state.currentSchool);
  const createResult = usePlatformStore(state => state.createResult);
  const isLoading = usePlatformStore(state => state.isLoadingSchool);
  const isMutating = usePlatformStore(state => state.isMutatingSchool);
  const error = usePlatformStore(state => state.detailError);
  const mutationError = usePlatformStore(state => state.mutationError);
  const successMessage = usePlatformStore(state => state.successMessage);
  const loadSchool = usePlatformStore(state => state.loadSchool);
  const cancelSchoolDetailRequest = usePlatformStore(
    state => state.cancelSchoolDetailRequest,
  );
  const setStatus = usePlatformStore(state => state.setSchoolStatus);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) loadSchool(schoolId).catch(() => undefined);
    return cancelSchoolDetailRequest;
  }, [cancelSchoolDetailRequest, isSuperAdmin, loadSchool, schoolId]);

  if (!isSuperAdmin) {
    return (
      <AppScreen testID="platform-access-denied-screen">
        <ErrorState
          message="Only a verified Super Admin can access platform schools."
          title="Platform access denied"
        />
      </AppScreen>
    );
  }

  if (isLoading && school?.id !== schoolId) {
    return <LoadingView message="Loading live school details…" />;
  }
  if (error && school?.id !== schoolId) {
    const title =
      error.status === 404
        ? 'School not found'
        : error.status === 403
          ? 'Platform permission denied'
          : error.code === 'INVALID_SCHOOL_ID'
            ? 'Invalid school reference'
            : 'School details unavailable';
    const retryable = ![400, 403, 404].includes(error.status ?? 0);
    return (
      <ErrorState
        message={error.message}
        onRetry={retryable ? () => loadSchool(schoolId) : undefined}
        title={title}
      />
    );
  }
  if (!school || school.id !== schoolId) {
    return <ErrorState message="School information is unavailable." />;
  }

  const nextStatus = school.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  const createdAdmin =
    createResult?.school.id === school.id ? createResult.admin : null;
  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        onRefresh={() => loadSchool(schoolId)}
        refreshing={isLoading}
        scrollable
        testID="platform-school-details-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={navigation.goBack}
            title="Platform School Details"
          />
          <View style={styles.titleRow}>
            <AppText style={styles.title} variant="heading2">
              {school.name}
            </AppText>
            <AppBadge
              status={school.status === 'ACTIVE' ? 'active' : 'inactive'}
            />
          </View>
          {successMessage ? (
            <AppCard style={styles.notice} variant="outlined">
              <AppText color={theme.colors.success}>{successMessage}</AppText>
            </AppCard>
          ) : null}
          {mutationError ? (
            <InlineError message={mutationError.message} style={styles.notice} />
          ) : null}
          <AppCard
            header={<AppText variant="title">School profile</AppText>}
            style={styles.card}
            variant="outlined"
          >
            <Detail label="Email" value={school.email || '—'} />
            <Detail label="Phone" value={maskedPhone(school.phone)} />
            <Detail label="Address" value={school.address || '—'} />
            <Detail label="UPI ID" value={school.upiId || '—'} />
            <Detail label="Created" value={formatDisplayDate(school.createdAt)} />
          </AppCard>
          {createdAdmin ? (
            <AppCard
              header={<AppText variant="title">Initial Admin created</AppText>}
              style={styles.card}
              variant="outlined"
            >
              <Detail label="Name" value={createdAdmin.name} />
              <Detail label="Role" value="School Admin" />
              <Detail label="Status" value={createdAdmin.status} />
            </AppCard>
          ) : null}
          <View style={styles.actions}>
            <AppButton
              fullWidth
              onPress={() =>
                navigation.navigate(ROUTES.EDIT_SCHOOL, { schoolId })
              }
              title="Edit School"
              variant="outline"
            />
            <AppButton
              disabled={isMutating}
              fullWidth
              onPress={() => setShowStatusConfirm(true)}
              title={
                school.status === 'ACTIVE'
                  ? 'Suspend School'
                  : 'Reinstate School'
              }
              variant={school.status === 'ACTIVE' ? 'danger' : 'primary'}
            />
          </View>
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={nextStatus === 'ACTIVE' ? 'Reinstate' : 'Suspend'}
        destructive={nextStatus === 'INACTIVE'}
        loading={isMutating}
        message={
          nextStatus === 'INACTIVE'
            ? `Suspend ${school.name}? Its data will remain intact. Existing JWT sessions may remain usable because the backend does not enforce school status globally.`
            : `Reinstate ${school.name}? Its existing data and configuration will be preserved.`
        }
        onCancel={() => setShowStatusConfirm(false)}
        onConfirm={async () => {
          if (await setStatus(schoolId, nextStatus)) {
            setShowStatusConfirm(false);
          }
        }}
        title={`${nextStatus === 'ACTIVE' ? 'Reinstate' : 'Suspend'} ${
          school.name
        }?`}
        visible={showStatusConfirm}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.detail}>
      <AppText color={theme.colors.textSecondary}>{label}</AppText>
      <AppText align="right" style={styles.detailValue} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginTop: 24 },
  card: { marginTop: 16 },
  detail: { alignItems: 'center', flexDirection: 'row', minHeight: 40 },
  detailValue: { flex: 1, marginLeft: 16 },
  maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  notice: { marginTop: 16 },
  screenContent: { paddingBottom: 32 },
  title: { flex: 1, marginRight: 12 },
  titleRow: { alignItems: 'center', flexDirection: 'row', marginTop: 20 },
});
