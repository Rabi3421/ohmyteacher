import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from './AppText';

export interface AppSectionLabelProps {
  title: string;
  /** Accent bar colour; defaults to the brand primary. */
  accent?: string;
}

/** Small capitalised group heading with a brand accent bar. */
export function AppSectionLabel({ title, accent }: AppSectionLabelProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <View
        style={[styles.bar, { backgroundColor: accent ?? theme.colors.primary }]}
      />
      <AppText
        style={[styles.text, { color: theme.colors.textSecondary }]}
        variant="caption"
      >
        {title.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 2,
    height: 14,
    width: 3,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
