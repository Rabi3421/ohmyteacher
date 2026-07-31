import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppText } from '../common/AppText';
import { AppIcon } from '../icons/AppIcon';

export interface InlineErrorProps extends ViewProps {
  message: string;
}

export function InlineError({ message, style, ...props }: InlineErrorProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.errorSubtle,
          borderColor: theme.colors.error,
        },
        style,
      ]}
      {...props}
    >
      <AppIcon
        color={theme.colors.error}
        name="alert-circle"
        size={theme.iconSizes.sm}
      />
      <AppText
        color={theme.colors.error}
        style={styles.message}
        variant="caption"
      >
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 8,
    flexDirection: 'row',
    padding: 10,
  },
  message: {
    flex: 1,
    marginLeft: 8,
  },
});
