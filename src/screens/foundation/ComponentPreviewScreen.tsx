import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppAvatar } from '../../components/common/AppAvatar';
import { AppBadge, type BadgeStatus } from '../../components/common/AppBadge';
import {
  AppButton,
  type AppButtonVariant,
} from '../../components/common/AppButton';
import { AppChoiceChip } from '../../components/common/AppChoiceChip';
import { AppCard } from '../../components/common/AppCard';
import { AppDateField } from '../../components/common/AppDateField';
import { AppDivider } from '../../components/common/AppDivider';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppSelectField } from '../../components/common/AppSelectField';
import { AppText } from '../../components/common/AppText';
import { ConfirmationDialog } from '../../components/feedback/ConfirmationDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { InlineError } from '../../components/feedback/InlineError';
import { LoadingView } from '../../components/feedback/LoadingView';
import { AppIcon } from '../../components/icons/AppIcon';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { RootScreenProps } from '../../navigation/navigationTypes';
import { useAppStore } from '../../store';
import type { ThemeMode } from '../../theme';
import type { TypographyVariant } from '../../theme/typography';
import { formatCurrency } from '../../utils/currency';

const BUTTON_VARIANTS: readonly AppButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'danger',
];

const BADGE_STATUSES: readonly BadgeStatus[] = [
  'active',
  'inactive',
  'paid',
  'partial',
  'unpaid',
  'overdue',
  'draft',
  'completed',
  'locked',
  'published',
  'cancelled',
  'passed',
  'failed',
];

const TYPE_VARIANTS: readonly TypographyVariant[] = [
  'display',
  'heading1',
  'heading2',
  'heading3',
  'title',
  'subtitle',
  'body',
  'bodyMedium',
  'caption',
  'label',
  'button',
  'amountLarge',
  'amountMedium',
];

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

export function ComponentPreviewScreen({
  navigation,
}: RootScreenProps<'ComponentPreview'>) {
  const theme = useAppTheme();
  const themeMode = useAppStore(state => state.themeMode);
  const setThemeMode = useAppStore(state => state.setThemeMode);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('school@123');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>();
  const [date, setDate] = useState<string>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const colorTokens = [
    ['Primary', theme.colors.primary],
    ['Secondary', theme.colors.secondary],
    ['Background', theme.colors.background],
    ['Surface', theme.colors.surface],
    ['Success', theme.colors.success],
    ['Warning', theme.colors.warning],
    ['Error', theme.colors.error],
    ['Info', theme.colors.info],
  ] as const;

  return (
    <>
      <AppScreen
        contentContainerStyle={styles.screenContent}
        scrollable
        testID="component-preview-screen"
      >
        <View style={styles.maxWidth}>
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.radius.xl,
              },
              theme.shadows.md,
            ]}
          >
            <View style={styles.heroTop}>
              <AppAvatar name="Oh My Teacher" size={52} />
              <AppBadge label="Phase 1" status="active" />
            </View>
            <AppText color={theme.colors.textInverse} variant="heading1">
              Frontend Foundation
            </AppText>
            <AppText
              color={theme.colors.primarySubtle}
              style={styles.heroDescription}
            >
              Production-ready design tokens, form primitives, feedback states,
              navigation, services, and utility architecture.
            </AppText>
          </View>

          <PreviewSection
            subtitle="Light is complete; dark and system modes are architecturally ready."
            title="Theme"
          >
            <View style={styles.wrap}>
              {THEME_MODES.map(mode => (
                <AppChoiceChip
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={styles.compactButton}
                  label={mode[0].toUpperCase() + mode.slice(1)}
                  selected={themeMode === mode}
                />
              ))}
            </View>
            <View style={styles.colorGrid}>
              {colorTokens.map(([label, color]) => (
                <View key={label} style={styles.colorItem}>
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: color,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.md,
                      },
                    ]}
                  />
                  <AppText numberOfLines={1} variant="caption">
                    {label}
                  </AppText>
                </View>
              ))}
            </View>
          </PreviewSection>

          <PreviewSection title="Typography">
            <AppCard variant="outlined">
              {TYPE_VARIANTS.map((variant, index) => (
                <React.Fragment key={variant}>
                  <AppText
                    numberOfLines={1}
                    variant={variant}
                  >{`${variant} · OhMyTeacher`}</AppText>
                  {index < TYPE_VARIANTS.length - 1 ? (
                    <AppDivider inset={theme.spacing.sm} />
                  ) : null}
                </React.Fragment>
              ))}
            </AppCard>
          </PreviewSection>

          <PreviewSection
            subtitle="Variants, icons, loading, disabled and full-width behavior."
            title="Buttons"
          >
            <View style={styles.buttonStack}>
              {BUTTON_VARIANTS.map(variant => (
                <AppButton
                  key={variant}
                  fullWidth
                  leftIcon={
                    <AppIcon
                      color={
                        variant === 'outline' || variant === 'ghost'
                          ? theme.colors.primary
                          : theme.colors.textInverse
                      }
                      name="check"
                      size={theme.iconSizes.sm}
                    />
                  }
                  title={`${variant[0].toUpperCase()}${variant.slice(1)}`}
                  variant={variant}
                />
              ))}
              <AppButton fullWidth loading title="Saving" />
              <AppButton disabled fullWidth title="Disabled" />
            </View>
          </PreviewSection>

          <PreviewSection
            subtitle="Ready for controlled forms and backend validation errors."
            title="Form fields"
          >
            <View style={styles.fieldStack}>
              <AppInput
                helperText="Use the official school display name."
                label="School name"
                leftIcon={
                  <AppIcon
                    color={theme.colors.textSecondary}
                    name="school"
                    size={theme.iconSizes.sm}
                  />
                }
                onChangeText={setName}
                placeholder="e.g. Sunrise Public School"
                required
                value={name}
              />
              <AppInput
                label="Password"
                onChangeText={setPassword}
                secureTextEntry
                value={password}
              />
              <AppInput
                error="Enter a valid 10-digit Indian mobile number."
                keyboardType="phone-pad"
                label="Mobile number"
                placeholder="98765 43210"
              />
              <AppInput
                disabled
                label="School code"
                value="OMT-001"
              />
              <AppInput
                label="Notes"
                maxLength={240}
                multiline
                placeholder="Optional notes"
              />
              <AppSearchInput
                onChangeText={setSearch}
                placeholder="Search students"
                value={search}
              />
              <AppSelectField
                label="Class"
                onPress={() =>
                  setSelectedClass(current =>
                    current ? undefined : 'Class 10',
                  )
                }
                placeholder="Select class"
                required
                value={selectedClass}
              />
              <AppDateField
                label="Due date"
                onPress={() =>
                  setDate(current => (current ? undefined : '31 Jul 2026'))
                }
                value={date}
              />
              <InlineError message="This example shows a form-level validation error." />
            </View>
          </PreviewSection>

          <PreviewSection title="Cards and header">
            <View style={styles.cardStack}>
              <AppCard
                footer={
                  <AppText color={theme.colors.textSecondary} variant="caption">
                    Updated just now
                  </AppText>
                }
                header={<AppText variant="title">Default card</AppText>}
              >
                <AppText color={theme.colors.textSecondary}>
                  Optional headers and footers keep module layouts consistent.
                </AppText>
              </AppCard>
              <AppCard
                onPress={() =>
                  navigation.navigate('Placeholder', {
                    title: 'Future module placeholder',
                  })
                }
                variant="elevated"
              >
                <AppText variant="bodyMedium">Pressable elevated card</AppText>
                <AppText color={theme.colors.textSecondary} variant="caption">
                  Opens the typed placeholder route.
                </AppText>
              </AppCard>
              <AppHeader
                includeSafeArea={false}
                onBackPress={() => undefined}
                rightActions={<AppAvatar name="Asha Patel" size={36} />}
                subtitle="Academic Session 2026–27"
                title="Students"
              />
            </View>
          </PreviewSection>

          <PreviewSection title="Semantic badges">
            <View style={styles.wrap}>
              {BADGE_STATUSES.map(status => (
                <AppBadge key={status} status={status} />
              ))}
            </View>
          </PreviewSection>

          <PreviewSection title="Currency">
            <AppCard variant="outlined">
              <AppText variant="amountLarge">
                {formatCurrency(125000)}
              </AppText>
              <AppText
                color={theme.colors.textSecondary}
                style={styles.currencySecondary}
                variant="amountMedium"
              >
                {formatCurrency(1250)}
              </AppText>
              <AppText color={theme.colors.textSecondary} variant="caption">
                Indian locale with a safe formatting fallback.
              </AppText>
            </AppCard>
          </PreviewSection>

          <PreviewSection title="Feedback states">
            <View style={styles.cardStack}>
              <AppCard variant="outlined">
                <LoadingView compact message="Loading student records…" />
              </AppCard>
              <AppCard variant="outlined">
                <EmptyState
                  actionLabel="Add first item"
                  description="New module lists can reuse this empty state."
                  onAction={() => undefined}
                  title="No records yet"
                />
              </AppCard>
              <AppCard variant="outlined">
                <ErrorState
                  message="We couldn't load this information. Your saved work is safe."
                  onRetry={() => undefined}
                />
              </AppCard>
            </View>
          </PreviewSection>

          <PreviewSection title="Confirmation dialog">
            <AppButton
              fullWidth
              onPress={() => setShowConfirmation(true)}
              title="Open confirmation dialog"
              variant="danger"
            />
          </PreviewSection>

          <AppText
            align="center"
            color={theme.colors.textSecondary}
            style={styles.footerNote}
            variant="caption"
          >
            Development preview only · No Fee or Examination business UI
          </AppText>
        </View>
      </AppScreen>

      <ConfirmationDialog
        destructive
        message="This reusable dialog requires an explicit confirmation before a destructive action."
        onCancel={() => setShowConfirmation(false)}
        onConfirm={() => setShowConfirmation(false)}
        title="Confirm action"
        visible={showConfirmation}
      />
    </>
  );
}

interface PreviewSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function PreviewSection({
  title,
  subtitle,
  children,
}: PreviewSectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader subtitle={subtitle} title={title} />
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonStack: {
    gap: 10,
  },
  cardStack: {
    gap: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  colorItem: {
    width: '22%',
  },
  colorSwatch: {
    aspectRatio: 1.4,
    borderWidth: 1,
    marginBottom: 5,
    width: '100%',
  },
  compactButton: {
    minWidth: 98,
  },
  currencySecondary: {
    marginTop: 6,
  },
  fieldStack: {
    gap: 16,
  },
  footerNote: {
    marginBottom: 16,
    marginTop: 36,
  },
  hero: {
    marginTop: 8,
    padding: 24,
  },
  heroDescription: {
    marginTop: 8,
    maxWidth: 520,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  maxWidth: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  screenContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 32,
  },
  sectionContent: {
    marginTop: 14,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
