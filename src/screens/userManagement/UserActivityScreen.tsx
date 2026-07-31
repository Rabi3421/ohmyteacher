import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useUserManagementStore } from '../../store';
import { formatDateTime } from '../../utils/date';

export function UserActivityScreen({
  navigation,
  route,
}: RoleScreenProps<'UserActivity'>) {
  const theme = useAppTheme();
  const { membershipId, schoolId } = route.params;
  const activity = useUserManagementStore(state => state.activity);
  const isLoading = useUserManagementStore(state => state.isLoadingActivity);
  const error = useUserManagementStore(state => state.error);
  const loadActivity = useUserManagementStore(state => state.loadActivity);

  useEffect(() => {
    loadActivity(schoolId, membershipId).catch(() => undefined);
  }, [loadActivity, membershipId, schoolId]);

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={() => loadActivity(schoolId, membershipId)}
      refreshing={isLoading}
      scrollable
      testID="user-activity-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="Security tokens and sensitive payloads are excluded"
          title="User Activity"
        />
        {isLoading && activity.items.length === 0 ? (
          <LoadingView message="Loading user activity…" />
        ) : error && activity.items.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadActivity(schoolId, membershipId)}
          />
        ) : activity.items.length === 0 ? (
          <EmptyState
            description="No user-management activity has been recorded."
            title="No activity"
          />
        ) : (
          <View style={styles.list}>
            {activity.items.map(item => (
              <AppCard key={item.id} variant="outlined">
                <AppBadge
                  label={item.action.replaceAll('_', ' ')}
                  status="completed"
                />
                <AppText style={styles.description}>
                  {item.description}
                </AppText>
                <AppText color={theme.colors.textSecondary} variant="caption">
                  By {item.performedByName} ·{' '}
                  {formatDateTime(item.performedAt)}
                </AppText>
              </AppCard>
            ))}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: 8, marginTop: 10 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
});
