import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppDetailRowProps {
  label: string;
  value: string;
  /** Optional tinted icon chip shown at the start of the row. */
  icon?: AppIconName;
  iconColor?: string;
  iconTint?: string;
  /** Hairline separator above the row; set on every row but the first. */
  divided?: boolean;
}

/** Label/value row used across the detail screens. */
export function AppDetailRow({
  label,
  value,
  icon,
  iconColor,
  iconTint,
  divided = false,
}: AppDetailRowProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.row,
        divided && [styles.divided, { borderTopColor: theme.colors.border }],
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.iconChip,
            { backgroundColor: iconTint ?? theme.colors.primarySubtle },
          ]}
        >
          <AppIcon
            color={iconColor ?? theme.colors.primary}
            name={icon}
            size={17}
            strokeWidth={2}
          />
        </View>
      ) : null}
      <AppText color={theme.colors.textSecondary} style={styles.label}>
        {label}
      </AppText>
      <AppText align="right" style={styles.value} variant="bodyMedium">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconChip: {
    alignItems: 'center',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginRight: 12,
    width: 32,
  },
  label: {
    flexShrink: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  value: {
    flex: 1,
  },
});
