import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AllocationCard,
  CollectionMetric,
  CollectionSection,
  PaymentSummaryCard,
  ReceiptPaper,
  ReceiptSummaryCard,
  collectionMoney,
} from '../../components/collection/CollectionComponents';
import { AppBadge } from '../../components/common/AppBadge';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { FeeContextBar } from '../../components/feeSetup/FeeComponents';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useCollectionAccess } from '../../hooks/useCollectionAccess';
import { useCommunicationAccess } from '../../hooks/useCommunicationAccess';
import type {
  PaymentMode,
  ReceiptDetails,
  StudentLedgerEntryType,
} from '../../models/collection';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { getDownstreamMockAcademicSessions } from '../../services/academic/downstreamMockAcademicIdentity';
import {
  useAuthStore,
  useCollectionStore,
  useOrganizationStore,
  useStudentStore,
} from '../../store';
import { systemFeeDueClock } from '../../utils/feeDueClock';

const PAYMENT_MODES: PaymentMode[] = [
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CARD',
  'CHEQUE',
];
const today = () => systemFeeDueClock.today();
const parseRupees = (value: string) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return 0;
  const [rupees, paise = ''] = normalized.split('.');
  return Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
};

type ContextParams = {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  sessionStatus: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
  asOfDate?: string;
};

function useContext(params: ContextParams) {
  const setContext = useCollectionStore(state => state.setContext);
  useEffect(() => {
    setContext(
      {
        academicSessionId: params.academicSessionId,
        asOfDate: params.asOfDate ?? today(),
        branchId: params.branchId,
        schoolId: params.schoolId,
      },
      params.sessionStatus,
    );
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
  title,
  subtitle,
  onBack,
  testID,
  children,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  testID: string;
  children: React.ReactNode;
  onRefresh?: () => Promise<unknown> | void;
  refreshing?: boolean;
}) {
  return (
    <AppScreen
      onRefresh={onRefresh}
      refreshing={refreshing}
      scrollable
      testID={testID}
    >
      <View style={styles.maxWidth}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={onBack}
          subtitle={subtitle}
          title={title}
        />
        {children}
      </View>
    </AppScreen>
  );
}

function ErrorOrLoading({
  error,
  loading,
  message,
  retry,
}: {
  error?: { message: string } | null;
  loading: boolean;
  message: string;
  retry?: () => void;
}) {
  if (loading) return <LoadingView message={message} />;
  if (error) return <ErrorState message={error.message} onRetry={retry} />;
  return null;
}

function ContextBanner({ params }: { params: ContextParams }) {
  const branches = useOrganizationStore(state => state.branches.items);
  const sessions = getDownstreamMockAcademicSessions(params.schoolId);
  const school = useOrganizationStore(state => state.currentSchool);
  return (
    <FeeContextBar
      branch={
        branches.find(item => item.id === params.branchId)?.name ??
        params.branchId
      }
      closed={params.sessionStatus === 'CLOSED'}
      school={school?.name ?? params.schoolId}
      session={
        sessions.find(item => item.id === params.academicSessionId)?.name ??
        params.academicSessionId
      }
    />
  );
}

export function CollectionDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'CollectionDashboard'>) {
  const membership = useAuthStore(state => state.activeMembership);
  const branches = useOrganizationStore(state => state.branches.items);
  const sessions = getDownstreamMockAcademicSessions(route.params.schoolId);
  const school = useOrganizationStore(state => state.currentSchool);
  const loadSchool = useOrganizationStore(state => state.loadSchool);
  const loadBranches = useOrganizationStore(state => state.loadBranches);
  const [branchId, setBranchId] = useState(
    route.params.branchId ?? membership?.branchId,
  );
  const [sessionId, setSessionId] = useState(route.params.academicSessionId);
  const summary = useCollectionStore(state => state.dashboard);
  const error = useCollectionStore(state => state.error);
  const loading = useCollectionStore(state => state.isLoadingDashboard);
  const setContext = useCollectionStore(state => state.setContext);
  const load = useCollectionStore(state => state.loadDashboard);
  const branch = branches.find(item => item.id === branchId);
  const session = sessions.find(item => item.id === sessionId);
  const access = useCollectionAccess(route.params.schoolId, branchId ?? '');

  useEffect(() => {
    Promise.all([
      loadSchool(route.params.schoolId),
      loadBranches(route.params.schoolId),
    ]).catch(() => undefined);
  }, [loadBranches, loadSchool, route.params.schoolId]);
  useEffect(() => {
    if (!branchId)
      setBranchId(
        branches.find(
          item =>
            item.status === 'ACTIVE' &&
            (!membership?.branchId || item.id === membership.branchId),
        )?.id,
      );
    if (!sessionId)
      setSessionId(
        (sessions.find(item => item.status === 'ACTIVE') ?? sessions[0])?.id,
      );
  }, [branchId, branches, membership?.branchId, sessionId, sessions]);
  useEffect(() => {
    if (!branch || !session) return;
    setContext(
      {
        academicSessionId: session.id,
        asOfDate: route.params.asOfDate ?? today(),
        branchId: branch.id,
        schoolId: route.params.schoolId,
      },
      session.status,
    );
    load().catch(() => undefined);
  }, [
    branch,
    load,
    route.params.asOfDate,
    route.params.schoolId,
    session,
    setContext,
  ]);

  if (sessions.length === 0) {
    return <AppScreen testID="collection-dashboard-screen"><ErrorState message="Collections are still a demo module and have no mock academic identity matching this live school. No live academic IDs were sent to them." title="Demo context unavailable" /></AppScreen>;
  }

  if (!branch || !session)
    return (
      <AppScreen testID="collection-dashboard-screen">
        <LoadingView message="Resolving Collection context…" />
      </AppScreen>
    );
  const params: ContextParams = {
    academicSessionId: session.id,
    branchId: branch.id,
    schoolId: route.params.schoolId,
    sessionStatus: session.status,
    asOfDate: route.params.asOfDate,
  };
  const mode = (name: PaymentMode) =>
    summary?.modes.find(item => item.mode === name)?.amountPaise ?? 0;
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={load}
      refreshing={loading}
      subtitle="Payments, receipts and advance credit"
      testID="collection-dashboard-screen"
      title="Collection Dashboard"
    >
      <FeeContextBar
        branch={branch.name}
        closed={session.status === 'CLOSED'}
        school={school?.name ?? route.params.schoolId}
        session={session.name}
      />
      <AppText variant="label">Branch</AppText>
      <View style={styles.options}>
        {branches
          .filter(
            item =>
              item.status === 'ACTIVE' &&
              (!membership?.branchId || item.id === membership.branchId),
          )
          .map(item => (
            <AppButton
              key={item.id}
              onPress={() => setBranchId(item.id)}
              title={item.name}
              variant={item.id === branch.id ? 'primary' : 'outline'}
            />
          ))}
      </View>
      <AppText variant="label">Academic Session</AppText>
      <View style={styles.options}>
        {sessions.map(item => (
          <AppButton
            key={item.id}
            onPress={() => setSessionId(item.id)}
            title={`${item.name}${item.status === 'CLOSED' ? ' · Closed' : ''}`}
            variant={item.id === session.id ? 'primary' : 'outline'}
          />
        ))}
      </View>
      {loading && !summary ? (
        <LoadingView message="Loading Collection summary…" />
      ) : error && !summary ? (
        <ErrorState message={error.message} onRetry={load} />
      ) : summary ? (
        <>
          <View style={styles.metrics}>
            <CollectionMetric
              label="Today's Collection"
              value={collectionMoney(summary.netCollectionPaise)}
            />
            <CollectionMetric
              label="Cash"
              value={collectionMoney(mode('CASH'))}
            />
            <CollectionMetric
              label="UPI"
              value={collectionMoney(mode('UPI'))}
            />
            <CollectionMetric
              label="Bank Transfer"
              value={collectionMoney(mode('BANK_TRANSFER'))}
            />
            <CollectionMetric
              label="Card"
              value={collectionMoney(mode('CARD'))}
            />
            <CollectionMetric
              label="Cheque"
              value={collectionMoney(mode('CHEQUE'))}
            />
            <CollectionMetric
              label="Payments"
              value={String(summary.paymentCount)}
            />
            <CollectionMetric
              label="Advance Collected"
              value={collectionMoney(summary.advanceCollectedPaise)}
            />
            <CollectionMetric
              label="Reversed"
              value={collectionMoney(summary.reversedAmountPaise)}
            />
          </View>
          <CollectionSection title="Latest Payments">
            {summary.latestPayments.length ? (
              summary.latestPayments.map(item => (
                <PaymentSummaryCard item={item} key={item.payment.id} />
              ))
            ) : (
              <EmptyState
                description="Posted Payments will appear here."
                title="No Payments in this context"
              />
            )}
          </CollectionSection>
          <CollectionSection title="Recent Reversals">
            {summary.recentReversals.length ? (
              summary.recentReversals.map(item => (
                <AppCard key={item.id} variant="outlined">
                  <AppText variant="title">{item.reversalNumber}</AppText>
                  <AppText>
                    {collectionMoney(item.amountPaise)} · {item.reason}
                  </AppText>
                  <AppText variant="caption">
                    {item.reversedAt.slice(0, 10)} · {item.reversedByName}
                  </AppText>
                </AppCard>
              ))
            ) : (
              <AppText>No recent reversals.</AppText>
            )}
          </CollectionSection>
          <AppCard variant="outlined">
            <AppText variant="title">Available Advance</AppText>
            <AppText>
              {summary.studentsWithAdvance} Student(s) have unapplied credit.
            </AppText>
          </AppCard>
        </>
      ) : null}
      <View style={styles.actions}>
        {access.canCollect ? (
          <AppButton
            onPress={() => navigation.navigate(ROUTES.COLLECT_PAYMENT, params)}
            title="Quick Collect"
          />
        ) : null}
        {access.canViewPayments ? (
          <AppButton
            onPress={() => navigation.navigate(ROUTES.PAYMENTS, params)}
            title="Payments"
            variant="outline"
          />
        ) : null}
        {access.canViewReceipts ? (
          <AppButton
            onPress={() => navigation.navigate(ROUTES.RECEIPTS, params)}
            title="Receipts"
            variant="outline"
          />
        ) : null}
        {access.canViewDaily ? (
          <AppButton
            onPress={() => navigation.navigate(ROUTES.DAILY_COLLECTION, params)}
            title="Daily Collection"
            variant="outline"
          />
        ) : null}
      </View>
    </Shell>
  );
}

export function CollectPaymentScreen({
  navigation,
  route,
}: RoleScreenProps<'CollectPayment'>) {
  useContext(route.params);
  const students = useStudentStore(state => state.students.items);
  const loadStudents = useStudentStore(state => state.loadStudents);
  const loading = useStudentStore(state => state.isLoadingStudents);
  const [search, setSearch] = useState('');
  useEffect(() => {
    loadStudents(route.params.schoolId).catch(() => undefined);
  }, [loadStudents, route.params.schoolId]);
  const visible = students
    .filter(
      item =>
        !search ||
        item.profile.fullName.toLowerCase().includes(search.toLowerCase()) ||
        item.profile.admissionNumber
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .filter(
      item =>
        !route.params.branchId ||
        item.currentEnrollment?.branchId === route.params.branchId,
    );
  return (
    <Shell
      onBack={navigation.goBack}
      testID="collect-payment-screen"
      title="Collect Payment"
      subtitle="Step 1 of 5 · Student and context"
    >
      <ContextBanner params={route.params} />
      {route.params.sessionStatus === 'CLOSED' ? (
        <ErrorState
          message="Closed academic sessions are historical and read-only."
          title="Collection blocked"
        />
      ) : null}
      <AppSearchInput
        onChangeText={setSearch}
        placeholder="Search Student or admission number"
        value={search}
      />
      {loading ? (
        <LoadingView message="Loading Students…" />
      ) : visible.length ? (
        visible.map(item => (
          <AppCard key={item.profile.id} variant="outlined">
            <AppText variant="title">{item.profile.fullName}</AppText>
            <AppText>{item.profile.admissionNumber}</AppText>
            <AppText variant="caption">
              {item.currentEnrollment?.className ?? 'No class'} ·{' '}
              {item.currentEnrollment?.sectionName ?? 'No section'}
            </AppText>
            <AppButton
              disabled={route.params.sessionStatus === 'CLOSED'}
              onPress={() =>
                navigation.navigate(ROUTES.PAYMENT_DUE_SELECTION, {
                  ...route.params,
                  studentId: item.profile.id,
                })
              }
              title="Select Student"
              variant="outline"
            />
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="Try another search or branch."
          title="No Students found"
        />
      )}
    </Shell>
  );
}

export function PaymentDueSelectionScreen({
  navigation,
  route,
}: RoleScreenProps<'PaymentDueSelection'>) {
  useContext(route.params);
  const summary = useCollectionStore(state => state.collectableDues);
  const draft = useCollectionStore(state => state.paymentDraft);
  const load = useCollectionStore(state => state.loadCollectableDues);
  const update = useCollectionStore(state => state.updatePaymentInput);
  const loading = useCollectionStore(state => state.isLoadingCollectableDues);
  const error = useCollectionStore(state => state.error);
  const [includeUpcoming, setIncludeUpcoming] = useState(false);
  useEffect(() => {
    load(route.params.studentId, includeUpcoming).catch(() => undefined);
  }, [includeUpcoming, load, route.params.studentId]);
  const toggle = (id: string) =>
    update({
      feeDueIds: draft.input.feeDueIds.includes(id)
        ? draft.input.feeDueIds.filter(value => value !== id)
        : [...draft.input.feeDueIds, id],
    });
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() => load(route.params.studentId, includeUpcoming)}
      refreshing={loading}
      testID="payment-due-selection-screen"
      title="Select Fee Dues"
      subtitle="Step 2 of 5 · Fine-first allocation"
    >
      <ContextBanner params={route.params} />
      <ErrorOrLoading
        error={!summary ? error : null}
        loading={loading && !summary}
        message="Loading eligible Fee Dues…"
        retry={() => load(route.params.studentId, includeUpcoming)}
      />
      {summary ? (
        <AppCard variant="elevated">
          <AppText variant="title">{summary.studentName}</AppText>
          <AppText>
            {summary.admissionNumber} · {summary.className}{' '}
            {summary.sectionName}
          </AppText>
          <AppText>
            Outstanding {collectionMoney(summary.totalOutstandingPaise)} ·
            Advance {collectionMoney(summary.advanceBalancePaise)}
          </AppText>
        </AppCard>
      ) : null}
      <View style={styles.options}>
        <AppButton
          onPress={() => setIncludeUpcoming(value => !value)}
          title={includeUpcoming ? 'Hide Upcoming' : 'Include Upcoming'}
          variant="outline"
        />
        <AppButton
          onPress={() =>
            update({
              feeDueIds:
                summary?.dues
                  .filter(item =>
                    ['OVERDUE', 'PENDING', 'PARTIALLY_PAID'].includes(
                      item.due.status,
                    ),
                  )
                  .map(item => item.due.id) ?? [],
            })
          }
          title="Select Due Now"
          variant="outline"
        />
      </View>
      {summary?.dues.map(item => {
        const selected = draft.input.feeDueIds.includes(item.due.id);
        return (
          <AppCard
            key={item.due.id}
            variant={selected ? 'elevated' : 'outlined'}
          >
            <View style={styles.between}>
              <View style={styles.copy}>
                <AppText variant="title">
                  {item.due.feeHeadNameSnapshot}
                </AppText>
                <AppText>
                  {item.due.periodLabel} · Due {item.due.dueDate}
                </AppText>
                <AppText variant="caption">
                  Fee {collectionMoney(item.remainingFeePaise)} · Fine{' '}
                  {collectionMoney(item.remainingFinePaise)}
                </AppText>
              </View>
              <View style={styles.end}>
                <AppBadge
                  label={item.due.status.replace('_', ' ')}
                  status={
                    item.due.status === 'OVERDUE'
                      ? 'overdue'
                      : item.due.status === 'PARTIALLY_PAID'
                      ? 'partial'
                      : 'unpaid'
                  }
                />
                <AppText variant="title">
                  {collectionMoney(item.due.outstandingAmountPaise)}
                </AppText>
              </View>
            </View>
            <AppButton
              onPress={() => toggle(item.due.id)}
              title={selected ? 'Remove' : 'Select Due'}
              variant={selected ? 'secondary' : 'outline'}
            />
          </AppCard>
        );
      })}
      {summary && !summary.dues.length ? (
        <EmptyState
          description="Cancelled, waived and paid Dues are not collectable."
          title="No eligible Fee Dues"
        />
      ) : null}
      <AppButton
        disabled={!draft.input.feeDueIds.length}
        onPress={() =>
          navigation.navigate(ROUTES.PAYMENT_DETAILS_ENTRY, route.params)
        }
        title={`Continue with ${draft.input.feeDueIds.length} Due(s)`}
      />
    </Shell>
  );
}

export function PaymentDetailsEntryScreen({
  navigation,
  route,
}: RoleScreenProps<'PaymentDetailsEntry'>) {
  useContext(route.params);
  const draft = useCollectionStore(state => state.paymentDraft);
  const summary = useCollectionStore(state => state.collectableDues);
  const update = useCollectionStore(state => state.updatePaymentInput);
  const preview = useCollectionStore(state => state.previewAllocation);
  const loading = useCollectionStore(state => state.isPreviewingAllocation);
  const error = useCollectionStore(state => state.error);
  const [amount, setAmount] = useState(
    draft.input.amountPaise ? String(draft.input.amountPaise / 100) : '',
  );
  const submit = async () => {
    update({ amountPaise: parseRupees(amount) });
    await Promise.resolve();
    if (await preview())
      navigation.navigate(ROUTES.PAYMENT_ALLOCATION_REVIEW, route.params);
  };
  const manual = draft.input.allocationMode === 'MANUAL';
  return (
    <Shell
      onBack={navigation.goBack}
      testID="payment-details-entry-screen"
      title="Payment Details"
      subtitle="Step 3 of 5 · Confirmed received funds only"
    >
      <AppInput
        keyboardType="decimal-pad"
        label="Amount (₹)"
        onChangeText={setAmount}
        required
        value={amount}
      />
      <AppText variant="label">Payment Mode</AppText>
      <View style={styles.options}>
        {PAYMENT_MODES.map(mode => (
          <AppButton
            key={mode}
            onPress={() => update({ paymentMode: mode })}
            title={mode.replace('_', ' ')}
            variant={draft.input.paymentMode === mode ? 'primary' : 'outline'}
          />
        ))}
      </View>
      {draft.input.paymentMode !== 'CASH' &&
      draft.input.paymentMode !== 'CHEQUE' ? (
        <AppInput
          label="Transaction / Reference ID"
          onChangeText={value => update({ referenceNumber: value })}
          required
          value={draft.input.referenceNumber ?? ''}
        />
      ) : null}
      {draft.input.paymentMode === 'CHEQUE' ? (
        <>
          <AppInput
            label="Cheque Number"
            onChangeText={value => update({ chequeNumber: value })}
            required
            value={draft.input.chequeNumber ?? ''}
          />
          <AppInput
            label="Cheque Date (YYYY-MM-DD)"
            onChangeText={value => update({ chequeDate: value })}
            required
            value={draft.input.chequeDate ?? ''}
          />
          <AppInput
            label="Bank Name"
            onChangeText={value => update({ bankName: value })}
            required
            value={draft.input.bankName ?? ''}
          />
        </>
      ) : null}
      <AppInput
        label="Payment Date (YYYY-MM-DD)"
        onChangeText={value => update({ paymentDate: value })}
        required
        value={draft.input.paymentDate}
      />
      <AppInput
        label="Payer Name"
        onChangeText={value => update({ payerName: value })}
        value={draft.input.payerName ?? ''}
      />
      <AppInput
        keyboardType="phone-pad"
        label="Payer Mobile"
        onChangeText={value => update({ payerMobile: value })}
        value={draft.input.payerMobile ?? ''}
      />
      <AppInput
        label="Remarks"
        multiline
        onChangeText={value => update({ remarks: value })}
        value={draft.input.remarks ?? ''}
      />
      <AppText variant="label">Allocation</AppText>
      <View style={styles.options}>
        <AppButton
          onPress={() =>
            update({
              allocationMode: 'OLDEST_DUE_FIRST',
              manualAllocations: [],
            })
          }
          title="Oldest Due First"
          variant={!manual ? 'primary' : 'outline'}
        />
        <AppButton
          onPress={() =>
            update({
              allocationMode: 'MANUAL',
              manualAllocations: draft.input.feeDueIds.map(feeDueId => ({
                feeDueId,
                amountPaise: 0,
              })),
            })
          }
          title="Manual"
          variant={manual ? 'primary' : 'outline'}
        />
      </View>
      {manual
        ? summary?.dues
            .filter(item => draft.input.feeDueIds.includes(item.due.id))
            .map(item => {
              const value =
                draft.input.manualAllocations.find(
                  line => line.feeDueId === item.due.id,
                )?.amountPaise ?? 0;
              return (
                <AppInput
                  key={item.due.id}
                  helperText={`Maximum ${collectionMoney(
                    item.due.outstandingAmountPaise,
                  )}`}
                  keyboardType="decimal-pad"
                  label={`${item.due.feeHeadNameSnapshot} · ${item.due.periodLabel} (₹)`}
                  onChangeText={text =>
                    update({
                      manualAllocations: draft.input.manualAllocations.map(
                        line =>
                          line.feeDueId === item.due.id
                            ? { ...line, amountPaise: parseRupees(text) }
                            : line,
                      ),
                    })
                  }
                  value={value ? String(value / 100) : ''}
                />
              );
            })
        : null}
      <AppButton
        onPress={() =>
          update({ storeExcessAsAdvance: !draft.input.storeExcessAsAdvance })
        }
        title={
          draft.input.storeExcessAsAdvance
            ? 'Store Excess as Advance · Enabled'
            : 'Store Excess as Advance'
        }
        variant={draft.input.storeExcessAsAdvance ? 'secondary' : 'outline'}
      />
      {error ? (
        <ErrorState message={error.message} title="Check Payment details" />
      ) : null}
      <AppButton
        disabled={!parseRupees(amount)}
        loading={loading}
        onPress={submit}
        title="Review Allocation"
      />
    </Shell>
  );
}

export function PaymentAllocationReviewScreen({
  navigation,
  route,
}: RoleScreenProps<'PaymentAllocationReview'>) {
  useContext(route.params);
  const preview = useCollectionStore(state => state.allocationPreview);
  const post = useCollectionStore(state => state.postPayment);
  const loading = useCollectionStore(state => state.isPostingPayment);
  const error = useCollectionStore(state => state.error);
  const submit = async () => {
    if (await post()) navigation.replace(ROUTES.PAYMENT_SUCCESS, route.params);
  };
  return (
    <Shell
      onBack={navigation.goBack}
      testID="payment-allocation-review-screen"
      title="Allocation Review"
      subtitle="Step 4 of 5 · Fine first, Fee second"
    >
      {!preview ? (
        <ErrorState
          message="Return to Payment Details and create a fresh allocation preview."
          title="Preview unavailable"
        />
      ) : (
        <>
          <View style={styles.metrics}>
            <CollectionMetric
              label="Payment"
              value={collectionMoney(preview.paymentAmountPaise)}
            />
            <CollectionMetric
              label="Allocated"
              value={collectionMoney(preview.allocatedAmountPaise)}
            />
            <CollectionMetric
              label="Advance"
              value={collectionMoney(preview.advanceAmountPaise)}
            />
          </View>
          {preview.allocations.map(item => (
            <AllocationCard item={item} key={item.feeDueId} />
          ))}
          {preview.advanceAmountPaise > 0 ? (
            <AppCard variant="outlined">
              <AppText variant="title">Advance confirmation</AppText>
              <AppText>
                {collectionMoney(preview.advanceAmountPaise)} will remain as
                auditable, unapplied Student credit.
              </AppText>
            </AppCard>
          ) : null}
          {preview.unexplainedAmountPaise > 0 ? (
            <ErrorState
              message={`${collectionMoney(
                preview.unexplainedAmountPaise,
              )} must be removed or stored as Advance.`}
              title="Unexplained amount"
            />
          ) : null}
          {error ? (
            <ErrorState
              message={error.message}
              title="Payment was not posted"
            />
          ) : null}
          <AppButton
            disabled={!preview.isReconciled}
            loading={loading}
            onPress={submit}
            title="Confirm and Post Payment"
          />
        </>
      )}
    </Shell>
  );
}

export function PaymentSuccessScreen({
  navigation,
  route,
}: RoleScreenProps<'PaymentSuccess'>) {
  useContext(route.params);
  const result = useCollectionStore(state => state.paymentResult);
  const communicationAccess = useCommunicationAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  return (
    <Shell
      onBack={navigation.goBack}
      testID="payment-success-screen"
      title="Payment Posted"
      subtitle="Step 5 of 5 · Atomic posting complete"
    >
      {!result ? (
        <EmptyState
          description="The latest success record is no longer in memory."
          title="No Payment result"
        />
      ) : (
        <>
          <AppCard variant="elevated">
            <AppBadge label="POSTED" status="active" />
            <AppText variant="heading2">
              {collectionMoney(result.payment.amountPaise)}
            </AppText>
            <AppText variant="title">{result.payment.paymentNumber}</AppText>
            <AppText>{result.receipt.receiptNumber}</AppText>
            <AppText>
              {result.allocations.length} allocation(s) · Advance{' '}
              {collectionMoney(result.payment.advanceAmountPaise)}
            </AppText>
          </AppCard>
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.RECEIPT_PREVIEW, {
                ...route.params,
                receiptId: result.receipt.id,
              })
            }
            title="Preview Receipt"
          />
          {communicationAccess.canSendManual ? (
            <>
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                    ...route.params,
                    communicationType: 'PAYMENT_CONFIRMATION',
                    paymentId: result.payment.id,
                  })
                }
                title="Send Payment Confirmation"
                variant="outline"
              />
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                    ...route.params,
                    communicationType: 'RECEIPT_SHARE',
                    receiptId: result.receipt.id,
                  })
                }
                title="Share Receipt"
                variant="outline"
              />
            </>
          ) : null}
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.PAYMENT_DETAILS, {
                ...route.params,
                paymentId: result.payment.id,
              })
            }
            title="View Payment"
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.popTo(ROUTES.COLLECTION_DASHBOARD, {
                schoolId: route.params.schoolId,
                branchId: route.params.branchId,
                academicSessionId: route.params.academicSessionId,
                sessionStatus: route.params.sessionStatus,
              })
            }
            title="Collection Dashboard"
            variant="ghost"
          />
        </>
      )}
    </Shell>
  );
}

export function PaymentsScreen({
  navigation,
  route,
}: RoleScreenProps<'Payments'>) {
  useContext(route.params);
  const items = useCollectionStore(state => state.payments);
  const query = useCollectionStore(state => state.paymentQuery);
  const setQuery = useCollectionStore(state => state.setPaymentQuery);
  const load = useCollectionStore(state => state.loadPayments);
  const loading = useCollectionStore(state => state.isLoadingPayments);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load().catch(() => undefined);
  }, [
    load,
    query.collectedByUserId,
    query.dateFrom,
    query.dateTo,
    query.page,
    query.paymentMode,
    query.search,
    query.status,
  ]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={load}
      refreshing={loading}
      testID="payments-screen"
      title="Payments"
      subtitle="Immutable posting history"
    >
      <AppSearchInput
        onChangeText={search => setQuery({ page: 1, search })}
        placeholder="Student, admission, Payment, Receipt or reference"
        value={query.search ?? ''}
      />
      <View style={styles.options}>
        {(['ALL', 'POSTED', 'REVERSED'] as const).map(status => (
          <AppButton
            key={status}
            onPress={() => setQuery({ status })}
            title={status}
            variant={query.status === status ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppText variant="label">Payment Mode</AppText>
      <View style={styles.options}>
        {(['ALL', ...PAYMENT_MODES] as const).map(mode => (
          <AppButton
            key={mode}
            onPress={() => setQuery({ page: 1, paymentMode: mode })}
            title={mode.replace('_', ' ')}
            variant={
              query.paymentMode === mode ||
              (!query.paymentMode && mode === 'ALL')
                ? 'primary'
                : 'outline'
            }
          />
        ))}
      </View>
      <View style={styles.fieldRow}>
        <AppInput
          label="From (YYYY-MM-DD)"
          onChangeText={dateFrom => setQuery({ dateFrom, page: 1 })}
          value={query.dateFrom ?? ''}
        />
        <AppInput
          label="To (YYYY-MM-DD)"
          onChangeText={dateTo => setQuery({ dateTo, page: 1 })}
          value={query.dateTo ?? ''}
        />
      </View>
      <AppInput
        label="Collector User ID"
        onChangeText={collectedByUserId =>
          setQuery({ collectedByUserId, page: 1 })
        }
        value={query.collectedByUserId ?? ''}
      />
      <ErrorOrLoading
        error={!items.items.length ? error : null}
        loading={loading && !items.items.length}
        message="Loading Payments…"
        retry={load}
      />
      {items.items.length ? (
        items.items.map(item => (
          <View key={item.payment.id} style={styles.listItem}>
            <PaymentSummaryCard item={item} />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.PAYMENT_DETAILS, {
                  ...route.params,
                  paymentId: item.payment.id,
                })
              }
              title="View Payment"
              variant="outline"
            />
          </View>
        ))
      ) : !loading && !error ? (
        <EmptyState
          description="Adjust filters or collect the first Payment."
          title="No Payments"
        />
      ) : null}
      <AppText variant="caption">
        Page {items.page} of {Math.max(1, items.totalPages)} ·{' '}
        {items.totalItems} record(s)
      </AppText>
      <View style={styles.options}>
        <AppButton
          disabled={items.page <= 1}
          onPress={() => setQuery({ page: items.page - 1 })}
          title="Previous Page"
          variant="outline"
        />
        <AppButton
          disabled={items.page >= items.totalPages}
          onPress={() => setQuery({ page: items.page + 1 })}
          title="Next Page"
          variant="outline"
        />
      </View>
    </Shell>
  );
}

export function PaymentDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'PaymentDetails'>) {
  useContext(route.params);
  const details = useCollectionStore(state => state.currentPayment);
  const load = useCollectionStore(state => state.loadPayment);
  const loading = useCollectionStore(state => state.isLoadingPayment);
  const error = useCollectionStore(state => state.error);
  const access = useCollectionAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    load(route.params.paymentId).catch(() => undefined);
  }, [load, route.params.paymentId]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() => load(route.params.paymentId)}
      refreshing={loading}
      testID="payment-details-screen"
      title="Payment Details"
    >
      <ErrorOrLoading
        error={!details ? error : null}
        loading={loading && !details}
        message="Loading Payment…"
      />
      {details ? (
        <>
          <AppCard variant="elevated">
            <View style={styles.between}>
              <View>
                <AppText variant="title">
                  {details.payment.paymentNumber}
                </AppText>
                <AppText>
                  {details.payment.paymentDate} ·{' '}
                  {details.payment.paymentMode.replace('_', ' ')}
                </AppText>
                <AppText>
                  {details.payment.referenceNumber ??
                    details.payment.chequeNumber ??
                    'No reference'}
                </AppText>
              </View>
              <View style={styles.end}>
                <AppBadge
                  label={details.payment.status}
                  status={
                    details.payment.status === 'POSTED' ? 'active' : 'cancelled'
                  }
                />
                <AppText variant="heading2">
                  {collectionMoney(details.payment.amountPaise)}
                </AppText>
              </View>
            </View>
            <AppText>
              Allocated {collectionMoney(details.payment.allocatedAmountPaise)}{' '}
              · Advance {collectionMoney(details.payment.advanceAmountPaise)}
            </AppText>
            <AppText variant="caption">
              Collected by {details.payment.collectedByName}
            </AppText>
          </AppCard>
          <AppCard variant="outlined">
            <AppText variant="title">{details.studentName}</AppText>
            <AppText>
              {details.admissionNumber} · {details.className}{' '}
              {details.sectionName}
            </AppText>
            <AppText>{details.branchName}</AppText>
          </AppCard>
          <CollectionSection title="Allocations">
            {details.allocations.length ? (
              details.allocations.map(item => (
                <AppCard key={item.id} variant="outlined">
                  <View style={styles.between}>
                    <View style={styles.copy}>
                      <AppText variant="title">
                        {item.feeHeadNameSnapshot}
                      </AppText>
                      <AppText>
                        {item.periodLabelSnapshot} · Due {item.feeDueId}
                      </AppText>
                    </View>
                    <AppBadge
                      label={item.resultingDueStatus.replace('_', ' ')}
                      status={
                        item.resultingDueStatus === 'PAID'
                          ? 'paid'
                          : item.resultingDueStatus === 'PARTIALLY_PAID'
                          ? 'partial'
                          : 'unpaid'
                      }
                    />
                  </View>
                  <AppText>
                    Fine {collectionMoney(item.fineAmountAppliedPaise)} · Fee{' '}
                    {collectionMoney(item.feeAmountAppliedPaise)}
                  </AppText>
                  <AppText variant="title">
                    {collectionMoney(item.totalAppliedPaise)}
                  </AppText>
                </AppCard>
              ))
            ) : (
              <AppText>
                No Due allocations; amount was stored as Advance.
              </AppText>
            )}
          </CollectionSection>
          {details.advanceEntry ? (
            <AppCard variant="outlined">
              <AppText variant="title">Advance Credit</AppText>
              <AppText>
                {collectionMoney(details.advanceEntry.creditAmountPaise)} ·{' '}
                {details.advanceEntry.description}
              </AppText>
            </AppCard>
          ) : null}
          {details.ledgerEntries.length ? (
            <CollectionSection title="Related Ledger Entries">
              {details.ledgerEntries.map(item => (
                <AppCard key={item.id} variant="outlined">
                  <AppText variant="title">
                    {item.entryType.replaceAll('_', ' ')}
                  </AppText>
                  <AppText>{item.description}</AppText>
                </AppCard>
              ))}
            </CollectionSection>
          ) : null}
          {details.reversal ? (
            <AppCard variant="outlined">
              <AppText variant="title">
                Reversal {details.reversal.reversalNumber}
              </AppText>
              <AppText>{details.reversal.reason}</AppText>
            </AppCard>
          ) : null}
          <View style={styles.actions}>
            {details.receipt ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.RECEIPT_DETAILS, {
                    ...route.params,
                    receiptId: details.receipt!.id,
                  })
                }
                title="View Receipt"
                variant="outline"
              />
            ) : null}
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.STUDENT_LEDGER, {
                  ...route.params,
                  studentId: details.payment.studentId,
                })
              }
              title="Student Ledger"
              variant="outline"
            />
            {access.canReverse && details.payment.status === 'POSTED' ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.REVERSE_PAYMENT, route.params)
                }
                title="Reverse Payment"
                variant="danger"
              />
            ) : null}
          </View>
        </>
      ) : null}
    </Shell>
  );
}

export function ReversePaymentScreen({
  navigation,
  route,
}: RoleScreenProps<'ReversePayment'>) {
  useContext(route.params);
  const reverse = useCollectionStore(state => state.reversePayment);
  const loading = useCollectionStore(state => state.isReversingPayment);
  const error = useCollectionStore(state => state.error);
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (await reverse(route.params.paymentId, reason)) navigation.goBack();
  };
  return (
    <Shell
      onBack={navigation.goBack}
      testID="reverse-payment-screen"
      title="Reverse Payment"
      subtitle="Protected full reversal only"
    >
      <AppCard variant="outlined">
        <AppText variant="title">Original records will remain</AppText>
        <AppText>
          The full Payment will be reversed, allocated Dues recalculated, and
          the associated Receipt marked cancelled. No record is deleted.
        </AppText>
      </AppCard>
      <AppInput
        label="Reversal Reason"
        multiline
        onChangeText={setReason}
        required
        value={reason}
      />
      {error ? (
        <ErrorState message={error.message} title="Reversal blocked" />
      ) : null}
      <AppButton
        disabled={!reason.trim()}
        loading={loading}
        onPress={submit}
        title="Confirm Full Reversal"
        variant="danger"
      />
    </Shell>
  );
}

export function ReceiptsScreen({
  navigation,
  route,
}: RoleScreenProps<'Receipts'>) {
  useContext(route.params);
  const page = useCollectionStore(state => state.receipts);
  const query = useCollectionStore(state => state.receiptQuery);
  const setQuery = useCollectionStore(state => state.setReceiptQuery);
  const load = useCollectionStore(state => state.loadReceipts);
  const loading = useCollectionStore(state => state.isLoadingReceipts);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load().catch(() => undefined);
  }, [
    load,
    query.dateFrom,
    query.dateTo,
    query.page,
    query.paymentMode,
    query.search,
    query.status,
  ]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={load}
      refreshing={loading}
      testID="receipts-screen"
      title="Receipts"
      subtitle="Immutable snapshots"
    >
      <AppSearchInput
        onChangeText={search => setQuery({ page: 1, search })}
        placeholder="Receipt, Payment, Student or admission"
        value={query.search ?? ''}
      />
      <View style={styles.options}>
        {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map(status => (
          <AppButton
            key={status}
            onPress={() => setQuery({ status })}
            title={status}
            variant={query.status === status ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppText variant="label">Payment Mode</AppText>
      <View style={styles.options}>
        {(['ALL', ...PAYMENT_MODES] as const).map(mode => (
          <AppButton
            key={mode}
            onPress={() => setQuery({ page: 1, paymentMode: mode })}
            title={mode.replace('_', ' ')}
            variant={
              query.paymentMode === mode ||
              (!query.paymentMode && mode === 'ALL')
                ? 'primary'
                : 'outline'
            }
          />
        ))}
      </View>
      <View style={styles.fieldRow}>
        <AppInput
          label="From (YYYY-MM-DD)"
          onChangeText={dateFrom => setQuery({ dateFrom, page: 1 })}
          value={query.dateFrom ?? ''}
        />
        <AppInput
          label="To (YYYY-MM-DD)"
          onChangeText={dateTo => setQuery({ dateTo, page: 1 })}
          value={query.dateTo ?? ''}
        />
      </View>
      <ErrorOrLoading
        error={!page.items.length ? error : null}
        loading={loading && !page.items.length}
        message="Loading Receipts…"
        retry={load}
      />
      {page.items.length ? (
        page.items.map(item => (
          <View key={item.receipt.id} style={styles.listItem}>
            <ReceiptSummaryCard item={item} />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.RECEIPT_DETAILS, {
                  ...route.params,
                  receiptId: item.receipt.id,
                })
              }
              title="Open Receipt"
              variant="outline"
            />
          </View>
        ))
      ) : !loading && !error ? (
        <EmptyState
          description="Posted Payments create one Receipt each."
          title="No Receipts"
        />
      ) : null}
      <View style={styles.options}>
        <AppButton
          disabled={page.page <= 1}
          onPress={() => setQuery({ page: page.page - 1 })}
          title="Previous Page"
          variant="outline"
        />
        <AppButton
          disabled={page.page >= page.totalPages}
          onPress={() => setQuery({ page: page.page + 1 })}
          title="Next Page"
          variant="outline"
        />
      </View>
    </Shell>
  );
}

function ReceiptDetailsBody({
  details,
  preview,
}: {
  details: ReceiptDetails;
  preview?: boolean;
}) {
  return (
    <>
      {preview ? (
        <ReceiptPaper receipt={details.receipt} />
      ) : (
        <>
          <AppCard variant="elevated">
            <AppBadge
              label={details.receipt.status}
              status={
                details.receipt.status === 'ACTIVE' ? 'active' : 'cancelled'
              }
            />
            <AppText variant="heading2">
              {details.receipt.receiptNumber}
            </AppText>
            <AppText>
              {details.receipt.studentSnapshot.name} ·{' '}
              {details.receipt.studentSnapshot.admissionNumber}
            </AppText>
            <AppText>
              {details.receipt.issuedAt.slice(0, 10)} ·{' '}
              {details.receipt.paymentMode.replace('_', ' ')}
            </AppText>
            <AppText variant="heading2">
              {collectionMoney(details.receipt.paymentAmountPaise)}
            </AppText>
          </AppCard>
          {details.receipt.allocationSnapshots.map(item => (
            <AppCard key={item.feeDueId} variant="outlined">
              <AppText variant="title">{item.feeHeadName}</AppText>
              <AppText>{item.periodLabel}</AppText>
              <AppText>
                Fee {collectionMoney(item.feeAmountAppliedPaise)} · Fine{' '}
                {collectionMoney(item.fineAmountAppliedPaise)}
              </AppText>
            </AppCard>
          ))}
        </>
      )}
    </>
  );
}

export function ReceiptDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ReceiptDetails'>) {
  useContext(route.params);
  const details = useCollectionStore(state => state.currentReceipt);
  const load = useCollectionStore(state => state.loadReceipt);
  const loading = useCollectionStore(state => state.isLoadingReceipt);
  const error = useCollectionStore(state => state.error);
  const communicationAccess = useCommunicationAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    load(route.params.receiptId).catch(() => undefined);
  }, [load, route.params.receiptId]);
  return (
    <Shell
      onBack={navigation.goBack}
      testID="receipt-details-screen"
      title="Receipt Details"
    >
      <ErrorOrLoading
        error={!details ? error : null}
        loading={loading && !details}
        message="Loading Receipt…"
      />
      {details ? (
        <>
          <ReceiptDetailsBody details={details} />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.RECEIPT_PREVIEW, route.params)
            }
            title="Preview Document"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.PAYMENT_DETAILS, {
                ...route.params,
                paymentId: details.payment.id,
              })
            }
            title="View Payment"
            variant="outline"
          />
          {communicationAccess.canSendManual &&
          details.receipt.status === 'ACTIVE' ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                  ...route.params,
                  communicationType: 'RECEIPT_SHARE',
                  receiptId: details.receipt.id,
                })
              }
              title="Share Receipt"
              variant="outline"
            />
          ) : null}
          {communicationAccess.canViewHistory ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.COMMUNICATION_HISTORY, {
                  ...route.params,
                  receiptId: details.receipt.id,
                })
              }
              title="View Communication History"
              variant="ghost"
            />
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

export function ReceiptPreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ReceiptPreview'>) {
  useContext(route.params);
  const details = useCollectionStore(state => state.currentReceipt);
  const document = useCollectionStore(state => state.receiptDocument);
  const load = useCollectionStore(state => state.loadReceipt);
  const loadDocument = useCollectionStore(state => state.loadReceiptDocument);
  const loading = useCollectionStore(state => state.isLoadingReceiptDocument);
  const communicationAccess = useCommunicationAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    if (details?.receipt.id !== route.params.receiptId)
      load(route.params.receiptId).catch(() => undefined);
  }, [details?.receipt.id, load, route.params.receiptId]);
  return (
    <Shell
      onBack={navigation.goBack}
      testID="receipt-preview-screen"
      title="Receipt Preview"
      subtitle="Print-ready preview; backend PDF pending"
    >
      {details ? (
        <>
          <ReceiptDetailsBody details={details} preview />
          <AppButton
            loading={loading}
            onPress={() => loadDocument(route.params.receiptId)}
            title="Request Document Metadata"
            variant="outline"
          />
          {document ? (
            <AppCard variant="outlined">
              <AppText variant="title">
                {document.status.replace('_', ' ')}
              </AppText>
              <AppText>{document.message}</AppText>
              {document.developmentUri ? (
                <AppText variant="caption">{document.developmentUri}</AppText>
              ) : null}
            </AppCard>
          ) : null}
          {communicationAccess.canSendManual &&
          details.receipt.status === 'ACTIVE' ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MESSAGE_PREVIEW, {
                  ...route.params,
                  communicationType: 'RECEIPT_SHARE',
                  receiptId: details.receipt.id,
                })
              }
              title="Share Receipt"
            />
          ) : null}
        </>
      ) : (
        <LoadingView message="Loading Receipt preview…" />
      )}
    </Shell>
  );
}

export function StudentLedgerScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentLedger'>) {
  useContext(route.params);
  const ledger = useCollectionStore(state => state.ledger);
  const load = useCollectionStore(state => state.loadLedger);
  const loading = useCollectionStore(state => state.isLoadingLedger);
  const error = useCollectionStore(state => state.error);
  const [entryType, setEntryType] = useState<StudentLedgerEntryType | 'ALL'>(
    'ALL',
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [feeHeadId, setFeeHeadId] = useState('');
  useEffect(() => {
    load(route.params.studentId, {
      dateFrom,
      dateTo,
      entryType,
      feeHeadId,
    }).catch(() => undefined);
  }, [dateFrom, dateTo, entryType, feeHeadId, load, route.params.studentId]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() =>
        load(route.params.studentId, {
          dateFrom,
          dateTo,
          entryType,
          feeHeadId,
        })
      }
      refreshing={loading}
      testID="student-ledger-screen"
      title="Student Financial Ledger"
      subtitle="Append-only and read-only"
    >
      <ErrorOrLoading
        error={!ledger ? error : null}
        loading={loading && !ledger}
        message="Loading Student ledger…"
      />
      <AppText variant="label">Entry Type</AppText>
      <View style={styles.options}>
        {(
          [
            'ALL',
            'FEE_DUE_CREATED',
            'FINE_ACCRUED',
            'PAYMENT_ALLOCATED',
            'ADVANCE_APPLIED',
            'PAYMENT_REVERSED',
          ] as const
        ).map(value => (
          <AppButton
            key={value}
            onPress={() => setEntryType(value)}
            title={value.replaceAll('_', ' ')}
            variant={entryType === value ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <View style={styles.fieldRow}>
        <AppInput
          label="From (YYYY-MM-DD)"
          onChangeText={setDateFrom}
          value={dateFrom}
        />
        <AppInput
          label="To (YYYY-MM-DD)"
          onChangeText={setDateTo}
          value={dateTo}
        />
      </View>
      <AppInput
        helperText="Use a Fee Head ID to narrow applicable ledger entries."
        label="Fee Head"
        onChangeText={setFeeHeadId}
        value={feeHeadId}
      />
      {ledger ? (
        <>
          <AppCard variant="elevated">
            <AppText variant="title">
              {ledger.studentName} · {ledger.admissionNumber}
            </AppText>
            <View style={styles.metrics}>
              <CollectionMetric
                label="Fee Outstanding"
                value={collectionMoney(ledger.feeOutstandingPaise)}
              />
              <CollectionMetric
                label="Fine"
                value={collectionMoney(ledger.fineOutstandingPaise)}
              />
              <CollectionMetric
                label="Advance"
                value={collectionMoney(ledger.advanceBalancePaise)}
              />
              <CollectionMetric
                label="Net Position"
                value={collectionMoney(ledger.netFinancialPositionPaise)}
              />
            </View>
          </AppCard>
          {ledger.entries.map(item => (
            <AppCard key={item.id} variant="outlined">
              <View style={styles.between}>
                <View style={styles.copy}>
                  <AppText variant="title">
                    {item.entryType.replaceAll('_', ' ')}
                  </AppText>
                  <AppText>{item.description}</AppText>
                  <AppText variant="caption">
                    {item.effectiveDate}
                    {item.paymentId ? ` · ${item.paymentId}` : ''}
                  </AppText>
                </View>
                <View style={styles.end}>
                  <AppText>Debit {collectionMoney(item.debitPaise)}</AppText>
                  <AppText>Credit {collectionMoney(item.creditPaise)}</AppText>
                  <AppText variant="title">
                    Balance {collectionMoney(item.runningBalancePaise)}
                  </AppText>
                </View>
              </View>
            </AppCard>
          ))}
        </>
      ) : null}
    </Shell>
  );
}

export function StudentAdvanceCreditsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentAdvanceCredits'>) {
  useContext(route.params);
  const advance = useCollectionStore(state => state.advance);
  const load = useCollectionStore(state => state.loadAdvance);
  const loading = useCollectionStore(state => state.isLoadingAdvance);
  const error = useCollectionStore(state => state.error);
  const access = useCollectionAccess(
    route.params.schoolId,
    route.params.branchId,
  );
  useEffect(() => {
    load(route.params.studentId).catch(() => undefined);
  }, [load, route.params.studentId]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() => load(route.params.studentId)}
      refreshing={loading}
      testID="student-advance-credits-screen"
      title="Student Advance Credits"
      subtitle="Unapplied credit ledger"
    >
      <ErrorOrLoading
        error={!advance ? error : null}
        loading={loading && !advance}
        message="Loading Advance Credit…"
      />
      {advance ? (
        <>
          <AppCard variant="elevated">
            <AppText variant="title">
              {advance.studentName} · {advance.admissionNumber}
            </AppText>
            <AppText variant="heading2">
              {collectionMoney(advance.availableBalancePaise)}
            </AppText>
            <AppText variant="caption">AVAILABLE ADVANCE</AppText>
          </AppCard>
          {advance.entries.map(item => (
            <AppCard key={item.id} variant="outlined">
              <AppText variant="title">
                {item.entryType.replace('_', ' ')}
              </AppText>
              <AppText>{item.description}</AppText>
              <AppText>
                Credit {collectionMoney(item.creditAmountPaise)} · Debit{' '}
                {collectionMoney(item.debitAmountPaise)}
              </AppText>
              <AppText variant="caption">
                Balance {collectionMoney(item.runningBalancePaise)} ·{' '}
                {item.createdAt.slice(0, 10)}
              </AppText>
            </AppCard>
          ))}
          {access.canApplyAdvance ? (
            <AppButton
              disabled={!advance.availableBalancePaise}
              onPress={() =>
                navigation.navigate(ROUTES.APPLY_ADVANCE_CREDIT, route.params)
              }
              title="Apply Advance to Dues"
            />
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

export function ApplyAdvanceCreditScreen({
  navigation,
  route,
}: RoleScreenProps<'ApplyAdvanceCredit'>) {
  useContext(route.params);
  const dues = useCollectionStore(state => state.collectableDues);
  const preview = useCollectionStore(state => state.advancePreview);
  const loadDues = useCollectionStore(state => state.loadCollectableDues);
  const previewAdvance = useCollectionStore(state => state.previewAdvance);
  const apply = useCollectionStore(state => state.applyAdvance);
  const previewing = useCollectionStore(state => state.isPreviewingAdvance);
  const applying = useCollectionStore(state => state.isApplyingAdvance);
  const error = useCollectionStore(state => state.error);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    loadDues(route.params.studentId, true, 'ADVANCE').catch(() => undefined);
  }, [loadDues, route.params.studentId]);
  const createPreview = () =>
    previewAdvance(route.params.studentId, {
      academicSessionId: route.params.academicSessionId,
      asOfDate: route.params.asOfDate ?? today(),
      branchId: route.params.branchId,
      feeDueIds: selected,
      requestedByUserId: '',
    });
  const submit = async () => {
    if (await apply(route.params.studentId)) navigation.goBack();
  };
  return (
    <Shell
      onBack={navigation.goBack}
      testID="apply-advance-credit-screen"
      title="Apply Advance Credit"
      subtitle="No new cash Payment is created"
    >
      {dues?.dues.map(item => (
        <AppCard
          key={item.due.id}
          variant={selected.includes(item.due.id) ? 'elevated' : 'outlined'}
        >
          <AppText variant="title">
            {item.due.feeHeadNameSnapshot} · {item.due.periodLabel}
          </AppText>
          <AppText>
            {collectionMoney(item.due.outstandingAmountPaise)} outstanding
          </AppText>
          <AppButton
            onPress={() => {
              setSelected(values =>
                values.includes(item.due.id)
                  ? values.filter(id => id !== item.due.id)
                  : [...values, item.due.id],
              );
            }}
            title={selected.includes(item.due.id) ? 'Remove' : 'Select'}
            variant="outline"
          />
        </AppCard>
      ))}
      {preview ? (
        <>
          <CollectionSection title="Advance Allocation Preview">
            {preview.allocations.map(item => (
              <AllocationCard item={item} key={item.feeDueId} />
            ))}
          </CollectionSection>
          <AppText>
            Apply {collectionMoney(preview.amountToApplyPaise)} · Remaining
            Advance {collectionMoney(preview.remainingBalancePaise)}
          </AppText>
          <AppButton
            loading={applying}
            onPress={submit}
            title="Confirm Advance Application"
          />
        </>
      ) : (
        <AppButton
          disabled={!selected.length}
          loading={previewing}
          onPress={createPreview}
          title="Preview Advance Application"
        />
      )}
      {error ? (
        <ErrorState
          message={error.message}
          title="Advance operation unavailable"
        />
      ) : null}
    </Shell>
  );
}

export function DailyCollectionScreen({
  navigation,
  route,
}: RoleScreenProps<'DailyCollection'>) {
  useContext(route.params);
  const summary = useCollectionStore(state => state.dailyCollection);
  const load = useCollectionStore(state => state.loadDailyCollection);
  const loading = useCollectionStore(state => state.isLoadingDailyCollection);
  const error = useCollectionStore(state => state.error);
  const [date, setDate] = useState(route.params.asOfDate ?? today());
  useEffect(() => {
    load(date).catch(() => undefined);
  }, [date, load]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() => load(date)}
      refreshing={loading}
      testID="daily-collection-screen"
      title="Daily Collection"
      subtitle="Gross, reversals and net by branch"
    >
      <AppInput
        label="Collection Date (YYYY-MM-DD)"
        onChangeText={setDate}
        value={date}
      />
      <ErrorOrLoading
        error={!summary ? error : null}
        loading={loading && !summary}
        message="Loading Daily Collection…"
      />
      {summary ? (
        <>
          <View style={styles.metrics}>
            <CollectionMetric
              label="Posted"
              value={collectionMoney(summary.totalPostedPaymentsPaise)}
            />
            <CollectionMetric
              label="Advance"
              value={collectionMoney(summary.advanceCollectedPaise)}
            />
            <CollectionMetric
              label="Reversed"
              value={collectionMoney(summary.reversedAmountPaise)}
            />
            <CollectionMetric
              label="Net Collection"
              value={collectionMoney(summary.netCollectionPaise)}
            />
            <CollectionMetric
              label="Receipts"
              value={String(summary.receiptCount)}
            />
            <CollectionMetric
              label="Collectors"
              value={String(summary.collectorCount)}
            />
          </View>
          <CollectionSection title="Payment Modes">
            {summary.modes.map(item => (
              <AppCard key={item.mode} variant="outlined">
                <View style={styles.between}>
                  <AppText variant="title">
                    {item.mode.replace('_', ' ')}
                  </AppText>
                  <View style={styles.end}>
                    <AppText>{item.count} Payment(s)</AppText>
                    <AppText variant="title">
                      {collectionMoney(item.amountPaise)}
                    </AppText>
                  </View>
                </View>
              </AppCard>
            ))}
          </CollectionSection>
          <CollectionSection title="Collector Breakdown">
            {summary.collectors.map(item => (
              <AppCard key={item.userId} variant="outlined">
                <AppText variant="title">{item.name}</AppText>
                <AppText>{item.paymentCount} Payment(s)</AppText>
                <AppText>
                  Gross {collectionMoney(item.grossCollectionPaise)} · Reversed{' '}
                  {collectionMoney(item.reversedAmountPaise)}
                </AppText>
                <AppText variant="title">
                  Net {collectionMoney(item.netCollectionPaise)}
                </AppText>
              </AppCard>
            ))}
          </CollectionSection>
        </>
      ) : null}
    </Shell>
  );
}

export function ParentReceiptsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentReceipts'>) {
  const items = useCollectionStore(state => state.parentReceipts);
  const load = useCollectionStore(state => state.loadParentReceipts);
  const loading = useCollectionStore(state => state.isLoadingParentReceipts);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load(
      route.params.schoolId,
      route.params.parentMembershipId,
      route.params.studentId,
    ).catch(() => undefined);
  }, [
    load,
    route.params.parentMembershipId,
    route.params.schoolId,
    route.params.studentId,
  ]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() =>
        load(
          route.params.schoolId,
          route.params.parentMembershipId,
          route.params.studentId,
        )
      }
      refreshing={loading}
      testID="parent-receipts-screen"
      title="My Receipts"
      subtitle="Receipts for actively linked children"
    >
      <ErrorOrLoading
        error={!items.length ? error : null}
        loading={loading && !items.length}
        message="Loading family Receipts…"
      />
      {items.length ? (
        items.map(item => (
          <View key={item.receipt.id} style={styles.listItem}>
            <ReceiptSummaryCard item={item} />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.PARENT_RECEIPT_DETAILS, {
                  parentMembershipId: route.params.parentMembershipId,
                  receiptId: item.receipt.id,
                  schoolId: route.params.schoolId,
                })
              }
              title="Receipt Details"
              variant="outline"
            />
          </View>
        ))
      ) : !loading && !error ? (
        <EmptyState
          description="Posted Payments for linked children will appear here."
          title="No Receipts"
        />
      ) : null}
    </Shell>
  );
}

export function ParentReceiptDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ParentReceiptDetails'>) {
  const details = useCollectionStore(state => state.currentReceipt);
  const load = useCollectionStore(state => state.loadParentReceipt);
  const loading = useCollectionStore(state => state.isLoadingReceipt);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load(
      route.params.schoolId,
      route.params.parentMembershipId,
      route.params.receiptId,
    ).catch(() => undefined);
  }, [
    load,
    route.params.parentMembershipId,
    route.params.receiptId,
    route.params.schoolId,
  ]);
  return (
    <Shell
      onBack={navigation.goBack}
      testID="parent-receipt-details-screen"
      title="Receipt Details"
      subtitle="Read-only family access"
    >
      <ErrorOrLoading
        error={!details ? error : null}
        loading={loading && !details}
        message="Loading Receipt…"
      />
      {details ? <ReceiptPaper receipt={details.receipt} /> : null}
    </Shell>
  );
}

export function StudentReceiptsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentReceipts'>) {
  const items = useCollectionStore(state => state.studentReceipts);
  const load = useCollectionStore(state => state.loadStudentReceipts);
  const loading = useCollectionStore(state => state.isLoadingStudentReceipts);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load(route.params.schoolId, route.params.studentMembershipId).catch(
      () => undefined,
    );
  }, [load, route.params.schoolId, route.params.studentMembershipId]);
  return (
    <Shell
      onBack={navigation.goBack}
      onRefresh={() =>
        load(route.params.schoolId, route.params.studentMembershipId)
      }
      refreshing={loading}
      testID="student-receipts-screen"
      title="My Receipts"
      subtitle="Read-only Student access"
    >
      <ErrorOrLoading
        error={!items.length ? error : null}
        loading={loading && !items.length}
        message="Loading your Receipts…"
      />
      {items.length ? (
        items.map(item => (
          <View key={item.receipt.id} style={styles.listItem}>
            <ReceiptSummaryCard item={item} />
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.STUDENT_RECEIPT_DETAILS, {
                  receiptId: item.receipt.id,
                  schoolId: route.params.schoolId,
                  studentMembershipId: route.params.studentMembershipId,
                })
              }
              title="Receipt Details"
              variant="outline"
            />
          </View>
        ))
      ) : !loading && !error ? (
        <EmptyState
          description="Your posted Payment Receipts will appear here."
          title="No Receipts"
        />
      ) : null}
    </Shell>
  );
}

export function StudentReceiptDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentReceiptDetails'>) {
  const details = useCollectionStore(state => state.currentReceipt);
  const load = useCollectionStore(state => state.loadStudentReceipt);
  const loading = useCollectionStore(state => state.isLoadingReceipt);
  const error = useCollectionStore(state => state.error);
  useEffect(() => {
    load(
      route.params.schoolId,
      route.params.studentMembershipId,
      route.params.receiptId,
    ).catch(() => undefined);
  }, [
    load,
    route.params.receiptId,
    route.params.schoolId,
    route.params.studentMembershipId,
  ]);
  return (
    <Shell
      onBack={navigation.goBack}
      testID="student-receipt-details-screen"
      title="Receipt Details"
      subtitle="Read-only Student access"
    >
      <ErrorOrLoading
        error={!details ? error : null}
        loading={loading && !details}
        message="Loading Receipt…"
      />
      {details ? <ReceiptPaper receipt={details.receipt} /> : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10, marginTop: 8 },
  between: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  copy: { flex: 1, gap: 4 },
  end: { alignItems: 'flex-end', gap: 6 },
  fieldRow: { gap: 10 },
  listItem: { gap: 6 },
  maxWidth: { alignSelf: 'center', gap: 14, maxWidth: 880, width: '100%' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
