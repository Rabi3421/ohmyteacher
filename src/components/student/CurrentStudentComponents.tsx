import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { CurrentStudent } from '../../models/currentStudent';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppAvatar } from '../common/AppAvatar';
import { AppBadge } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export function maskStudentPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `••••••${digits.slice(-4)}` : 'Not available';
}

export function maskStudentEmail(value: string): string {
  const [local, domain] = value.split('@');
  if (!local || !domain) return 'Not recorded';
  return `${local.slice(0, 1)}•••@${domain}`;
}

export function CurrentStudentStatusBadge({ status }: Pick<CurrentStudent, 'status'>) {
  return <AppBadge label={status.replace('_', ' ')} status={status === 'active' ? 'active' : 'inactive'} />;
}

export function CurrentStudentCard({ item, onPress }: { item: CurrentStudent; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <AppAvatar name={item.name} size={50} />
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText color={theme.colors.primary} variant="caption">{item.admissionNumber}</AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            Class ID {item.classId} · Section ID {item.sectionId} · Roll {item.rollNumber || 'not assigned'}
          </AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            Parent contact: {item.parentName || 'Name not recorded'} · {maskStudentPhone(item.parentPhoneNumber)}
          </AppText>
        </View>
        <CurrentStudentStatusBadge status={item.status} />
      </View>
    </AppCard>
  );
}

export function CurrentStudentFacts({ item, showParent = true }: { item: CurrentStudent; showParent?: boolean }) {
  return (
    <View style={styles.facts}>
      <AppText>Admission number: {item.admissionNumber}</AppText>
      <AppText>Admission date: {item.admissionDate}</AppText>
      <AppText>Date of birth: {item.dateOfBirth || 'Not recorded'}</AppText>
      <AppText>Gender: {item.gender || 'Not recorded'}</AppText>
      <AppText>Branch ID: {item.branchId}</AppText>
      <AppText>Class ID: {item.classId}</AppText>
      <AppText>Section ID: {item.sectionId}</AppText>
      <AppText>Roll number: {item.rollNumber || 'Not assigned'}</AppText>
      {showParent ? <>
        <AppText>Parent name: {item.parentName || 'Not recorded'}</AppText>
        <AppText>Parent phone: {maskStudentPhone(item.parentPhoneNumber)}</AppText>
        <AppText>Parent email: {maskStudentEmail(item.parentEmail)}</AppText>
      </> : null}
      <AppText>Address: {item.address || 'Not recorded'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  facts: { gap: 8 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
