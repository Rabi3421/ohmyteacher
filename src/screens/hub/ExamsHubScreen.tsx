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

export function ExamsHubScreen({ navigation, route }: RoleScreenProps<'ExamsHub'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);
  const insets = useSafeAreaInsets();

  useTabFocus('exams');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';
  const canSetupExams = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);

  const examsCtx = { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, paddingTop: insets.top + 8 }]}>
        <AppText style={{ color: theme.colors.textPrimary }} variant="heading3">
          {isParent || isStudent ? 'Results' : 'Examinations'}
        </AppText>
        <AppText style={{ color: theme.colors.textSecondary, marginTop: 2 }} variant="caption">
          {isParent || isStudent ? 'View your exam results and report cards' : 'Exam setup, marks entry, and results'}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {isParent && schoolId ? (
          <>
            <AppModuleCard accent="#18A978" description="View your children's exam scores and grades" icon="graduation-cap" onPress={() => navigation.navigate(ROUTES.PARENT_RESULTS, { parentMembershipId: membership!.id, schoolId })} tint="#E8F8F2" title="Exam Results" />
            <AppModuleCard accent="#6366F1" description="Download and view report cards" icon="file-text" onPress={() => navigation.navigate(ROUTES.PARENT_REPORT_CARDS, { parentMembershipId: membership!.id, schoolId })} tint="#EEF2FF" title="Report Cards" />
          </>
        ) : null}

        {isStudent && schoolId ? (
          <>
            <AppModuleCard accent="#18A978" description="View your exam results and grades" icon="graduation-cap" onPress={() => navigation.navigate(ROUTES.STUDENT_RESULTS, { schoolId, studentMembershipId: membership!.id })} tint="#E8F8F2" title="My Results" />
            <AppModuleCard accent="#6366F1" description="View and download your report cards" icon="file-text" onPress={() => navigation.navigate(ROUTES.STUDENT_REPORT_CARDS, { schoolId, studentMembershipId: membership!.id })} tint="#EEF2FF" title="Report Cards" />
          </>
        ) : null}

        {canSetupExams && schoolId ? (
          <>
            <AppModuleCard accent="#1478F2" description="Create and manage exams, terms, and grading" icon="calendar-check" onPress={() => navigation.navigate(ROUTES.EXAMINATION_SETUP, examsCtx)} tint="#EAF3FF" title="Examination Setup" />
            <AppModuleCard accent="#18A978" description="Enter and manage student marks" icon="presentation" onPress={() => navigation.navigate(ROUTES.MARKS_DASHBOARD, { ...examsCtx, examId: '' })} tint="#E8F8F2" title="Marks Entry" />
            <AppModuleCard accent="#18A978" description="Compute ranks, grades, and view results" icon="bar-chart" onPress={() => navigation.navigate(ROUTES.RESULT_PROCESSING_DASHBOARD, { ...examsCtx, examId: '' })} tint="#E8F8F2" title="Results Processing" />
            <AppModuleCard accent="#6366F1" description="Generate and share student report cards" icon="file-text" onPress={() => navigation.navigate(ROUTES.REPORT_CARD_DASHBOARD, { ...examsCtx, examId: '' })} tint="#EEF2FF" title="Report Cards" />
          </>
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
