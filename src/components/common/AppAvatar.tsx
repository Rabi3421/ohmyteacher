import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ViewProps,
} from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import { getInitials } from '../../utils/formatters';
import { AppText } from './AppText';

export interface AppAvatarProps extends ViewProps {
  name: string;
  source?: ImageSourcePropType;
  size?: number;
  accessibilityLabel?: string;
}

export function AppAvatar({
  name,
  source,
  size = 44,
  accessibilityLabel = `${name} avatar`,
  style,
  ...props
}: AppAvatarProps) {
  const theme = useAppTheme();
  const dimensionStyle = {
    borderRadius: size / 2,
    height: size,
    width: size,
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[
        styles.avatar,
        dimensionStyle,
        { backgroundColor: theme.colors.primarySubtle },
        style,
      ]}
      {...props}
    >
      {source ? (
        <Image source={source} style={dimensionStyle} />
      ) : (
        <AppText
          color={theme.colors.primary}
          style={{ fontSize: Math.max(12, size * 0.34) }}
          variant="label"
        >
          {getInitials(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
