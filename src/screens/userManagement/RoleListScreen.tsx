import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useUserManagementStore } from '../../store';

export function RoleListScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleList'>) {
  const theme = useAppTheme();
  const schoolId = route.params.schoolId;
  const roles = useUserManagementStore(state => state.roles);
  const isLoading = useUserManagementStore(state => state.isLoadingRoles);
  const error = useUserManagementStore(state => state.error);
  const loadRoles = useUserManagementStore(state => state.loadRoles);

  useEffect(() => {
    loadRoles(schoolId).catch(() => undefined);
  }, [loadRoles, schoolId]);

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      onRefresh={() => loadRoles(schoolId)}
      refreshing={isLoading}
      scrollable
      testID="role-list-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle="System roles cannot be added or deleted"
          title="Roles"
        />
        {isLoading && roles.length === 0 ? (
          <LoadingView message="Loading roles…" />
        ) : error && roles.length === 0 ? (
          <ErrorState
            message={error.message}
            onRetry={() => loadRoles(schoolId)}
          />
        ) : (
          <View style={styles.list}>
            {roles.map(role => (
              <AppCard
                key={role.role}
                onPress={() =>
                  navigation.navigate(ROUTES.ROLE_DETAILS, {
                    role: role.role,
                    schoolId,
                  })
                }
                variant="elevated"
              >
                <View style={styles.titleRow}>
                  <AppText style={styles.copy} variant="title">
                    {role.label}
                  </AppText>
                  <AppBadge
                    label={
                      role.configurablePermissions.length
                        ? 'Configurable'
                        : 'Fixed'
                    }
                    status={
                      role.configurablePermissions.length
                        ? 'draft'
                        : 'locked'
                    }
                  />
                </View>
                <AppText color={theme.colors.textSecondary}>
                  {role.description}
                </AppText>
                <AppText style={styles.meta} variant="caption">
                  {role.scope} scope · {role.defaultPermissions.length}{' '}
                  default permissions · {role.activeMembershipCount} active
                  memberships
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
  copy: { flex: 1, marginRight: 10 },
  list: { gap: 12, marginTop: 20 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  meta: { marginTop: 10 },
  screenContent: { paddingBottom: 32 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
});
