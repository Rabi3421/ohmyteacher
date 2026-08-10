import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  CurrentClassFeeStructure,
  CurrentFeeHead,
} from '../../models/currentFeeConfiguration';
import { formatFeePaise } from '../../utils/feeMoney';
import { AppBadge } from '../common/AppBadge';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export function CurrentFeeHeadCard({
  item,
  onPress,
}: {
  item: CurrentFeeHead;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.name}</AppText>
          <AppText variant="caption">
            {item.frequency === 'MONTHLY' ? 'Monthly' : 'One-time'} · School-wide
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
    </AppCard>
  );
}

export function CurrentFeeStructureCard({
  item,
  onPress,
}: {
  item: CurrentClassFeeStructure;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={onPress} variant="elevated">
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="title">{item.className}</AppText>
          <AppText>{item.items.length} Structure Items</AppText>
          <AppText variant="caption">
            Configured total {formatFeePaise(item.totalPaise)}
          </AppText>
        </View>
        <AppBadge
          label={item.items.length ? 'CONFIGURED' : 'EMPTY'}
          status={item.items.length ? 'active' : 'draft'}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
