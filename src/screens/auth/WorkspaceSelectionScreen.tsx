import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { InlineError } from '../../components/feedback/InlineError';
import { AppIcon } from '../../components/icons/AppIcon';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { UserMembership } from '../../models/auth';
import { useAuthStore } from '../../store';
import { getRoleLabel } from '../../utils/role';

export function WorkspaceSelectionScreen() {
  const theme = useAppTheme();
  const user = useAuthStore(state => state.user);
  const memberships = useAuthStore(state => state.memberships);
  const error = useAuthStore(state => state.error);
  const isLoading = useAuthStore(state => state.isLoading);
  const selectMembership = useAuthStore(state => state.selectMembership);
  const logout = useAuthStore(state => state.logout);

  return (
    <AppScreen
      contentContainerStyle={styles.screenContent}
      scrollable
      testID="workspace-selection-screen"
    >
      <View style={styles.maxWidth}>
        <View style={styles.hero}>
          <AppAvatar name={user?.name ?? 'User'} size={64} />
          <View style={styles.heroCopy}>
            <AppText variant="heading2">Choose your workspace</AppText>
            <AppText color={theme.colors.textSecondary}>
              Signed in as {user?.name ?? 'verified user'}. Your role is fixed
              by each verified membership.
            </AppText>
          </View>
        </View>
        <SectionHeader
          subtitle={`${memberships.length} verified ${
            memberships.length === 1 ? 'membership' : 'memberships'
          }`}
          title="Available workspaces"
        />
        {error ? (
          <InlineError message={error.message} style={styles.error} />
        ) : null}
        <View style={styles.list}>
          {memberships.map(membership => (
            <WorkspaceCard
              disabled={isLoading || membership.status !== 'ACTIVE'}
              key={membership.id}
              membership={membership}
              onPress={() => selectMembership(membership.id)}
            />
          ))}
        </View>
        <AppButton
          disabled={isLoading}
          fullWidth
          onPress={logout}
          title="Sign out"
          variant="ghost"
        />
      </View>
    </AppScreen>
  );
}

interface WorkspaceCardProps {
  membership: UserMembership;
  disabled: boolean;
  onPress: () => void;
}

function WorkspaceCard({
  membership,
  disabled,
  onPress,
}: WorkspaceCardProps) {
  const theme = useAppTheme();
  const workspaceName = membership.schoolName ?? 'OhMyTeacher Platform';

  return (
    <AppCard
      accessibilityLabel={`${workspaceName}, ${getRoleLabel(membership.role)}`}
      disabled={disabled}
      onPress={onPress}
      variant="elevated"
    >
      <View style={styles.cardRow}>
        <AppAvatar
          name={workspaceName}
          size={52}
          source={
            membership.schoolLogoUrl
              ? { uri: membership.schoolLogoUrl }
              : undefined
          }
        />
        <View style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <AppText numberOfLines={1} style={styles.cardTitle} variant="title">
              {workspaceName}
            </AppText>
            <AppBadge
              status={membership.status === 'ACTIVE' ? 'active' : 'inactive'}
            />
          </View>
          <AppText color={theme.colors.primary} variant="bodyMedium">
            {getRoleLabel(membership.role)}
          </AppText>
          {membership.branchName ? (
            <AppText color={theme.colors.textSecondary} variant="caption">
              Branch: {membership.branchName}
            </AppText>
          ) : null}
          {membership.studentName ? (
            <AppText color={theme.colors.textSecondary} variant="caption">
              Student: {membership.studentName}
            </AppText>
          ) : null}
        </View>
        <AppIcon
          color={theme.colors.textSecondary}
          name="chevron-right"
          size={theme.iconSizes.md}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  cardCopy: {
    flex: 1,
    marginHorizontal: 12,
    minWidth: 0,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  error: {
    marginTop: 16,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 32,
    marginTop: 16,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
    marginLeft: 16,
  },
  list: {
    gap: 12,
    marginBottom: 20,
    marginTop: 16,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 640,
    width: '100%',
  },
  screenContent: {
    paddingBottom: 32,
  },
});
