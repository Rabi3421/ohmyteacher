import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, AppIconName } from '../icons/AppIcon';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export type UserRole = 'student' | 'parent' | 'teacher' | 'administrator';

type RoleCardProps = {
  role: UserRole;
  title: string;
  description: string;
  icon: AppIconName;
  iconColor: string;
  iconBackgroundColor: string;
  selected: boolean;
  onPress: (role: UserRole) => void;
};

export function RoleCard({
  role,
  title,
  description,
  icon,
  iconColor,
  iconBackgroundColor,
  selected,
  onPress,
}: RoleCardProps) {
  return (
    <Pressable
      accessibilityHint={`Selects ${title} as the role to continue with`}
      accessibilityLabel={`${title}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      onPress={() => onPress(role)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selectedCard,
        pressed && styles.pressedCard,
      ]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}
      >
        <AppIcon color={iconColor} name={icon} size={29} strokeWidth={2} />
      </View>

      <View style={styles.copy}>
        <Text maxFontSizeMultiplier={1.25} style={styles.title}>
          {title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.25}
          numberOfLines={2}
          style={styles.description}
        >
          {description}
        </Text>
      </View>

      <View style={[styles.action, selected && styles.selectedAction]}>
        <AppIcon
          color={selected ? colors.white : colors.primary}
          name={selected ? 'check' : 'chevron-right'}
          size={selected ? 18 : 21}
          strokeWidth={selected ? 2.8 : 2.4}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    minHeight: 86,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: colors.shadowBlue,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 11,
  },
  selectedCard: {
    backgroundColor: colors.selectionBackground,
    borderColor: colors.primary,
  },
  pressedCard: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 17,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  copy: {
    flex: 1,
    marginHorizontal: spacing.sm,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: typography.weights.bold,
    lineHeight: 22,
  },
  description: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: typography.weights.medium,
    lineHeight: 18,
    marginTop: 3,
  },
  action: {
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  selectedAction: {
    backgroundColor: colors.primary,
  },
});
