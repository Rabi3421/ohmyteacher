import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AcademicContextBar } from '../../components/academic/AcademicContextBar';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAcademicStore } from '../../store';

export function AcademicSetupScreen({
  navigation,
  route,
}: RoleScreenProps<'AcademicSetup'>) {
  const theme = useAppTheme();
  const context = useAcademicStore(state => state.context);
  const summary = useAcademicStore(state => state.summary);
  const isLoading = useAcademicStore(state => state.isLoading);
  const error = useAcademicStore(state => state.error);
  const loadSummary = useAcademicStore(state => state.loadSetupSummary);

  useEffect(() => {
    if (context?.schoolId === route.params.schoolId) {
      loadSummary().catch(() => undefined);
    }
  }, [context, loadSummary, route.params.schoolId]);

  const routeContext = context
    ? {
        academicSessionId: context.academicSessionId,
        branchId: context.branchId,
        schoolId: context.schoolId,
      }
    : null;

  return (
    <AppScreen
      contentContainerStyle={styles.content}
      onRefresh={loadSummary}
      refreshing={isLoading}
      scrollable
      testID="academic-setup-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Classes, sections, and the school subject catalog"
          title="Academic Setup"
        />
        <AcademicContextBar
          initialBranchId={route.params.branchId}
          initialSessionId={route.params.academicSessionId}
          schoolId={route.params.schoolId}
        />
        {isLoading && !summary ? (
          <LoadingView message="Loading academic setup…" />
        ) : error && !summary ? (
          <ErrorState message={error.message} onRetry={loadSummary} />
        ) : summary && routeContext ? (
          <>
            <View style={styles.metrics}>
              {[
                ['Classes', summary.totalClasses],
                ['Active classes', summary.activeClasses],
                ['Sections', summary.totalSections],
                ['Active subjects', summary.activeSubjects],
              ].map(([label, value]) => (
                <AppCard key={String(label)} style={styles.metric}>
                  <AppText color={theme.colors.primary} variant="display">
                    {value}
                  </AppText>
                  <AppText color={theme.colors.textSecondary} variant="caption">
                    {label}
                  </AppText>
                </AppCard>
              ))}
            </View>
            {summary.classesWithoutSections > 0 ||
            summary.unassignedClasses > 0 ? (
              <AppCard style={styles.warning} variant="outlined">
                <AppText variant="title">Setup attention</AppText>
                <AppText color={theme.colors.textSecondary}>
                  {summary.classesWithoutSections} classes have no sections ·{' '}
                  {summary.unassignedClasses} classes have no assigned subjects
                </AppText>
              </AppCard>
            ) : null}
            <View style={styles.modules}>
              <AppCard
                onPress={() =>
                  navigation.navigate(ROUTES.CLASSES, routeContext)
                }
                variant="elevated"
              >
                <AppText variant="title">Classes & sections</AppText>
                <AppText color={theme.colors.textSecondary}>
                  Configure ordered classes, their sections, and subject
                  assignments for this branch and session.
                </AppText>
              </AppCard>
              <AppCard
                onPress={() =>
                  navigation.navigate(ROUTES.SUBJECTS, routeContext)
                }
                variant="elevated"
              >
                <AppText variant="title">Subject catalog</AppText>
                <AppText color={theme.colors.textSecondary}>
                  Maintain the school-wide catalog shared across branches and
                  academic sessions.
                </AppText>
              </AppCard>
            </View>
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  maxWidth: { alignSelf: 'center', maxWidth: 760, width: '100%' },
  metric: { flexBasis: '46%', flexGrow: 1 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modules: { gap: 12, marginTop: 18 },
  warning: { marginTop: 14 },
});
