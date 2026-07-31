import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, AppIconName } from '../icons/AppIcon';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

type TrustFeatureProps = {
  icon: AppIconName;
  label: string;
  fillColor?: string;
};

export function TrustFeature({
  icon,
  label,
  fillColor = 'none',
}: TrustFeatureProps) {
  return (
    <View style={styles.container}>
      <AppIcon
        color={colors.iconBlue}
        fillColor={fillColor}
        name={icon}
        size={28}
        strokeWidth={2}
      />
      <Text numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  label: {
    color: colors.navy,
    fontSize: 11.5,
    fontWeight: typography.weights.semibold,
    lineHeight: 15,
    marginTop: 7,
    minHeight: 30,
    textAlign: 'center',
  },
});
