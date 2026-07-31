import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  PERMISSION_GROUPS,
  type PermissionGroup,
  type PermissionKey,
} from '../../constants/userPermissions';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { PERMISSION_DEFINITIONS } from '../../services/userManagement/permissionDefinitions';
import { getBaseRoleDefinition } from '../../services/userManagement/roleDefinitions';
import { useAuthStore, useUserManagementStore } from '../../store';
import { canManageRolePermissions } from '../../utils/userManagementPermissions';

type ConfirmAction = 'save' | 'discard' | 'reset';

function samePermissions(
  left: PermissionKey[],
  right: PermissionKey[],
): boolean {
  return [...left].sort().join(',') === [...right].sort().join(',');
}

export function RolePermissionsScreen({
  navigation,
  route,
}: RoleScreenProps<'RolePermissions'>) {
  const theme = useAppTheme();
  const { role, schoolId } = route.params;
  const actor = useAuthStore(state => state.activeMembership);
  const configuration = useUserManagementStore(
    state => state.roleConfiguration,
  );
  const isLoading = useUserManagementStore(state => state.isLoadingRoles);
  const isSaving = useUserManagementStore(
    state => state.isSavingPermissions,
  );
  const error = useUserManagementStore(state => state.error);
  const success = useUserManagementStore(state => state.successMessage);
  const loadConfiguration = useUserManagementStore(
    state => state.loadRoleConfiguration,
  );
  const saveConfiguration = useUserManagementStore(
    state => state.saveRoleConfiguration,
  );
  const definition = getBaseRoleDefinition(role);
  const [enabled, setEnabled] = useState<PermissionKey[]>([]);
  const [disabled, setDisabled] = useState<PermissionKey[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<PermissionGroup[]>([
    'Organization',
    'Users',
  ]);
  const [confirm, setConfirm] = useState<ConfirmAction>();

  useEffect(() => {
    loadConfiguration(schoolId, role).catch(() => undefined);
  }, [loadConfiguration, role, schoolId]);

  useEffect(() => {
    if (
      configuration?.schoolId === schoolId &&
      configuration.role === role
    ) {
      setEnabled(configuration.enabledPermissions);
      setDisabled(configuration.disabledPermissions);
    }
  }, [configuration, role, schoolId]);

  const editable =
    Boolean(actor) &&
    canManageRolePermissions(actor!.role, actor!, schoolId) &&
    definition.configurablePermissions.length > 0;
  const dirty =
    configuration &&
    (!samePermissions(enabled, configuration.enabledPermissions) ||
      !samePermissions(disabled, configuration.disabledPermissions));
  const visibleDefinitions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return PERMISSION_DEFINITIONS.filter(
      permission =>
        !query ||
        permission.label.toLowerCase().includes(query) ||
        permission.key.toLowerCase().includes(query),
    );
  }, [search]);

  if (isLoading && !configuration) {
    return <LoadingView message="Loading permission matrix…" />;
  }
  if (!configuration) {
    return (
      <ErrorState
        message={error?.message ?? 'Role permissions are unavailable.'}
        onRetry={() => loadConfiguration(schoolId, role)}
      />
    );
  }

  const permissionEnabled = (permission: PermissionKey): boolean => {
    if (definition.prohibitedPermissions.includes(permission)) return false;
    if (disabled.includes(permission)) return false;
    return (
      enabled.includes(permission) ||
      definition.defaultPermissions.includes(permission)
    );
  };

  const togglePermission = (permission: PermissionKey): void => {
    if (
      !editable ||
      !definition.configurablePermissions.includes(permission) ||
      definition.prohibitedPermissions.includes(permission)
    ) {
      return;
    }
    if (permissionEnabled(permission)) {
      setEnabled(current => current.filter(item => item !== permission));
      setDisabled(current => [...new Set([...current, permission])]);
    } else {
      setDisabled(current => current.filter(item => item !== permission));
      setEnabled(current => [...new Set([...current, permission])]);
    }
  };

  const requestBack = (): void => {
    if (dirty) setConfirm('discard');
    else navigation.goBack();
  };

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="role-permissions-screen"
      >
        <View style={styles.maxWidth}>
          <AppHeader
            includeSafeArea={false}
            onBackPress={requestBack}
            subtitle={`${definition.label} · school-specific overrides`}
            title="Role Permissions"
          />
          <AppSearchInput
            onChangeText={setSearch}
            placeholder="Search permissions"
            style={styles.search}
            value={search}
          />
          {success ? (
            <AppCard style={styles.notice} variant="outlined">
              <AppText>{success}</AppText>
            </AppCard>
          ) : null}
          {error ? (
            <InlineError message={error.message} style={styles.notice} />
          ) : null}
          {PERMISSION_GROUPS.map(group => {
            const permissions = visibleDefinitions.filter(
              permission => permission.group === group,
            );
            if (permissions.length === 0) return null;
            const isExpanded = expanded.includes(group) || Boolean(search);
            return (
              <AppCard key={group} style={styles.group} variant="outlined">
                <AppButton
                  fullWidth
                  onPress={() =>
                    setExpanded(current =>
                      current.includes(group)
                        ? current.filter(item => item !== group)
                        : [...current, group],
                    )
                  }
                  title={`${isExpanded ? '−' : '+'} ${group} (${permissions.length})`}
                  variant="ghost"
                />
                {isExpanded ? (
                  <View style={styles.permissionList}>
                    {permissions.map(permission => {
                      const configurable =
                        editable &&
                        definition.configurablePermissions.includes(
                          permission.key,
                        ) &&
                        !definition.prohibitedPermissions.includes(
                          permission.key,
                        );
                      const prohibited =
                        definition.prohibitedPermissions.includes(
                          permission.key,
                        );
                      const active = permissionEnabled(permission.key);
                      return (
                        <View key={permission.key} style={styles.permissionRow}>
                          <View style={styles.permissionCopy}>
                            <AppText variant="bodyMedium">
                              {permission.label}
                            </AppText>
                            <AppText
                              color={theme.colors.textSecondary}
                              variant="caption"
                            >
                              {permission.key}
                            </AppText>
                          </View>
                          <AppBadge
                            label={
                              prohibited
                                ? 'Prohibited'
                                : configurable
                                  ? active
                                    ? 'Enabled'
                                    : 'Disabled'
                                  : active
                                    ? 'Fixed On'
                                    : 'Fixed Off'
                            }
                            status={
                              prohibited
                                ? 'cancelled'
                                : configurable
                                  ? active
                                    ? 'active'
                                    : 'inactive'
                                  : 'locked'
                            }
                          />
                          {configurable ? (
                            <AppButton
                              onPress={() =>
                                togglePermission(permission.key)
                              }
                              title={active ? 'Disable' : 'Enable'}
                              variant={active ? 'outline' : 'primary'}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </AppCard>
            );
          })}
          {editable ? (
            <View style={styles.actions}>
              <AppButton
                fullWidth
                onPress={() => setConfirm('reset')}
                title="Reset to Defaults"
                variant="outline"
              />
              <AppButton
                disabled={!dirty}
                fullWidth
                loading={isSaving}
                onPress={() => setConfirm('save')}
                title="Save Permission Overrides"
              />
            </View>
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        confirmLabel={
          confirm === 'discard'
            ? 'Discard'
            : confirm === 'reset'
              ? 'Reset'
              : 'Save'
        }
        destructive={confirm === 'discard'}
        loading={isSaving}
        message={
          confirm === 'discard'
            ? 'Your unsaved school role overrides will be lost.'
            : confirm === 'reset'
              ? 'Remove all school-specific overrides and return to system defaults?'
              : 'Apply these overrides to this school role? Prohibited permissions remain excluded.'
        }
        onCancel={() => setConfirm(undefined)}
        onConfirm={async () => {
          if (confirm === 'discard') {
            navigation.goBack();
            return;
          }
          if (confirm === 'reset') {
            setEnabled([]);
            setDisabled([]);
            setConfirm(undefined);
            return;
          }
          const saved = await saveConfiguration(
            schoolId,
            role,
            enabled,
            disabled,
          );
          if (saved) setConfirm(undefined);
        }}
        title={
          confirm === 'discard'
            ? 'Discard permission changes?'
            : confirm === 'reset'
              ? 'Reset role defaults?'
              : 'Save permission changes?'
        }
        visible={Boolean(confirm)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 22 },
  group: { marginTop: 12 },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  notice: { marginTop: 12 },
  permissionCopy: { flex: 1, marginRight: 10 },
  permissionList: { gap: 12, marginTop: 12 },
  permissionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  screenContent: { paddingBottom: 32 },
  search: { marginTop: 16 },
});
