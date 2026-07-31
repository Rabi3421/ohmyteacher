import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';

export interface AppDividerProps extends ViewProps {
  inset?: number;
  vertical?: boolean;
}

export function AppDivider({
  inset = 0,
  vertical = false,
  style,
  ...props
}: AppDividerProps) {
  const theme = useAppTheme();
  const dimensions = {
    height: vertical ? '100%' : StyleSheet.hairlineWidth,
    marginHorizontal: vertical ? inset : 0,
    marginVertical: vertical ? 0 : inset,
    width: vertical ? StyleSheet.hairlineWidth : '100%',
  } as const;

  return (
    <View
      accessibilityElementsHidden
      style={[
        {
          backgroundColor: theme.colors.border,
        },
        dimensions,
        style,
      ]}
      {...props}
    />
  );
}
