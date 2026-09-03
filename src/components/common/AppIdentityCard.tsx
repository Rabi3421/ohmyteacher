import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppIdentityCardProps {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  accent?: string;
  tint?: string;
  /** Status badge or other trailing element. */
  trailing?: ReactNode;
  /** Chips rendered under the title, e.g. code or branch. */
  footer?: ReactNode;
}

/**
 * Page-level identity block for detail screens: tinted icon chip, name,
 * supporting line and a trailing status. Mirrors the workspace card on the
 * role landing screen.
 */
export function AppIdentityCard({
  title,
  subtitle,
  icon,
  accent,
  tint,
  trailing,
  footer,
}: AppIdentityCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconChip,
            { backgroundColor: tint ?? theme.colors.primarySubtle },
          ]}
        >
          <AppIcon
            color={accent ?? theme.colors.primary}
            name={icon}
            size={24}
            strokeWidth={2.1}
          />
        </View>
        <View style={styles.copy}>
          <AppText numberOfLines={2} style={styles.title}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              color={theme.colors.textSecondary}
              numberOfLines={1}
              style={styles.subtitle}
              variant="caption"
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  copy: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  subtitle: {
    marginTop: 3,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 25,
  },
  trailing: {
    marginLeft: 4,
  },
});
