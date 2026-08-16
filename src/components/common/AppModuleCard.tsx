import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../hooks/useAppTheme';
import type { AppIconName } from '../icons/AppIcon';
import { AppIcon } from '../icons/AppIcon';
import { AppText } from './AppText';

interface AppModuleCardProps {
  icon: AppIconName;
  title: string;
  description?: string;
  accent: string;
  tint: string;
  onPress: () => void;
  badge?: string | number;
  compact?: boolean;
}

export function AppModuleCard({
  icon,
  title,
  description,
  accent,
  tint,
  onPress,
  badge,
  compact = false,
}: AppModuleCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        compact && styles.compact,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: tint }]}>
        <AppIcon color={accent} name={icon} size={compact ? 20 : 22} strokeWidth={2} />
        {badge !== undefined && (
          <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
            <AppText style={styles.badgeText}>
              {typeof badge === 'number' && badge > 99 ? '99+' : badge}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.textArea}>
        <AppText
          numberOfLines={1}
          style={{ color: theme.colors.textPrimary }}
          variant="label"
        >
          {title}
        </AppText>
        {description && !compact && (
          <AppText
            numberOfLines={2}
            style={{ color: theme.colors.textSecondary, marginTop: 2 }}
            variant="caption"
          >
            {description}
          </AppText>
        )}
      </View>
      <AppIcon color={theme.colors.textTertiary} name="chevron-right" size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  compact: {
    gap: 10,
    padding: 12,
  },
  container: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  textArea: {
    flex: 1,
  },
});
