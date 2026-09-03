import React, { type ReactNode } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../hooks/useAppTheme';
import { brandGradient } from '../../theme/gradients';
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
        { backgroundColor: theme.colors.surface },
        safeAreaStyle,
      ]}
    >
      {/* Tab roots paint a light-on-gradient status bar; this header sits on a
          light surface, so it has to claim the dark treatment back. */}
      <StatusBar
        backgroundColor={theme.colors.surface}
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />

      <View style={styles.content}>
        {onBackPress ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={6}
            onPress={onBackPress}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: theme.colors.primarySubtle },
              { opacity: pressed ? 0.55 : 1 },
            ]}
          >
            <AppIcon
              color={theme.colors.primary}
              name="chevron-left"
              size={theme.iconSizes.sm}
              strokeWidth={2.4}
            />
          </Pressable>
        ) : null}
        <View style={styles.copy}>
          <AppText numberOfLines={1} style={styles.title}>
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

      <LinearGradient
        colors={[...brandGradient(theme.mode)]}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={styles.accentStrip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  accentStrip: {
    height: 3,
  },
  container: {
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
