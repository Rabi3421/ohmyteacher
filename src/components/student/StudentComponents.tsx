import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type {
  GuardianDetails,
  StudentCurrentEnrollment,
  StudentListItem as StudentListItemModel,
  StudentProfile,
} from '../../models/student';
import { AppAvatar } from '../common/AppAvatar';
import { AppBadge } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppSearchInput } from '../common/AppSearchInput';
import { AppText } from '../common/AppText';

export function StudentStatusBadge({
  status,
}: {
  status: StudentProfile['status'];
}) {
  return (
    <AppBadge
      label={status.replace('_', ' ')}
      status={status === 'ACTIVE' ? 'active' : 'inactive'}
    />
  );
}

export function StudentProfileHeader({
  profile,
}: {
  profile: StudentProfile;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.header}>
      <AppAvatar
        name={profile.fullName}
        size={64}
        source={profile.photoUrl ? { uri: profile.photoUrl } : undefined}
      />
      <View style={styles.copy}>
        <AppText variant="heading2">{profile.fullName}</AppText>
        <AppText color={theme.colors.primary}>
          {profile.admissionNumber}
        </AppText>
      </View>
      <StudentStatusBadge status={profile.status} />
    </View>
  );
}

export function EnrollmentSummaryCard({
  enrollment,
}: {
  enrollment?: StudentCurrentEnrollment;
}) {
  const theme = useAppTheme();
  return (
    <AppCard variant="outlined">
      <AppText variant="title">Current Enrollment</AppText>
      {enrollment ? (
        <View style={styles.details}>
          <AppText>
            {enrollment.branchName} · {enrollment.academicSessionName}
          </AppText>
          <AppText color={theme.colors.textSecondary}>
            {enrollment.className} · {enrollment.sectionName}
          </AppText>
          <AppText color={theme.colors.textSecondary}>
            Roll number: {enrollment.rollNumber ?? 'Not assigned'}
          </AppText>
          <AppBadge
            label={enrollment.status}
            status={enrollment.status === 'ACTIVE' ? 'active' : 'inactive'}
          />
        </View>
      ) : (
        <AppText color={theme.colors.textSecondary}>
          No active enrollment.
        </AppText>
      )}
    </AppCard>
  );
}

export function GuardianCard({ guardian }: { guardian: GuardianDetails }) {
  const theme = useAppTheme();
  return (
    <AppCard variant="outlined">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{guardian.fullName}</AppText>
          <AppText color={theme.colors.textSecondary}>
            {guardian.relationship} · {guardian.mobile}
          </AppText>
        </View>
        {guardian.link.isPrimaryContact ? (
          <AppBadge label="Primary" status="active" />
        ) : null}
      </View>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {guardian.link.isFeeContact ? 'Fee contact · ' : ''}
        {guardian.link.whatsappEnabled ? 'WhatsApp enabled · ' : ''}
        {guardian.link.parentAppAccessEnabled
          ? 'Parent access enabled'
          : 'Parent access disabled'}
      </AppText>
    </AppCard>
  );
}

export function StudentListItem({
  item,
  onPress,
}: {
  item: StudentListItemModel;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.header}>
        <AppAvatar
          name={item.profile.fullName}
          size={50}
          source={
            item.profile.photoUrl ? { uri: item.profile.photoUrl } : undefined
          }
        />
        <View style={styles.copy}>
          <AppText variant="title">{item.profile.fullName}</AppText>
          <AppText color={theme.colors.primary} variant="caption">
            {item.profile.admissionNumber}
          </AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {item.currentEnrollment
              ? `${item.currentEnrollment.branchName} · ${item.currentEnrollment.className} · ${item.currentEnrollment.sectionName}`
              : 'No active enrollment'}
          </AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {item.primaryGuardian
              ? `${item.primaryGuardian.fullName} · ${item.primaryGuardian.mobile}`
              : 'No guardian'}
          </AppText>
        </View>
        <StudentStatusBadge status={item.profile.status} />
      </View>
    </AppCard>
  );
}

export function StudentSearchField(props: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <AppSearchInput
      onChangeText={props.onChangeText}
      placeholder="Search name, admission, roll, or guardian mobile"
      value={props.value}
    />
  );
}

export function AdmissionStepIndicator({ step }: { step: number }) {
  return (
    <View style={styles.steps}>
      {['Student', 'Guardian', 'Enrollment', 'Access', 'Review'].map(
        (label, index) => (
          <View key={label} style={styles.step}>
            <AppBadge
              label={`${index + 1}. ${label}`}
              status={index + 1 <= step ? 'active' : 'draft'}
            />
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  details: { gap: 7, marginTop: 12 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  step: { marginBottom: 4 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
});
