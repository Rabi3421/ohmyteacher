import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';

import { AppModuleCard } from '../../components/common/AppModuleCard';
import { AppSectionLabel } from '../../components/common/AppSectionLabel';
import { AppHubHeader } from '../../components/layout/AppHubHeader';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTabFocus } from '../../hooks/useTabFocus';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store';
import { brandGradientTop } from '../../theme/gradients';

export function ExamsHubScreen({ navigation, route }: RoleScreenProps<'ExamsHub'>) {
  const theme = useAppTheme();
  const { role } = route.params;
  const membership = useAuthStore(s => s.activeMembership);

  useTabFocus('exams');

  const schoolId = membership?.schoolId ?? '';
  const branchId = membership?.branchId;

  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';
  const canSetupExams = ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role);

  const examsCtx = { branchId: branchId ?? '', academicSessionId: '', schoolId, sessionStatus: 'ACTIVE' as const };

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      testID="exams-hub-screen"
    >
      <StatusBar
        backgroundColor={brandGradientTop(theme.mode)}
        barStyle="light-content"
      />

      <AppHubHeader
        icon={isParent || isStudent ? 'graduation-cap' : 'calendar-check'}
        subtitle={
          isParent || isStudent
            ? 'View your exam results and report cards'
            : 'Exam setup, marks entry, and results'
        }
        title={isParent || isStudent ? 'Results' : 'Examinations'}
      />

      <ScrollView
        contentContainerStyle={styles.list}
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
            <AppSectionLabel title="Setup" />
            <AppModuleCard accent="#1478F2" description="Create and manage exams, terms, and grading" icon="calendar-check" onPress={() => navigation.navigate(ROUTES.EXAMINATION_SETUP, examsCtx)} tint="#EAF3FF" title="Examination Setup" />

            <AppSectionLabel accent="#18A978" title="Assessment" />
            <AppModuleCard accent="#18A978" description="Enter and manage student marks" icon="presentation" onPress={() => navigation.navigate(ROUTES.MARKS_DASHBOARD, { ...examsCtx, examId: '' })} tint="#E8F8F2" title="Marks Entry" />
            <AppModuleCard accent="#18A978" description="Compute ranks, grades, and view results" icon="bar-chart" onPress={() => navigation.navigate(ROUTES.RESULT_PROCESSING_DASHBOARD, { ...examsCtx, examId: '' })} tint="#E8F8F2" title="Results Processing" />

            <AppSectionLabel accent="#6366F1" title="Reporting" />
            <AppModuleCard accent="#6366F1" description="Generate and share student report cards" icon="file-text" onPress={() => navigation.navigate(ROUTES.REPORT_CARD_DASHBOARD, { ...examsCtx, examId: '' })} tint="#EEF2FF" title="Report Cards" />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  root: {
    flex: 1,
  },
});
