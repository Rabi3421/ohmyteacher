import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { AppIcon, AppIconName } from '../icons/AppIcon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type FeatureBadgeProps = {
  label: string;
  icon: AppIconName;
  color: string;
  backgroundColor: string;
  rotation?: `${number}deg`;
  style?: StyleProp<ViewStyle>;
};

export function FeatureBadge({
  label,
  icon,
  color,
  backgroundColor,
  rotation = '0deg',
  style,
}: FeatureBadgeProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.card, { transform: [{ rotate: rotation }] }, style]}
    >
      <View style={[styles.iconContainer, { backgroundColor }]}>
        <AppIcon color={color} name={icon} size={25} strokeWidth={2.2} />
      </View>
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderTranslucent,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 5,
    height: 94,
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: colors.shadowBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    width: 100,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 12,
    height: 43,
    justifyContent: 'center',
    marginBottom: 8,
    width: 43,
  },
  label: {
    color: colors.navy,
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
});
