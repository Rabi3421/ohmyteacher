import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../common/AppText';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import { useAppTheme } from '../../hooks/useAppTheme';
import { brandGradient } from '../../theme/gradients';

export interface AppHubHeaderProps {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  onIconPress?: () => void;
}

/**
 * Compact gradient header for the tab-root hub screens. Same brand language
 * as {@link AppHeroHeader}, trimmed down so list content stays above the fold.
 */
export function AppHubHeader({
  title,
  subtitle,
  icon,
  onIconPress,
}: AppHubHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const iconChip = icon ? (
    <View style={styles.iconChip}>
      <AppIcon color="#FFFFFF" name={icon} size={22} strokeWidth={2.1} />
    </View>
  ) : null;

  return (
    <LinearGradient
      colors={[...brandGradient(theme.mode)]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.header, { paddingTop: insets.top + 16 }]}
    >
      <View pointerEvents="none" style={styles.decorations}>
        <View style={[styles.glow, styles.glowTopRight]} />
        <View style={[styles.glow, styles.glowBottomLeft]} />
      </View>

      <View style={styles.row}>
        <View style={styles.textArea}>
          <AppText numberOfLines={1} style={styles.title} variant="heading3">
            {title}
          </AppText>
          {subtitle ? (
            <AppText numberOfLines={2} style={styles.subtitle} variant="caption">
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {icon && onIconPress ? (
          <Pressable
            accessibilityLabel={title}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onIconPress}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            {iconChip}
          </Pressable>
        ) : (
          iconChip
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  decorations: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  glow: {
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 999,
    position: 'absolute',
  },
  glowBottomLeft: {
    bottom: -60,
    height: 130,
    left: -45,
    width: 130,
  },
  glowTopRight: {
    height: 165,
    right: -55,
    top: -70,
    width: 165,
  },
  header: {
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  iconChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 3,
  },
  textArea: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
