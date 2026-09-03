import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppAvatar } from '../common/AppAvatar';
import { AppText } from '../common/AppText';
import { AppIcon } from '../icons/AppIcon';
import { useAppTheme } from '../../hooks/useAppTheme';
import { brandGradient } from '../../theme/gradients';

export interface AppHeroHeaderProps {
  greeting: string;
  name: string;
  contextLabel: string;
  dateLabel?: string;
  avatarName: string;
  avatarUri?: string;
  onAvatarPress?: () => void;
  onBellPress?: () => void;
}

/**
 * Branded gradient header shared by the role landing experience. Carries the
 * welcome screen's blue gradient and soft glow language into the app shell.
 */
export function AppHeroHeader({
  greeting,
  name,
  contextLabel,
  dateLabel,
  avatarName,
  avatarUri,
  onAvatarPress,
  onBellPress,
}: AppHeroHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[...brandGradient(theme.mode)]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.hero, { paddingTop: insets.top + 14 }]}
    >
      <View pointerEvents="none" style={styles.decorations}>
        <View style={[styles.glow, styles.glowTopRight]} />
        <View style={[styles.glow, styles.glowBottomLeft]} />
      </View>

      <View style={styles.topRow}>
        <View style={styles.identity}>
          <AppText style={styles.greeting} variant="label">
            {greeting}
          </AppText>
          <AppText numberOfLines={1} style={styles.name} variant="heading2">
            {name}
          </AppText>
        </View>

        <View style={styles.actions}>
          {onBellPress ? (
            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={6}
              onPress={onBellPress}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon color="#FFFFFF" name="bell" size={20} strokeWidth={2.1} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel="Account and settings"
            accessibilityRole="button"
            disabled={!onAvatarPress}
            hitSlop={4}
            onPress={onAvatarPress}
            style={({ pressed }) => [
              styles.avatarRing,
              pressed && styles.pressed,
            ]}
          >
            <AppAvatar
              name={avatarName}
              size={46}
              source={avatarUri ? { uri: avatarUri } : undefined}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.contextPill}>
          <View style={styles.contextDot} />
          <AppText numberOfLines={1} style={styles.contextText} variant="caption">
            {contextLabel}
          </AppText>
        </View>
        {dateLabel ? (
          <AppText style={styles.dateText} variant="caption">
            {dateLabel}
          </AppText>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatarRing: {
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 27,
    borderWidth: 2,
    padding: 1,
  },
  contextDot: {
    backgroundColor: '#7CE7B6',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  contextPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contextText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontWeight: '500',
  },
  decorations: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    bottom: -70,
    height: 150,
    left: -50,
    width: 150,
  },
  glowTopRight: {
    height: 190,
    right: -60,
    top: -80,
    width: 190,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  hero: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 52,
    paddingHorizontal: 20,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.26)',
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 14,
  },
  name: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
});
