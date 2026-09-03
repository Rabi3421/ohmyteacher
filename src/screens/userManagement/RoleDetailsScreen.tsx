import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppDetailRow } from '../../components/common/AppDetailRow';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useAuthStore, useUserManagementStore } from '../../store';
import { canManageRolePermissions } from '../../utils/userManagementPermissions';

export function RoleDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'RoleDetails'>) {
  const theme = useAppTheme();
  const { role, schoolId } = route.params;
  const actor = useAuthStore(state => state.activeMembership);
  const roles = useUserManagementStore(state => state.roles);
  const isLoading = useUserManagementStore(state => state.isLoadingRoles);
  const error = useUserManagementStore(state => state.error);
  const loadRoles = useUserManagementStore(state => state.loadRoles);
  const definition = roles.find(item => item.role === role);

  useEffect(() => {
    if (!definition) loadRoles(schoolId).catch(() => undefined);
  }, [definition, loadRoles, schoolId]);

  if (isLoading && !definition) {
    return <LoadingView message="Loading role details…" />;
  }
  if (!definition) {
    return (
      <ErrorState
        message={error?.message ?? 'Role definition is unavailable.'}
        onRetry={() => loadRoles(schoolId)}
      />
    );
  }

  const editable =
    actor &&
    canManageRolePermissions(actor.role, actor, schoolId) &&
    definition.configurablePermissions.length > 0;

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="role-details-screen"
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title="Role Details"
        />
        <View style={styles.titleRow}>
          <View style={styles.copy}>
            <AppText variant="heading2">{definition.label}</AppText>
            <AppText color={theme.colors.primary}>
              {definition.scope} scope
            </AppText>
          </View>
          <AppBadge
            label={editable ? 'Configurable' : 'Fixed'}
            status={editable ? 'draft' : 'locked'}
          />
        </View>
        <AppText color={theme.colors.textSecondary} style={styles.description}>
          {definition.description}
        </AppText>
        <AppCard style={styles.card} variant="outlined">
          <Detail
            label="Default permissions"
            value={String(definition.defaultPermissions.length)}
          />
          <Detail
            label="Configurable permissions"
            value={String(definition.configurablePermissions.length)}
          />
          <Detail
            label="Prohibited permissions"
            value={String(definition.prohibitedPermissions.length)}
          />
          <Detail
            label="Active memberships"
            value={String(definition.activeMembershipCount)}
          />
          <Detail label="System managed" value="Yes" />
        </AppCard>
        <AppCard style={styles.card} variant="outlined">
          <AppText variant="title">Configuration boundary</AppText>
          <AppText style={styles.description}>
            Fixed permissions are read-only. Only listed configurable
            permissions may receive school-specific overrides, and prohibited
            permissions are always removed from effective access.
          </AppText>
        </AppCard>
        <AppButton
          fullWidth
          onPress={() =>
            navigation.navigate(ROUTES.ROLE_PERMISSIONS, { role, schoolId })
          }
          style={styles.action}
          title={editable ? 'Configure Permissions' : 'View Permissions'}
        />
      </View>
    </AppScreen>
  );
}

function Detail({
  label,
  value,
  divided,
}: {
  label: string;
  value: string;
  divided?: boolean;
}) {
  return <AppDetailRow divided={divided} label={label} value={value} />;
}

const styles = StyleSheet.create({
  action: { marginTop: 22 },
  card: { marginTop: 18 },
  copy: { flex: 1 },
  description: { marginTop: 10 },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 680,
    width: '100%',
  },
  screenContent: { paddingBottom: 32 },
  titleRow: { alignItems: 'center', flexDirection: 'row', marginTop: 20 },
});
