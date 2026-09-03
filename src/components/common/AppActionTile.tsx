import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

export interface AppActionTileProps {
  icon: AppIconName;
  title: string;
  description?: string;
  accent: string;
  tint: string;
  onPress: () => void;
  badge?: string | number;
}

/**
 * Square-ish dashboard tile used on the role landing grid. Mirrors the
 * welcome screen's floating feature badges: tinted icon chip, soft shadow
 * and generous rounding.
 */
export function AppActionTile({
  icon,
  title,
  description,
  accent,
  tint,
  onPress,
  badge,
}: AppActionTileProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: tint }]}>
        <AppIcon color={accent} name={icon} size={22} strokeWidth={2.1} />
        {badge !== undefined ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
            <AppText style={styles.badgeText}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.textArea}>
        <AppText
          numberOfLines={2}
          style={[styles.title, { color: theme.colors.textPrimary }]}
        >
          {title}
        </AppText>
        {description ? (
          <AppText
            numberOfLines={2}
            style={[styles.description, { color: theme.colors.textSecondary }]}
            variant="caption"
          >
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    marginTop: 3,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  textArea: {
    marginTop: 12,
  },
  tile: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    flex: 1,
    minHeight: 132,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
