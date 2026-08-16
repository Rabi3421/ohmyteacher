import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/common/AppText';
import { AppModuleCard } from '../../components/common/AppModuleCard';
import { TAB_BAR_HEIGHT } from '../../components/layout/AppBottomTabBar';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';

export function FeesHubScreen({ navigation, route }: RoleScreenProps<'FeesHub'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);
  const insets = useSafeAreaInsets();

  useTabFocus('fees');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';
  const isStaff = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role);
  const canSetupFees = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const canManageFees = ['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT'].includes(role);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 }]}>
        <AppText style={{ color: theme.colors.textPrimary }} variant="heading3">Fees</AppText>
        <AppText style={{ color: theme.colors.textSecondary, marginTop: 2 }} variant="caption">
          {isParent || isStudent ? 'View your fee dues and payment history' : 'Fee management and collections'}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {isParent && schoolId ? (
          <>
            <AppModuleCard accent="#F26B55" description="View pending fee invoices for your children" icon="credit-card" onPress={() => navigation.navigate(ROUTES.PARENT_FEES, { parentMembershipId: membership!.id, schoolId })} tint="#FFF0ED" title="My Fee Dues" />
            <AppModuleCard accent="#18A978" description="Past payment receipts" icon="file-text" onPress={() => navigation.navigate(ROUTES.PARENT_RECEIPTS, { parentMembershipId: membership!.id, schoolId })} tint="#E8F8F2" title="My Receipts" />
          </>
        ) : null}

        {isStudent && schoolId ? (
          <>
            <AppModuleCard accent="#F26B55" description="View your pending fee invoices" icon="credit-card" onPress={() => navigation.navigate(ROUTES.STUDENT_FEES, { schoolId, studentMembershipId: membership!.id })} tint="#FFF0ED" title="My Fees" />
            <AppModuleCard accent="#18A978" description="Your payment history and receipts" icon="file-text" onPress={() => navigation.navigate(ROUTES.STUDENT_RECEIPTS, { schoolId, studentMembershipId: membership!.id })} tint="#E8F8F2" title="My Receipts" />
          </>
        ) : null}

        {isStaff && schoolId ? (
          <>
            <AppModuleCard accent="#F26B55" description="Overview of pending and overdue fee dues" icon="bar-chart" onPress={() => navigation.navigate(ROUTES.FEE_OUTSTANDING_DASHBOARD, { branchId, schoolId })} tint="#FFF0ED" title="Fee Outstanding" />
            <AppModuleCard accent="#1478F2" description="Daily collection, payments, and receipts" icon="credit-card" onPress={() => navigation.navigate(ROUTES.COLLECTION_DASHBOARD, { branchId, schoolId })} tint="#EAF3FF" title="Collection Dashboard" />
            <AppModuleCard accent="#18A978" description="Record and manage fee payments" icon="wallet" onPress={() => navigation.navigate(ROUTES.PAYMENTS, { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const })} tint="#E8F8F2" title="Payments" />
            <AppModuleCard accent="#18A978" description="View and share payment receipts" icon="file-text" onPress={() => navigation.navigate(ROUTES.RECEIPTS, { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const })} tint="#E8F8F2" title="Receipts" />
          </>
        ) : null}

        {canManageFees && schoolId ? (
          <>
            <AppModuleCard accent="#F59A23" description="Generate monthly and one-time fee invoices" icon="refresh" onPress={() => navigation.navigate(ROUTES.GENERATE_FEE_DUES, { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const })} tint="#FFF4E4" title="Generate Fees" />
            <AppModuleCard accent="#F59A23" description="Pending and overdue fee dues list" icon="clock" onPress={() => navigation.navigate(ROUTES.PENDING_FEES, { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const })} tint="#FFF4E4" title="Pending Fees" />
          </>
        ) : null}

        {canSetupFees && schoolId ? (
          <AppModuleCard accent="#7A5AF8" description="Fee heads, structures, and student assignments" icon="settings" onPress={() => navigation.navigate(ROUTES.FEE_SETUP, { branchId, schoolId })} tint="#F0ECFF" title="Fee Setup" />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 16, paddingHorizontal: 20 },
  list: { gap: 10, padding: 16 },
  root: { flex: 1 },
});
