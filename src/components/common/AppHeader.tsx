import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  rightActions?: ReactNode;
  includeSafeArea?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  onBackPress,
  rightActions,
  includeSafeArea = true,
}: AppHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const safeAreaStyle = {
    paddingTop: includeSafeArea ? insets.top : 0,
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
        safeAreaStyle,
      ]}
    >
      <View style={styles.content}>
        {onBackPress ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <AppIcon
              color={theme.colors.textPrimary}
              name="chevron-left"
              size={theme.iconSizes.md}
            />
          </Pressable>
        ) : null}
        <View style={styles.copy}>
          <AppText numberOfLines={1} variant="title">
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              color={theme.colors.textSecondary}
              numberOfLines={1}
              variant="caption"
            >
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {rightActions ? (
          <View style={styles.actions}>{rightActions}</View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginLeft: -10,
    marginRight: 4,
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 8,
  },
});
