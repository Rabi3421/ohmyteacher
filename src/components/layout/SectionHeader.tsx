import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from '../common/AppText';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <AppText variant="heading3">{title}</AppText>
        {subtitle ? (
          <AppText color={theme.colors.textSecondary} variant="body">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginLeft: 12,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
});
