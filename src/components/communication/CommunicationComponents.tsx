import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  AppNotification,
  CommunicationRecord,
  MessageTemplate,
  ReminderRule,
  ScheduledReminder,
} from '../../models/communication';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppBadge } from '../common/AppBadge';
import { AppButton } from '../common/AppButton';
import { AppCard } from '../common/AppCard';
import { AppText } from '../common/AppText';

export function CommunicationMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  const theme = useAppTheme();
  return (
    <AppCard
      style={[styles.metric, { backgroundColor: theme.colors.surface }]}
      variant="outlined"
    >
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="heading2">{value}</AppText>
    </AppCard>
  );
}

export function CommunicationRecordCard({
  item,
  onPress,
}: {
  item: CommunicationRecord;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="title">
            {item.communicationType.replaceAll('_', ' ')}
          </AppText>
          <AppText color={theme.colors.textSecondary}>
            {item.recipientName ?? 'System notification'} ·{' '}
            {item.recipientMobileMasked ?? 'In app'}
          </AppText>
        </View>
        <AppBadge
          label={item.status.replaceAll('_', ' ')}
          status={item.status === 'FAILED' ? 'inactive' : 'active'}
        />
      </View>
      <AppText color={theme.colors.textSecondary} numberOfLines={2}>
        {item.renderedContent}
      </AppText>
      {onPress ? (
        <AppButton onPress={onPress} title="View details" variant="ghost" />
      ) : null}
    </AppCard>
  );
}

export function MessageTemplateCard({
  item,
  onPress,
}: {
  item: MessageTemplate;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="title">{item.name}</AppText>
          <AppText color={theme.colors.textSecondary}>
            {item.code} · {item.language}
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
      <AppText numberOfLines={3}>{item.content}</AppText>
      {onPress ? (
        <AppButton onPress={onPress} title="Open Template" variant="ghost" />
      ) : null}
    </AppCard>
  );
}

export function ReminderRuleCard({
  item,
  onPress,
}: {
  item: ReminderRule;
  onPress?: () => void;
}) {
  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="title">{item.name}</AppText>
          <AppText>
            {item.triggerType.replaceAll('_', ' ')} · {item.sendTime}
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'ACTIVE' ? 'active' : 'inactive'}
        />
      </View>
      {onPress ? (
        <AppButton onPress={onPress} title="View Rule" variant="ghost" />
      ) : null}
    </AppCard>
  );
}

export function ScheduledReminderCard({
  item,
  onPress,
}: {
  item: ScheduledReminder;
  onPress?: () => void;
}) {
  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="title">{item.scheduledFor}</AppText>
          <AppText>{item.recipientMobileMasked}</AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'FAILED' ? 'inactive' : 'active'}
        />
      </View>
      {onPress ? (
        <AppButton onPress={onPress} title="View Schedule" variant="ghost" />
      ) : null}
    </AppCard>
  );
}

export function NotificationCard({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AppCard style={styles.card} variant="outlined">
      <View style={styles.row}>
        <View style={styles.grow}>
          <AppText variant="title">{item.title}</AppText>
          <AppText color={theme.colors.textSecondary}>
            {item.createdAt.slice(0, 10)}
          </AppText>
        </View>
        <AppBadge
          label={item.status}
          status={item.status === 'UNREAD' ? 'draft' : 'active'}
        />
      </View>
      <AppText numberOfLines={2}>{item.message}</AppText>
      {onPress ? (
        <AppButton
          onPress={onPress}
          title="Open notification"
          variant="ghost"
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: 12 },
  grow: { flex: 1, gap: 3 },
  metric: { flexBasis: '47%', gap: 4, minWidth: 140 },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
});
