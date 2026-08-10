import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';

export function UnsupportedFeeConfigurationScreen() {
  return (
    <AppScreen scrollable testID="unsupported-fee-configuration-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} subtitle="Not supported by the current Django fee contract" title="Unavailable" />
        <AppCard style={styles.card} variant="outlined">
          <AppText variant="title">No live configuration operation exists</AppText>
          <AppText>
            Discounts, fine rules, Student assignments, payable previews,
            Structure status, copying, and standalone Structure editing have no
            confirmed backend endpoint. No mock fallback, generated financial
            record, or fabricated success is used.
          </AppText>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ card: { gap: 8 }, maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' } });
