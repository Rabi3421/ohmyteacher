import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CommunicationMetric,
  CommunicationRecordCard,
  MessageTemplateCard,
  NotificationCard,
  ReminderRuleCard,
  ScheduledReminderCard,
} from '../../components/communication/CommunicationComponents';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import type {
  CreateMessageTemplateInput,
  CreateReminderRuleInput,
  MessageTemplate,
} from '../../models/communication';
import { TEMPLATE_VARIABLES } from '../../models/communication';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useCommunicationStore } from '../../store';
import { systemCommunicationClock } from '../../utils/communicationClock';

type ContextParams = {
  schoolId: string;
  branchId?: string;
  academicSessionId?: string;
  sessionStatus?: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  asOfDate?: string;
};

function useCommunicationContext(params: ContextParams) {
  const setContext = useCommunicationStore(state => state.setContext);
  useEffect(() => {
    setContext({
      academicSessionId: params.academicSessionId,
      asOfDate: params.asOfDate ?? systemCommunicationClock.today(),
      branchId: params.branchId,
      schoolId: params.schoolId,
      sessionStatus: params.sessionStatus,
    });
  }, [
    params.academicSessionId,
    params.asOfDate,
    params.branchId,
    params.schoolId,
    params.sessionStatus,
    setContext,
  ]);
}

function Shell({
  children,
  navigation,
  subtitle,
  testID,
  title,
}: {
  children: React.ReactNode;
  navigation: { goBack: () => void };
  subtitle?: string;
  testID: string;
  title: string;
}) {
  return (
    <AppScreen scrollable testID={testID}>
      <View style={styles.content}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          subtitle={subtitle}
          title={title}
        />
        {children}
      </View>
    </AppScreen>
  );
}

function Feedback() {
  const error = useCommunicationStore(state => state.error);
  const success = useCommunicationStore(state => state.successMessage);
  return (
    <>
      {error ? <ErrorState message={error.message} /> : null}
      {success ? (
        <AppCard variant="outlined">
          <AppText>{success}</AppText>
        </AppCard>
      ) : null}
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <AppText>{value ?? '—'}</AppText>
    </View>
  );
}

export function CommunicationDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'CommunicationDashboard'>) {
  useCommunicationContext(route.params);
  const summary = useCommunicationStore(state => state.dashboard);
  const loading = useCommunicationStore(state => state.isLoadingDashboard);
  const load = useCommunicationStore(state => state.loadDashboard);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  return (
    <Shell
      navigation={navigation}
      subtitle="Fee messages, reminders and notifications"
      testID="communication-dashboard-screen"
      title="Communication"
    >
      <Feedback />
      {loading && !summary ? (
        <LoadingView message="Loading Communication dashboard…" />
      ) : null}
      {summary ? (
        <>
          <View style={styles.metrics}>
            <CommunicationMetric
              label="Messages Today"
              value={summary.messagesToday}
            />
            <CommunicationMetric label="Scheduled" value={summary.scheduled} />
            <CommunicationMetric label="Queued" value={summary.queued} />
            <CommunicationMetric label="Sent" value={summary.sent} />
            <CommunicationMetric label="Delivered" value={summary.delivered} />
            <CommunicationMetric label="Failed" value={summary.failed} />
            <CommunicationMetric
              label="Manual Shares"
              value={summary.manualShares}
            />
            <CommunicationMetric
              label="Missing Contacts"
              value={summary.parentsWithoutValidContact}
            />
          </View>
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.MANUAL_FEE_REMINDER, route.params)
            }
            title="Quick Manual Reminder"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                ...route.params,
                communicationType: 'RECEIPT_SHARE',
              })
            }
            title="Quick Receipt Share"
            variant="outline"
          />
          <View style={styles.actions}>
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MESSAGE_TEMPLATES, {
                  schoolId: route.params.schoolId,
                })
              }
              title="Templates"
              variant="ghost"
            />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.REMINDER_RULES, route.params)
              }
              title="Reminder Rules"
              variant="ghost"
            />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.SCHEDULED_REMINDERS, route.params)
              }
              title="Scheduled"
              variant="ghost"
            />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.COMMUNICATION_HISTORY, route.params)
              }
              title="History"
              variant="ghost"
            />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.NOTIFICATION_CENTER, route.params)
              }
              title="Notifications"
              variant="ghost"
            />
          </View>
          <AppText variant="heading3">Recent communication</AppText>
          {summary.recent.map(item => (
            <CommunicationRecordCard
              item={item}
              key={item.id}
              onPress={() =>
                navigation.navigate(ROUTES.COMMUNICATION_DETAILS, {
                  ...route.params,
                  communicationId: item.id,
                })
              }
            />
          ))}
        </>
      ) : null}
    </Shell>
  );
}

export function CommunicationSettingsScreen({
  navigation,
  route,
}: RoleScreenProps<'CommunicationSettings'>) {
  useCommunicationContext({ schoolId: route.params.schoolId });
  const value = useCommunicationStore(state => state.settings);
  const load = useCommunicationStore(state => state.loadSettings);
  const save = useCommunicationStore(state => state.saveSettings);
  const saving = useCommunicationStore(state => state.isSavingSettings);
  const [draft, setDraft] = useState({
    defaultWhatsAppCountryCode: '+91',
    reminderTime: '09:00',
    reminderTimezone: 'Asia/Kolkata',
    schoolContactNumber: '',
  });
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  useEffect(() => {
    if (value)
      setDraft({
        defaultWhatsAppCountryCode: value.defaultWhatsAppCountryCode,
        reminderTime: value.reminderTime,
        reminderTimezone: value.reminderTimezone,
        schoolContactNumber: value.schoolContactNumber,
      });
  }, [value]);
  return (
    <Shell
      navigation={navigation}
      testID="communication-settings-screen"
      title="Communication Settings"
    >
      <Feedback />
      {value ? (
        <>
          <AppInput
            label="School contact"
            onChangeText={schoolContactNumber =>
              setDraft(current => ({ ...current, schoolContactNumber }))
            }
            value={draft.schoolContactNumber}
          />
          <AppInput
            label="Default country code"
            onChangeText={defaultWhatsAppCountryCode =>
              setDraft(current => ({
                ...current,
                defaultWhatsAppCountryCode,
              }))
            }
            value={draft.defaultWhatsAppCountryCode}
          />
          <AppButton
            onPress={() =>
              save({
                defaultLanguage:
                  value.defaultLanguage === 'ENGLISH' ? 'HINGLISH' : 'ENGLISH',
              })
            }
            title={`Default language: ${value.defaultLanguage}`}
            variant="outline"
          />
          <AppInput
            label="Reminder time (HH:mm)"
            onChangeText={reminderTime =>
              setDraft(current => ({ ...current, reminderTime }))
            }
            value={draft.reminderTime}
          />
          <AppInput
            label="Reminder timezone"
            onChangeText={reminderTimezone =>
              setDraft(current => ({ ...current, reminderTimezone }))
            }
            value={draft.reminderTimezone}
          />
          <Field
            label="Provider configuration"
            value={value.providerConfigurationStatus}
          />
          <AppText>
            Provider status is backend metadata. No provider credentials are
            stored in this app.
          </AppText>
          <Field
            label="Receipt link expiry"
            value={value.receiptLinkExpiryLabel}
          />
          <AppButton
            disabled={saving}
            onPress={() => save(draft)}
            title="Save Communication Settings"
          />
          <AppButton
            disabled={saving}
            onPress={() =>
              save({ manualShareEnabled: !value.manualShareEnabled })
            }
            title={`${
              value.manualShareEnabled ? 'Disable' : 'Enable'
            } Manual Share`}
            variant="outline"
          />
          <AppButton
            disabled={saving}
            onPress={() =>
              save({
                automatedReminderEnabled: !value.automatedReminderEnabled,
              })
            }
            title={`${
              value.automatedReminderEnabled ? 'Disable' : 'Enable'
            } Automated Reminders`}
            variant="outline"
          />
        </>
      ) : (
        <LoadingView message="Loading Communication Settings…" />
      )}
    </Shell>
  );
}

export function MessageTemplatesScreen({
  navigation,
  route,
}: RoleScreenProps<'MessageTemplates'>) {
  useCommunicationContext({ schoolId: route.params.schoolId });
  const values = useCommunicationStore(state => state.templates.items);
  const load = useCommunicationStore(state => state.loadTemplates);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  return (
    <Shell
      navigation={navigation}
      testID="message-templates-screen"
      title="Message Templates"
    >
      <Feedback />
      <AppButton
        onPress={() =>
          navigation.navigate(ROUTES.CREATE_MESSAGE_TEMPLATE, route.params)
        }
        title="Create Template"
      />
      {values.length ? (
        values.map(item => (
          <MessageTemplateCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.MESSAGE_TEMPLATE_DETAILS, {
                ...route.params,
                templateId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          title="No Templates"
          description="Create a controlled Fee communication Template."
        />
      )}
    </Shell>
  );
}

const defaultTemplateDraft: CreateMessageTemplateInput = {
  allowedVariables: [...TEMPLATE_VARIABLES],
  channel: 'WHATSAPP',
  code: '',
  communicationType: 'MANUAL_DUE_REMINDER',
  content: '',
  includeReceiptLink: false,
  includeSchoolContact: false,
  isDefault: false,
  language: 'ENGLISH',
  name: '',
  requiredVariables: [],
  status: 'ACTIVE',
};
function TemplateForm({
  id,
  navigation,
  schoolId,
}: {
  id?: string;
  navigation: { goBack: () => void };
  schoolId: string;
}) {
  useCommunicationContext({ schoolId });
  const draft = useCommunicationStore(state => state.templateDraft);
  const setDraft = useCommunicationStore(state => state.setTemplateDraft);
  const load = useCommunicationStore(state => state.loadTemplate);
  const save = useCommunicationStore(state => state.saveTemplate);
  const saving = useCommunicationStore(state => state.isSavingTemplate);
  useEffect(() => {
    if (id) load(id).catch(() => undefined);
    else setDraft(defaultTemplateDraft);
  }, [id, load, setDraft]);
  const types = [
    'PAYMENT_CONFIRMATION',
    'RECEIPT_SHARE',
    'UPCOMING_DUE_REMINDER',
    'DUE_DATE_REMINDER',
    'OVERDUE_REMINDER',
    'MANUAL_DUE_REMINDER',
    'FINE_UPDATED_NOTICE',
    'GENERAL_FEE_NOTICE',
  ] as const;
  return (
    <>
      <Feedback />
      <AppInput
        label="Name"
        onChangeText={name => setDraft({ name })}
        required
        value={draft.name ?? ''}
      />
      <AppInput
        autoCapitalize="characters"
        label="Code"
        onChangeText={code => setDraft({ code })}
        required
        value={draft.code ?? ''}
      />
      <AppButton
        onPress={() => {
          const currentType = types.includes(
            draft.communicationType as (typeof types)[number],
          )
            ? (draft.communicationType as (typeof types)[number])
            : types[0];
          const index = types.indexOf(currentType);
          setDraft({ communicationType: types[(index + 1) % types.length] });
        }}
        title={`Type: ${(draft.communicationType ?? types[0]).replaceAll(
          '_',
          ' ',
        )}`}
        variant="outline"
      />
      <AppButton
        onPress={() =>
          setDraft({
            language: draft.language === 'HINGLISH' ? 'ENGLISH' : 'HINGLISH',
          })
        }
        title={`Language: ${draft.language ?? 'ENGLISH'}`}
        variant="outline"
      />
      <AppInput
        label="Content"
        multiline
        onChangeText={content => setDraft({ content })}
        required
        value={draft.content ?? ''}
      />
      <AppInput
        helperText="Comma-separated registered names without braces."
        label="Required variables"
        onChangeText={value =>
          setDraft({
            requiredVariables: value
              .split(',')
              .map(item => item.trim())
              .filter((item): item is (typeof TEMPLATE_VARIABLES)[number] =>
                TEMPLATE_VARIABLES.includes(
                  item as (typeof TEMPLATE_VARIABLES)[number],
                ),
              ),
          })
        }
        value={draft.requiredVariables?.join(', ') ?? ''}
      />
      <AppText>
        Allowed variables are controlled. Expressions and unknown variables are
        rejected.
      </AppText>
      <AppButton
        onPress={() => setDraft({ isDefault: !draft.isDefault })}
        title={`Default Template: ${draft.isDefault ? 'YES' : 'NO'}`}
        variant="outline"
      />
      <AppButton
        disabled={saving}
        onPress={async () => {
          if (await save(id)) navigation.goBack();
        }}
        title={id ? 'Save Template' : 'Create Template'}
      />
    </>
  );
}
export function CreateMessageTemplateScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateMessageTemplate'>) {
  return (
    <Shell
      navigation={navigation}
      testID="create-message-template-screen"
      title="Create Template"
    >
      <TemplateForm navigation={navigation} schoolId={route.params.schoolId} />
    </Shell>
  );
}
export function EditMessageTemplateScreen({
  navigation,
  route,
}: RoleScreenProps<'EditMessageTemplate'>) {
  return (
    <Shell
      navigation={navigation}
      testID="edit-message-template-screen"
      title="Edit Template"
    >
      <TemplateForm
        id={route.params.templateId}
        navigation={navigation}
        schoolId={route.params.schoolId}
      />
    </Shell>
  );
}

export function MessageTemplateDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'MessageTemplateDetails'>) {
  useCommunicationContext({ schoolId: route.params.schoolId });
  const value = useCommunicationStore(state => state.selectedTemplate);
  const load = useCommunicationStore(state => state.loadTemplate);
  const status = useCommunicationStore(state => state.updateTemplateStatus);
  useEffect(() => {
    load(route.params.templateId).catch(() => undefined);
  }, [load, route.params.templateId]);
  return (
    <Shell
      navigation={navigation}
      testID="message-template-details-screen"
      title="Template Details"
    >
      <Feedback />
      {value ? (
        <>
          <MessageTemplateCard item={value} />
          <Field
            label="Required variables"
            value={value.requiredVariables
              .map(item => `{{${item}}}`)
              .join(', ')}
          />
          <Field label="Default" value={value.isDefault ? 'Yes' : 'No'} />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.EDIT_MESSAGE_TEMPLATE, route.params)
            }
            title="Edit Template"
          />
          <AppButton
            onPress={() =>
              status(
                value.id,
                value.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
              )
            }
            title={value.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            variant="outline"
          />
        </>
      ) : (
        <LoadingView message="Loading Template…" />
      )}
    </Shell>
  );
}

export function MessagePreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'MessagePreview'>) {
  useCommunicationContext(route.params);
  const setDraft = useCommunicationStore(state => state.setMessageDraft);
  const preview = useCommunicationStore(state => state.messagePreview);
  const previewMessage = useCommunicationStore(state => state.previewMessage);
  const send = useCommunicationStore(state => state.sendMessage);
  const loading = useCommunicationStore(state => state.isPreviewingMessage);
  const sending = useCommunicationStore(state => state.isSendingManualMessage);
  const initialType =
    route.params.communicationType ??
    (route.params.receiptId
      ? 'RECEIPT_SHARE'
      : route.params.paymentId
      ? 'PAYMENT_CONFIRMATION'
      : 'MANUAL_DUE_REMINDER');
  useEffect(() => {
    setDraft({
      branchId: route.params.branchId,
      communicationType: initialType,
      feeDueIds: route.params.feeDueIds,
      guardianId: route.params.guardianId,
      mode: route.params.mode ?? 'MANUAL_SHARE',
      paymentId: route.params.paymentId,
      receiptId: route.params.receiptId,
      studentId: route.params.studentId,
      templateId: route.params.templateId,
    });
  }, [
    initialType,
    route.params.branchId,
    route.params.feeDueIds,
    route.params.guardianId,
    route.params.mode,
    route.params.paymentId,
    route.params.receiptId,
    route.params.studentId,
    route.params.templateId,
    setDraft,
  ]);
  return (
    <Shell
      navigation={navigation}
      subtitle="Preview is mutation-free and expires before send"
      testID="message-preview-screen"
      title="Message Preview"
    >
      <Feedback />
      {preview ? (
        <>
          <AppCard variant="outlined">
            <AppText variant="title">{preview.template.name}</AppText>
            <AppText>{preview.renderedContent}</AppText>
            <Field
              label="Recipient"
              value={`${preview.recipient.guardianName} · ${preview.recipient.maskedMobile}`}
            />
            {preview.warnings.map(item => (
              <AppText key={item}>{item}</AppText>
            ))}
          </AppCard>
          <AppButton
            disabled={sending}
            onPress={send}
            title={
              preview.input.mode === 'MANUAL_SHARE'
                ? 'Open Device Share'
                : 'Send via Development Mock Provider'
            }
          />
        </>
      ) : (
        <AppButton
          disabled={loading}
          onPress={previewMessage}
          title="Generate Preview"
        />
      )}
    </Shell>
  );
}

export function ManualFeeReminderScreen({
  navigation,
  route,
}: RoleScreenProps<'ManualFeeReminder'>) {
  useCommunicationContext(route.params);
  const [studentId, setStudentId] = useState(route.params.studentId ?? '');
  const [guardianId, setGuardianId] = useState('');
  const [mode, setMode] = useState<'MANUAL_SHARE' | 'PROVIDER_SEND'>(
    'MANUAL_SHARE',
  );
  const setDraft = useCommunicationStore(state => state.setMessageDraft);
  return (
    <Shell
      navigation={navigation}
      testID="manual-fee-reminder-screen"
      title="Manual Fee Reminder"
    >
      <Feedback />
      <AppInput
        label="Student ID"
        onChangeText={setStudentId}
        required
        value={studentId}
      />
      <AppInput
        editable={false}
        label="Fee Due IDs"
        value={
          route.params.feeDueIds?.join(', ') ?? 'Complete current outstanding'
        }
      />
      <AppInput
        helperText="Optional; must be an active Guardian linked to this Student."
        label="Guardian ID"
        onChangeText={setGuardianId}
        value={guardianId}
      />
      <AppText>
        The current outstanding and recipient are revalidated at preview and
        again at handoff.
      </AppText>
      <AppButton
        onPress={() =>
          setMode(current =>
            current === 'MANUAL_SHARE' ? 'PROVIDER_SEND' : 'MANUAL_SHARE',
          )
        }
        title={
          mode === 'MANUAL_SHARE'
            ? 'Mode: Device Manual Share'
            : 'Mode: Development Mock Provider'
        }
        variant="outline"
      />
      <AppButton
        disabled={!studentId}
        onPress={() => {
          setDraft({
            branchId: route.params.branchId,
            communicationType: 'MANUAL_DUE_REMINDER',
            feeDueIds: route.params.feeDueIds,
            guardianId: guardianId || undefined,
            mode,
            studentId,
          });
          navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
            ...route.params,
            communicationType: 'MANUAL_DUE_REMINDER',
            feeDueIds: route.params.feeDueIds,
            guardianId: guardianId || undefined,
            mode,
            studentId,
          });
        }}
        title="Continue to Preview"
      />
    </Shell>
  );
}

export function BulkReminderSetupScreen({
  navigation,
  route,
}: RoleScreenProps<'BulkReminderSetup'>) {
  useCommunicationContext(route.params);
  const templates = useCommunicationStore(state => state.templates.items);
  const loadTemplates = useCommunicationStore(state => state.loadTemplates);
  const setDraft = useCommunicationStore(state => state.setBulkDraft);
  const draft = useCommunicationStore(state => state.bulkDraft);
  const preview = useCommunicationStore(state => state.previewBulk);
  useEffect(() => {
    loadTemplates().catch(() => undefined);
  }, [loadTemplates]);
  const template = templates.find(
    item =>
      item.communicationType === 'OVERDUE_REMINDER' && item.status === 'ACTIVE',
  );
  return (
    <Shell
      navigation={navigation}
      subtitle="Context → Due filters → Template → Recipient validation"
      testID="bulk-reminder-setup-screen"
      title="Bulk Reminder Setup"
    >
      <Feedback />
      <Field label="Branch" value={route.params.branchId} />
      <Field label="Academic Session" value={route.params.academicSessionId} />
      <AppInput
        keyboardType="number-pad"
        label="Minimum outstanding (paise)"
        onChangeText={value =>
          setDraft({ minimumOutstandingPaise: Number(value) || 0 })
        }
        value={String(draft.minimumOutstandingPaise ?? 0)}
      />
      <AppInput
        keyboardType="number-pad"
        label="Minimum days overdue"
        onChangeText={value =>
          setDraft({ minimumDaysOverdue: Number(value) || 0 })
        }
        value={String(draft.minimumDaysOverdue ?? 0)}
      />
      {(
        [
          ['Selected Student IDs', 'studentIds'],
          ['Fee Head IDs', 'feeHeadIds'],
          ['Class IDs', 'classIds'],
          ['Section IDs', 'sectionIds'],
          ['Due period keys', 'periodKeys'],
        ] as const
      ).map(([label, key]) => (
        <AppInput
          helperText="Comma-separated IDs; leave blank for all."
          key={key}
          label={label}
          onChangeText={value =>
            setDraft({
              [key]: value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean),
            })
          }
          value={draft[key]?.join(', ') ?? ''}
        />
      ))}
      <Field
        label="Template"
        value={template?.name ?? 'No active Overdue Template'}
      />
      <AppButton
        disabled={
          !route.params.branchId || !route.params.academicSessionId || !template
        }
        onPress={async () => {
          setDraft({
            academicSessionId: route.params.academicSessionId!,
            branchId: route.params.branchId!,
            dueStatuses: ['OVERDUE'],
            scheduledFor: `${
              route.params.asOfDate ?? systemCommunicationClock.today()
            }T09:00:00+05:30`,
            sessionStatus: route.params.sessionStatus,
            templateId: template!.id,
          });
          await Promise.resolve();
          if (await preview())
            navigation.navigate(ROUTES.BULK_REMINDER_PREVIEW, route.params);
        }}
        title="Preview Eligible Reminders"
      />
    </Shell>
  );
}

export function BulkReminderPreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'BulkReminderPreview'>) {
  useCommunicationContext(route.params);
  const value = useCommunicationStore(state => state.bulkPreview);
  const commit = useCommunicationStore(state => state.commitBulk);
  const loading = useCommunicationStore(
    state => state.isCommittingBulkReminder,
  );
  return (
    <Shell
      navigation={navigation}
      subtitle="No messages are created until commit"
      testID="bulk-reminder-preview-screen"
      title="Bulk Reminder Preview"
    >
      <Feedback />
      {value ? (
        <>
          <View style={styles.metrics}>
            <CommunicationMetric label="Candidates" value={value.candidates} />
            <CommunicationMetric label="Eligible" value={value.eligible} />
            <CommunicationMetric
              label="Missing Contact"
              value={value.missingContact}
            />
            <CommunicationMetric
              label="WhatsApp Disabled"
              value={value.whatsappDisabled}
            />
            <CommunicationMetric label="Duplicate" value={value.duplicate} />
            <CommunicationMetric label="Terminal" value={value.terminal} />
          </View>
          {value.items.map(item => (
            <AppCard key={item.feeDueId} variant="outlined">
              <AppText variant="title">{item.studentName}</AppText>
              <AppText>
                {item.eligible
                  ? `${item.guardianName} · ${item.recipientMobileMasked}`
                  : `Skipped: ${item.reason}`}
              </AppText>
            </AppCard>
          ))}
          <AppButton
            disabled={loading || !value.eligible}
            onPress={commit}
            title="Submit Backend Reminder Job"
          />
        </>
      ) : (
        <EmptyState
          title="Preview required"
          description="Return to setup and create a fresh, mutation-free preview."
        />
      )}
    </Shell>
  );
}

export function ReminderRulesScreen({
  navigation,
  route,
}: RoleScreenProps<'ReminderRules'>) {
  useCommunicationContext(route.params);
  const items = useCommunicationStore(state => state.reminderRules.items);
  const load = useCommunicationStore(state => state.loadReminderRules);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  return (
    <Shell
      navigation={navigation}
      testID="reminder-rules-screen"
      title="Reminder Rules"
    >
      <Feedback />
      <AppButton
        onPress={() =>
          navigation.navigate(ROUTES.CREATE_REMINDER_RULE, route.params)
        }
        title="Create Reminder Rule"
      />
      {items.map(item => (
        <ReminderRuleCard
          item={item}
          key={item.id}
          onPress={() =>
            navigation.navigate(ROUTES.EDIT_REMINDER_RULE, {
              ...route.params,
              reminderRuleId: item.id,
            })
          }
        />
      ))}
    </Shell>
  );
}

const defaultRuleDraft = (
  template?: MessageTemplate,
): Partial<CreateReminderRuleInput> => ({
  branchIds: [],
  code: '',
  communicationType: template?.communicationType ?? 'OVERDUE_REMINDER',
  dayOffset: 5,
  includeFine: true,
  maximumOccurrences: 1,
  minimumOutstandingPaise: 100,
  name: '',
  sendTime: '09:00',
  status: 'PAUSED',
  templateId: template?.id ?? '',
  timezone: 'Asia/Kolkata',
  triggerType: 'AFTER_DUE_DATE',
});
function RuleForm({
  id,
  navigation,
  params,
}: {
  id?: string;
  navigation: { goBack: () => void };
  params: ContextParams;
}) {
  useCommunicationContext(params);
  const templates = useCommunicationStore(state => state.templates.items);
  const loadTemplates = useCommunicationStore(state => state.loadTemplates);
  const draft = useCommunicationStore(state => state.reminderRuleDraft);
  const setDraft = useCommunicationStore(state => state.setReminderRuleDraft);
  const load = useCommunicationStore(state => state.loadReminderRule);
  const save = useCommunicationStore(state => state.saveReminderRule);
  useEffect(() => {
    loadTemplates().catch(() => undefined);
  }, [loadTemplates]);
  useEffect(() => {
    if (id) load(id).catch(() => undefined);
    else
      setDraft(
        defaultRuleDraft(
          templates.find(item => item.communicationType === 'OVERDUE_REMINDER'),
        ),
      );
  }, [id, load, setDraft, templates]);
  const activeTemplates = templates.filter(item => item.status === 'ACTIVE');
  const triggers = [
    'BEFORE_DUE_DATE',
    'ON_DUE_DATE',
    'AFTER_DUE_DATE',
    'RECURRING_OVERDUE',
  ] as const;
  return (
    <>
      <Feedback />
      <AppInput
        label="Name"
        onChangeText={name => setDraft({ name })}
        required
        value={draft.name ?? ''}
      />
      <AppInput
        autoCapitalize="characters"
        label="Code"
        onChangeText={code => setDraft({ code })}
        required
        value={draft.code ?? ''}
      />
      <AppInput
        keyboardType="number-pad"
        label="Day offset"
        onChangeText={value => setDraft({ dayOffset: Number(value) || 0 })}
        value={String(draft.dayOffset ?? 0)}
      />
      <AppButton
        onPress={() => {
          const index = triggers.indexOf(draft.triggerType ?? triggers[0]);
          setDraft({ triggerType: triggers[(index + 1) % triggers.length] });
        }}
        title={`Trigger: ${(draft.triggerType ?? triggers[0]).replaceAll(
          '_',
          ' ',
        )}`}
        variant="outline"
      />
      <AppButton
        disabled={!activeTemplates.length}
        onPress={() => {
          const current = activeTemplates.findIndex(
            item => item.id === draft.templateId,
          );
          const template =
            activeTemplates[(current + 1) % activeTemplates.length];
          setDraft({
            communicationType: template.communicationType,
            templateId: template.id,
          });
        }}
        title={`Template: ${
          templates.find(item => item.id === draft.templateId)?.name ??
          'Select active Template'
        }`}
        variant="outline"
      />
      {draft.triggerType === 'RECURRING_OVERDUE' ? (
        <>
          <AppInput
            keyboardType="number-pad"
            label="Repeat every days"
            onChangeText={value =>
              setDraft({ repeatEveryDays: Number(value) || 0 })
            }
            value={String(draft.repeatEveryDays ?? 7)}
          />
          <AppInput
            keyboardType="number-pad"
            label="Maximum occurrences"
            onChangeText={value =>
              setDraft({ maximumOccurrences: Number(value) || 0 })
            }
            value={String(draft.maximumOccurrences ?? 1)}
          />
        </>
      ) : null}
      <AppInput
        helperText="Comma-separated Branch IDs; blank applies to all allowed Branches."
        label="Branch IDs"
        onChangeText={value =>
          setDraft({
            branchIds: value
              .split(',')
              .map(item => item.trim())
              .filter(Boolean),
          })
        }
        value={draft.branchIds?.join(', ') ?? ''}
      />
      <Field label="Status" value={draft.status} />
      <AppText>
        New Rules start paused. Active Rules require automated reminders and an
        active compatible Template.
      </AppText>
      <AppButton
        onPress={async () => {
          if (await save(id)) navigation.goBack();
        }}
        title={id ? 'Save Reminder Rule' : 'Create Reminder Rule'}
      />
    </>
  );
}
export function CreateReminderRuleScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateReminderRule'>) {
  return (
    <Shell
      navigation={navigation}
      testID="create-reminder-rule-screen"
      title="Create Reminder Rule"
    >
      <RuleForm navigation={navigation} params={route.params} />
    </Shell>
  );
}
export function EditReminderRuleScreen({
  navigation,
  route,
}: RoleScreenProps<'EditReminderRule'>) {
  const status = useCommunicationStore(state => state.updateReminderRuleStatus);
  const selected = useCommunicationStore(state => state.selectedReminderRule);
  return (
    <Shell
      navigation={navigation}
      testID="edit-reminder-rule-screen"
      title="Edit Reminder Rule"
    >
      <RuleForm
        id={route.params.reminderRuleId}
        navigation={navigation}
        params={route.params}
      />
      {selected ? (
        <AppButton
          onPress={() =>
            status(
              selected.id,
              selected.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
            )
          }
          title={selected.status === 'ACTIVE' ? 'Pause Rule' : 'Activate Rule'}
          variant="outline"
        />
      ) : null}
    </Shell>
  );
}

export function ScheduledRemindersScreen({
  navigation,
  route,
}: RoleScreenProps<'ScheduledReminders'>) {
  useCommunicationContext(route.params);
  const items = useCommunicationStore(state => state.scheduledReminders.items);
  const load = useCommunicationStore(state => state.loadScheduledReminders);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      navigation={navigation}
      testID="scheduled-reminders-screen"
      title="Scheduled Reminders"
    >
      <Feedback />
      {items.map(item => (
        <ScheduledReminderCard
          item={item}
          key={item.id}
          onPress={() =>
            navigation.navigate(ROUTES.SCHEDULED_REMINDER_DETAILS, {
              ...route.params,
              scheduledReminderId: item.id,
            })
          }
        />
      ))}
    </Shell>
  );
}
export function ScheduledReminderDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ScheduledReminderDetails'>) {
  useCommunicationContext(route.params);
  const value = useCommunicationStore(state => state.selectedScheduledReminder);
  const load = useCommunicationStore(state => state.loadScheduledReminder);
  const cancel = useCommunicationStore(state => state.cancelScheduledReminder);
  useEffect(() => {
    load(route.params.scheduledReminderId).catch(() => undefined);
  }, [load, route.params.scheduledReminderId]);
  return (
    <Shell
      navigation={navigation}
      testID="scheduled-reminder-details-screen"
      title="Scheduled Reminder"
    >
      <Feedback />
      {value ? (
        <>
          <ScheduledReminderCard item={value.reminder} />
          <Field label="Rule" value={value.rule.name} />
          <Field
            label="Idempotency key"
            value={value.reminder.idempotencyKey}
          />
          {['SCHEDULED', 'QUEUED'].includes(value.reminder.status) ? (
            <AppButton
              onPress={() =>
                cancel(value.reminder.id, 'Cancelled by authorized staff')
              }
              title="Cancel Scheduled Reminder"
              variant="outline"
            />
          ) : null}
        </>
      ) : (
        <LoadingView message="Loading Scheduled Reminder…" />
      )}
    </Shell>
  );
}

export function CommunicationHistoryScreen({
  navigation,
  route,
}: RoleScreenProps<'CommunicationHistory'>) {
  useCommunicationContext(route.params);
  const setQuery = useCommunicationStore(state => state.setHistoryQuery);
  const items = useCommunicationStore(state => state.history.items);
  const load = useCommunicationStore(state => state.loadHistory);
  useEffect(() => {
    setQuery({
      branchId: route.params.branchId,
      feeDueId: route.params.feeDueId,
      paymentId: route.params.paymentId,
      receiptId: route.params.receiptId,
      studentId: route.params.studentId,
    });
    load().catch(() => undefined);
  }, [
    load,
    route.params.branchId,
    route.params.feeDueId,
    route.params.paymentId,
    route.params.receiptId,
    route.params.studentId,
    setQuery,
  ]);
  return (
    <Shell
      navigation={navigation}
      testID="communication-history-screen"
      title="Communication History"
    >
      <Feedback />
      {items.length ? (
        items.map(item => (
          <CommunicationRecordCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.COMMUNICATION_DETAILS, {
                ...route.params,
                communicationId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          title="No Communication"
          description="No Communication history matches this context."
        />
      )}
    </Shell>
  );
}
export function CommunicationDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'CommunicationDetails'>) {
  useCommunicationContext(route.params);
  const value = useCommunicationStore(state => state.selectedCommunication);
  const load = useCommunicationStore(state => state.loadCommunication);
  useEffect(() => {
    load(route.params.communicationId).catch(() => undefined);
  }, [load, route.params.communicationId]);
  return (
    <Shell
      navigation={navigation}
      testID="communication-details-screen"
      title="Communication Details"
    >
      <Feedback />
      {value ? (
        <>
          <CommunicationRecordCard item={value.communication} />
          <Field label="Mode" value={value.communication.mode} />
          <Field
            label="Provider status"
            value={value.communication.providerStatus}
          />
          <Field
            label="Template snapshot"
            value={`${value.communication.templateSnapshot.name} · ${value.communication.templateSnapshot.code}`}
          />
          <Field label="Attempt" value={value.communication.attemptNumber} />
          {value.retryEligible ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.RETRY_COMMUNICATION, {
                  ...route.params,
                  communicationId: value.communication.id,
                })
              }
              title="Review Retry"
            />
          ) : null}
        </>
      ) : (
        <LoadingView message="Loading Communication…" />
      )}
    </Shell>
  );
}
export function FailedCommunicationsScreen({
  navigation,
  route,
}: RoleScreenProps<'FailedCommunications'>) {
  useCommunicationContext(route.params);
  const items = useCommunicationStore(state => state.failedCommunications);
  const load = useCommunicationStore(state => state.loadFailedCommunications);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      navigation={navigation}
      testID="failed-communications-screen"
      title="Failed Communications"
    >
      <Feedback />
      {items.length ? (
        items.map(item => (
          <CommunicationRecordCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.RETRY_COMMUNICATION, {
                ...route.params,
                communicationId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          title="No failures"
          description="No failed Communications require attention."
        />
      )}
    </Shell>
  );
}
export function RetryCommunicationScreen({
  navigation,
  route,
}: RoleScreenProps<'RetryCommunication'>) {
  useCommunicationContext(route.params);
  const value = useCommunicationStore(state => state.selectedCommunication);
  const load = useCommunicationStore(state => state.loadCommunication);
  const retry = useCommunicationStore(state => state.retryCommunication);
  const loading = useCommunicationStore(state => state.isRetryingCommunication);
  useEffect(() => {
    load(route.params.communicationId).catch(() => undefined);
  }, [load, route.params.communicationId]);
  return (
    <Shell
      navigation={navigation}
      subtitle="Creates a new attempt; the failed record is preserved"
      testID="retry-communication-screen"
      title="Retry Communication"
    >
      <Feedback />
      {value ? (
        <>
          <CommunicationRecordCard item={value.communication} />
          <Field
            label="Retry eligible"
            value={value.retryEligible ? 'Yes' : value.retryReason}
          />
          <AppButton
            disabled={!value.retryEligible || loading}
            onPress={() => retry(value.communication.id)}
            title="Retry via Development Mock Provider"
          />
        </>
      ) : (
        <LoadingView message="Revalidating retry…" />
      )}
    </Shell>
  );
}

export function NotificationCenterScreen({
  navigation,
  route,
}: RoleScreenProps<'NotificationCenter'>) {
  useCommunicationContext(route.params);
  const values = useCommunicationStore(state => state.notifications.items);
  const load = useCommunicationStore(state => state.loadNotifications);
  const markAll = useCommunicationStore(
    state => state.markAllNotificationsRead,
  );
  const unread = useMemo(
    () => values.filter(item => item.status === 'UNREAD').length,
    [values],
  );
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  return (
    <Shell
      navigation={navigation}
      testID="notification-center-screen"
      title={`Notifications (${unread} unread)`}
    >
      <Feedback />
      <AppButton onPress={markAll} title="Mark all as read" variant="outline" />
      {values.map(item => (
        <NotificationCard
          item={item}
          key={item.id}
          onPress={() =>
            navigation.navigate(ROUTES.NOTIFICATION_DETAILS, {
              ...route.params,
              notificationId: item.id,
            })
          }
        />
      ))}
    </Shell>
  );
}
export function NotificationDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'NotificationDetails'>) {
  useCommunicationContext(route.params);
  const values = useCommunicationStore(state => state.notifications.items);
  const select = useCommunicationStore(state => state.selectNotification);
  const mark = useCommunicationStore(state => state.markNotificationRead);
  const archive = useCommunicationStore(state => state.archiveNotification);
  const value = values.find(item => item.id === route.params.notificationId);
  useEffect(() => {
    if (value) select(value);
  }, [select, value]);
  return (
    <Shell
      navigation={navigation}
      testID="notification-details-screen"
      title="Notification Details"
    >
      <Feedback />
      {value ? (
        <>
          <NotificationCard item={value} />
          <Field label="Student record" value={value.studentId} />
          <AppButton onPress={() => mark(value.id)} title="Mark as read" />
          <AppButton
            onPress={() => archive(value.id)}
            title="Archive"
            variant="outline"
          />
        </>
      ) : (
        <EmptyState
          title="Notification unavailable"
          description="Refresh the Notification Center in your authorized branch context."
        />
      )}
    </Shell>
  );
}

function OwnedNotifications({
  kind,
  membershipId,
  navigation,
  schoolId,
}: {
  kind: 'PARENT' | 'STUDENT';
  membershipId: string;
  navigation: { navigate: (...args: never[]) => void };
  schoolId: string;
}) {
  useCommunicationContext({ schoolId });
  const parent = useCommunicationStore(state => state.parentNotifications);
  const student = useCommunicationStore(state => state.studentNotifications);
  const loadParent = useCommunicationStore(
    state => state.loadParentNotifications,
  );
  const loadStudent = useCommunicationStore(
    state => state.loadStudentNotifications,
  );
  const values = kind === 'PARENT' ? parent : student;
  useEffect(() => {
    (kind === 'PARENT'
      ? loadParent(schoolId, membershipId)
      : loadStudent(schoolId, membershipId)
    ).catch(() => undefined);
  }, [kind, loadParent, loadStudent, membershipId, schoolId]);
  return (
    <>
      <Feedback />
      {values.map(item => (
        <NotificationCard
          item={item}
          key={item.id}
          onPress={() =>
            kind === 'PARENT'
              ? navigation.navigate(
                  ROUTES.PARENT_NOTIFICATION_DETAILS as never,
                  {
                    schoolId,
                    parentMembershipId: membershipId,
                    notificationId: item.id,
                  } as never,
                )
              : navigation.navigate(
                  ROUTES.STUDENT_NOTIFICATION_DETAILS as never,
                  {
                    schoolId,
                    studentMembershipId: membershipId,
                    notificationId: item.id,
                  } as never,
                )
          }
        />
      ))}
    </>
  );
}
export function ParentNotificationsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentNotifications'>) {
  return (
    <Shell
      navigation={navigation}
      testID="parent-notifications-screen"
      title="Parent Notifications"
    >
      <OwnedNotifications
        kind="PARENT"
        membershipId={route.params.parentMembershipId}
        navigation={navigation}
        schoolId={route.params.schoolId}
      />
    </Shell>
  );
}
export function ParentNotificationDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentNotificationDetails'>) {
  useCommunicationContext({ schoolId: route.params.schoolId });
  const values = useCommunicationStore(state => state.parentNotifications);
  const value = values.find(item => item.id === route.params.notificationId);
  const mark = useCommunicationStore(state => state.markNotificationRead);
  const archive = useCommunicationStore(state => state.archiveNotification);
  return (
    <Shell
      navigation={navigation}
      testID="parent-notification-details-screen"
      title="Parent Notification"
    >
      <Feedback />
      {value ? (
        <>
          <NotificationCard item={value} />
          <Field label="Child" value={value.studentId} />
          <AppButton onPress={() => mark(value.id)} title="Mark as read" />
          <AppButton
            onPress={() => archive(value.id)}
            title="Archive"
            variant="outline"
          />
        </>
      ) : (
        <EmptyState
          title="Notification unavailable"
          description="This notification is not addressed to the active Parent membership."
        />
      )}
    </Shell>
  );
}
export function StudentNotificationsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentNotifications'>) {
  return (
    <Shell
      navigation={navigation}
      testID="student-notifications-screen"
      title="Student Notifications"
    >
      <OwnedNotifications
        kind="STUDENT"
        membershipId={route.params.studentMembershipId}
        navigation={navigation}
        schoolId={route.params.schoolId}
      />
    </Shell>
  );
}
export function StudentNotificationDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentNotificationDetails'>) {
  useCommunicationContext({ schoolId: route.params.schoolId });
  const values = useCommunicationStore(state => state.studentNotifications);
  const value = values.find(item => item.id === route.params.notificationId);
  const mark = useCommunicationStore(state => state.markNotificationRead);
  const archive = useCommunicationStore(state => state.archiveNotification);
  return (
    <Shell
      navigation={navigation}
      testID="student-notification-details-screen"
      title="Student Notification"
    >
      <Feedback />
      {value ? (
        <>
          <NotificationCard item={value} />
          <AppButton onPress={() => mark(value.id)} title="Mark as read" />
          <AppButton
            onPress={() => archive(value.id)}
            title="Archive"
            variant="outline"
          />
        </>
      ) : (
        <EmptyState
          title="Notification unavailable"
          description="This notification is not addressed to the active Student membership."
        />
      )}
    </Shell>
  );
}

export const COMMUNICATION_SCREEN_NAMES = [
  'CommunicationDashboardScreen',
  'CommunicationSettingsScreen',
  'MessageTemplatesScreen',
  'CreateMessageTemplateScreen',
  'EditMessageTemplateScreen',
  'MessageTemplateDetailsScreen',
  'MessagePreviewScreen',
  'ManualFeeReminderScreen',
  'BulkReminderSetupScreen',
  'BulkReminderPreviewScreen',
  'ReminderRulesScreen',
  'CreateReminderRuleScreen',
  'EditReminderRuleScreen',
  'ScheduledRemindersScreen',
  'ScheduledReminderDetailsScreen',
  'CommunicationHistoryScreen',
  'CommunicationDetailsScreen',
  'FailedCommunicationsScreen',
  'RetryCommunicationScreen',
  'NotificationCenterScreen',
  'NotificationDetailsScreen',
  'ParentNotificationsScreen',
  'ParentNotificationDetailsScreen',
  'StudentNotificationsScreen',
  'StudentNotificationDetailsScreen',
] as const;

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  content: { alignSelf: 'center', gap: 16, maxWidth: 760, width: '100%' },
  field: { gap: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
