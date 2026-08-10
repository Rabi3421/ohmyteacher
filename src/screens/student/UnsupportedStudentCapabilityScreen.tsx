import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';

export function UnsupportedStudentCapabilityScreen() {
  return (
    <AppScreen scrollable testID="unsupported-student-capability-screen">
      <View style={styles.maxWidth}>
        <AppHeader includeSafeArea={false} title="Unavailable" subtitle="Not supported by the current Django contract" />
        <AppCard variant="outlined">
          <AppText variant="title">No live operation is available</AppText>
          <AppText>
            Separate guardian management, enrolment history, transfer workflows,
            student-owned access, and staged admission records do not have
            backend endpoints. No mock fallback or fabricated success is used.
          </AppText>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({ maxWidth: { alignSelf: 'center', maxWidth: 720, width: '100%' } });
