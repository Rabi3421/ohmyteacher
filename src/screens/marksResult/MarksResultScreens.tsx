import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import {
  AttendanceStatusSelector,
  ComponentMarksInput,
  GradeDistributionCard,
  MarkSheetProgressCard,
  MarkSheetStatusBadge,
  MarksContextBar,
  MarksValidationSummary,
  MarksVersionConflictDialog,
  RankListItem,
  ResultOutcomeBadge,
  ResultPublicationStatusBadge,
  ResultSummaryCard,
  StudentMarksEntryCard,
  StudentSubjectResultCard,
} from '../../components/marksResult/MarksResultComponents';
import { ROUTES } from '../../constants/routes';
import { useMarksResultAccess } from '../../hooks/useMarksResultAccess';
import type {
  ResultCalculationScope,
  StudentPaperMarkInput,
} from '../../models/marksResult';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useMarksResultStore } from '../../store';

type Params = RoleScreenProps<'MarksDashboard'>['route']['params'];
function useContext(params: Params) {
  const setContext = useMarksResultStore(state => state.setContext);
  useEffect(
    () =>
      setContext({
        academicSessionId: params.academicSessionId,
        branchId: params.branchId,
        examId: params.examId,
        examStatus: params.examStatus ?? 'SCHEDULED',
        schoolId: params.schoolId,
        sessionStatus: params.sessionStatus,
      }),
    [
      params.academicSessionId,
      params.branchId,
      params.examId,
      params.examStatus,
      params.schoolId,
      params.sessionStatus,
      setContext,
    ],
  );
}
function Shell({
  children,
  navigation,
  params,
  title,
  testID,
}: {
  children: React.ReactNode;
  navigation: { goBack: () => void };
  params: Params;
  title: string;
  testID: string;
}) {
  useContext(params);
  return (
    <AppScreen scrollable testID={testID}>
      <View style={styles.content}>
        <AppHeader
          includeSafeArea={false}
          onBackPress={navigation.goBack}
          title={title}
        />
        <MarksContextBar
          branch={params.branchId}
          exam={params.examId}
          readOnly={params.sessionStatus === 'CLOSED'}
          school={params.schoolId}
          session={params.academicSessionId}
        />
        {children}
      </View>
    </AppScreen>
  );
}
function Feedback() {
  const error = useMarksResultStore(s => s.error);
  const success = useMarksResultStore(s => s.successMessage);
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
      <AppText variant="caption">{label}</AppText>
      <AppText>{value ?? '—'}</AppText>
    </View>
  );
}
function ReasonAction({
  title,
  loading,
  onSubmit,
}: {
  title: string;
  loading: boolean;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <>
      <AppInput
        label="Reason"
        multiline
        onChangeText={setReason}
        required
        value={reason}
      />
      <AppButton
        disabled={!reason.trim()}
        loading={loading}
        onPress={() => onSubmit(reason)}
        title={title}
      />
    </>
  );
}

export function MarksDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'MarksDashboard'>) {
  const value = useMarksResultStore(s => s.dashboard);
  const load = useMarksResultStore(s => s.loadDashboard);
  const loading = useMarksResultStore(s => s.isLoadingMarksDashboard);
  useContext(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="marks-dashboard-screen"
      title="Marks Dashboard"
    >
      <Feedback />
      {loading ? (
        <LoadingView />
      ) : value ? (
        <>
          <AppCard>
            <AppText variant="subtitle">Mark Sheets</AppText>
            <AppText>
              {value.locked} locked · {value.submitted} submitted ·{' '}
              {value.draft} draft · {value.notStarted} not started
            </AppText>
            <AppText>
              {value.incompleteStudents} incomplete students ·{' '}
              {value.invalidMarks} invalid entries
            </AppText>
          </AppCard>
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.MARK_SHEETS, route.params)
            }
            title="View Mark Sheets"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(
                ROUTES.RESULT_PROCESSING_DASHBOARD,
                route.params,
              )
            }
            title="Result Processing"
            variant="outline"
          />
        </>
      ) : (
        <EmptyState
          description="No Mark Sheets are available for this Exam."
          title="No Marks setup"
        />
      )}
    </Shell>
  );
}

export function MarkSheetsScreen({
  navigation,
  route,
}: RoleScreenProps<'MarkSheets'>) {
  const page = useMarksResultStore(s => s.markSheets);
  const load = useMarksResultStore(s => s.loadMarkSheets);
  const loading = useMarksResultStore(s => s.isLoadingMarkSheets);
  useContext(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="mark-sheets-screen"
      title="Mark Sheets"
    >
      <Feedback />
      {loading ? (
        <LoadingView />
      ) : page.items.length ? (
        page.items.map(item => (
          <AppCard
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.MARK_SHEET_DETAILS, {
                ...route.params,
                markSheetId: item.id,
              })
            }
            variant="outlined"
          >
            <View style={styles.between}>
              <AppText variant="subtitle">{item.subjectNameSnapshot}</AppText>
              <MarkSheetStatusBadge status={item.status} />
            </View>
            <AppText>
              {item.classNameSnapshot} · {item.sectionNameSnapshot}
            </AppText>
            <AppText variant="caption">
              {item.completedStudentCount}/{item.studentCount} students complete
            </AppText>
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="No Mark Sheets match this filter."
          title="No Mark Sheets"
        />
      )}
    </Shell>
  );
}

export function MarkSheetDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'MarkSheetDetails'>) {
  const item = useMarksResultStore(s => s.selectedMarkSheet);
  const load = useMarksResultStore(s => s.loadMarkSheet);
  const loading = useMarksResultStore(s => s.isLoadingMarkSheet);
  useContext(route.params);
  useEffect(() => {
    load(route.params.markSheetId).catch(() => undefined);
  }, [load, route.params.markSheetId]);
  const access = useMarksResultAccess({
    ...route.params,
    examStatus: route.params.examStatus ?? 'SCHEDULED',
    markSheetStatus: item?.status,
  });
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="mark-sheet-details-screen"
      title="Mark Sheet Details"
    >
      <Feedback />
      {loading ? (
        <LoadingView />
      ) : item ? (
        <>
          <View style={styles.between}>
            <AppText variant="title">{item.subjectNameSnapshot}</AppText>
            <MarkSheetStatusBadge status={item.status} />
          </View>
          <Field
            label="Class / Section"
            value={`${item.classNameSnapshot} / ${item.sectionNameSnapshot}`}
          />
          <Field
            label="Maximum / Pass"
            value={`${item.paperMaximumMarksSnapshot} / ${item.paperPassMarksSnapshot}`}
          />
          <MarkSheetProgressCard
            completed={item.completedStudentCount}
            total={item.studentCount}
          />
          {access.canEnterMarks ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MARKS_ENTRY, route.params)
              }
              title="Enter Marks"
            />
          ) : null}
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.MARKS_ENTRY_REVIEW, route.params)
            }
            title="Review Marks"
            variant="outline"
          />
          {access.canViewMarksHistory ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.MARK_SHEET_HISTORY, route.params)
              }
              title="View History"
              variant="outline"
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          description="The Mark Sheet could not be found."
          title="Mark Sheet unavailable"
        />
      )}
    </Shell>
  );
}

export function MarksEntryScreen({
  navigation,
  route,
}: RoleScreenProps<'MarksEntry'>) {
  const sheet = useMarksResultStore(s => s.selectedMarkSheet);
  const draft = useMarksResultStore(s => s.marksDraft);
  const setDraft = useMarksResultStore(s => s.setMarksDraft);
  const load = useMarksResultStore(s => s.loadMarkSheet);
  const save = useMarksResultStore(s => s.saveDraft);
  const saving = useMarksResultStore(s => s.isSavingDraft);
  const conflict = useMarksResultStore(s => s.isVersionConflict);
  const access = useMarksResultAccess({
    ...route.params,
    examStatus: route.params.examStatus ?? 'SCHEDULED',
    markSheetStatus: sheet?.status,
  });
  useContext(route.params);
  useEffect(() => {
    if (sheet?.id !== route.params.markSheetId)
      load(route.params.markSheetId).catch(() => undefined);
  }, [load, route.params.markSheetId, sheet?.id]);
  const update = (index: number, value: StudentPaperMarkInput) =>
    setDraft(
      draft.map((item, itemIndex) => (itemIndex === index ? value : item)),
    );
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="marks-entry-screen"
      title="Marks Entry"
    >
      <Feedback />
      <MarksVersionConflictDialog
        onReload={() => load(route.params.markSheetId, true)}
        visible={conflict}
      />
      {sheet ? (
        sheet.students.map((student, index) => {
          const mark = draft[index];
          if (!mark) return null;
          return (
            <StudentMarksEntryCard
              admissionNumber={student.admissionNumber}
              key={student.studentId}
              name={student.studentName}
            >
              <AttendanceStatusSelector
                allowExempt={access.canExemptStudent}
                disabled={!access.canEnterMarks}
                onChange={attendanceStatus =>
                  update(index, {
                    ...mark,
                    attendanceStatus,
                    componentMarks:
                      attendanceStatus === 'PRESENT'
                        ? mark.componentMarks
                        : mark.componentMarks.map(component => ({
                            ...component,
                            marksObtained: undefined,
                          })),
                  })
                }
                value={mark.attendanceStatus}
              />
              {mark.attendanceStatus === 'PRESENT'
                ? student.mark.componentMarks.map(
                    (component, componentIndex) => (
                      <ComponentMarksInput
                        disabled={!access.canEnterMarks}
                        key={component.assessmentComponentId}
                        label={component.componentNameSnapshot}
                        maximum={component.maximumMarksSnapshot}
                        onChange={marksObtained =>
                          update(index, {
                            ...mark,
                            componentMarks: mark.componentMarks.map(
                              (entry, i) =>
                                i === componentIndex
                                  ? { ...entry, marksObtained }
                                  : entry,
                            ),
                          })
                        }
                        value={
                          mark.componentMarks[componentIndex]?.marksObtained
                        }
                      />
                    ),
                  )
                : null}
              {mark.attendanceStatus === 'EXEMPT' ? (
                <AppInput
                  disabled={!access.canEnterMarks}
                  label="Exemption reason"
                  onChangeText={exemptionReason =>
                    update(index, { ...mark, exemptionReason })
                  }
                  required
                  value={mark.exemptionReason ?? ''}
                />
              ) : null}
            </StudentMarksEntryCard>
          );
        })
      ) : (
        <LoadingView />
      )}
      <AppButton
        disabled={!access.canEnterMarks}
        loading={saving}
        onPress={() => save()}
        title="Save Draft"
      />
      <AppButton
        onPress={() =>
          navigation.navigate(ROUTES.MARKS_ENTRY_REVIEW, route.params)
        }
        title="Review Entries"
        variant="outline"
      />
    </Shell>
  );
}

export function MarksEntryReviewScreen({
  navigation,
  route,
}: RoleScreenProps<'MarksEntryReview'>) {
  const item = useMarksResultStore(s => s.selectedMarkSheet);
  const load = useMarksResultStore(s => s.loadMarkSheet);
  const returnToDraft = useMarksResultStore(s => s.returnMarkSheetToDraft);
  const returning = useMarksResultStore(s => s.isReturningMarkSheetToDraft);
  const access = useMarksResultAccess({
    ...route.params,
    examStatus: route.params.examStatus ?? 'SCHEDULED',
    markSheetStatus: item?.status,
  });
  useContext(route.params);
  useEffect(() => {
    load(route.params.markSheetId).catch(() => undefined);
  }, [load, route.params.markSheetId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="marks-entry-review-screen"
      title="Marks Entry Review"
    >
      <Feedback />
      {item ? (
        <>
          <MarksValidationSummary
            complete={item.validation.isComplete && item.validation.isValid}
            issues={item.validation.issues}
          />
          <Field
            label="Present / Absent / Exempt"
            value={`${item.presentCount} / ${item.absentCount} / ${item.exemptCount}`}
          />
          <Field
            label="Highest / Average / Lowest"
            value={`${item.reviewSummary.highestMarks ?? '—'} / ${
              item.reviewSummary.averageMarks ?? '—'
            } / ${item.reviewSummary.lowestMarks ?? '—'}`}
          />
          {access.canSubmitMarks ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.SUBMIT_MARK_SHEET, route.params)
              }
              title="Submit Mark Sheet"
            />
          ) : null}
          {access.canLockMarks ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.LOCK_MARK_SHEET, route.params)
              }
              title="Lock Mark Sheet"
            />
          ) : null}
          {access.canReturnMarksToDraft ? (
            <ReasonAction
              loading={returning}
              onSubmit={reason => returnToDraft(reason)}
              title="Return to Draft"
            />
          ) : null}
          {access.canUnlockMarks ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.UNLOCK_MARK_SHEET, route.params)
              }
              title="Unlock Mark Sheet"
              variant="danger"
            />
          ) : null}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}
export function SubmitMarkSheetScreen({
  navigation,
  route,
}: RoleScreenProps<'SubmitMarkSheet'>) {
  const action = useMarksResultStore(s => s.submitMarkSheet);
  const loading = useMarksResultStore(s => s.isSubmittingMarkSheet);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="submit-mark-sheet-screen"
      title="Submit Mark Sheet"
    >
      <Feedback />
      <AppText>
        Submission freezes entry until the sheet is returned to Draft.
      </AppText>
      <AppButton
        loading={loading}
        onPress={async () => {
          if (await action()) navigation.goBack();
        }}
        title="Confirm Submit"
      />
    </Shell>
  );
}
export function LockMarkSheetScreen({
  navigation,
  route,
}: RoleScreenProps<'LockMarkSheet'>) {
  const action = useMarksResultStore(s => s.lockMarkSheet);
  const loading = useMarksResultStore(s => s.isLockingMarkSheet);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="lock-mark-sheet-screen"
      title="Lock Mark Sheet"
    >
      <Feedback />
      <AppText>
        Locked Marks become the immutable source for Result calculation.
      </AppText>
      <AppButton
        loading={loading}
        onPress={async () => {
          if (await action()) navigation.goBack();
        }}
        title="Confirm Lock"
      />
    </Shell>
  );
}
export function UnlockMarkSheetScreen({
  navigation,
  route,
}: RoleScreenProps<'UnlockMarkSheet'>) {
  const action = useMarksResultStore(s => s.unlockMarkSheet);
  const loading = useMarksResultStore(s => s.isUnlockingMarkSheet);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="unlock-mark-sheet-screen"
      title="Unlock Mark Sheet"
    >
      <Feedback />
      <AppText>
        Unlocking makes existing calculated Results stale. Active publications
        must be unpublished first.
      </AppText>
      <ReasonAction
        loading={loading}
        onSubmit={async reason => {
          if (await action(reason)) navigation.goBack();
        }}
        title="Confirm Unlock"
      />
    </Shell>
  );
}
export function MarkSheetHistoryScreen({
  navigation,
  route,
}: RoleScreenProps<'MarkSheetHistory'>) {
  const values = useMarksResultStore(s => s.markHistory);
  const loadSheet = useMarksResultStore(s => s.loadMarkSheet);
  const load = useMarksResultStore(s => s.loadMarkHistory);
  useContext(route.params);
  useEffect(() => {
    (async () => {
      await loadSheet(route.params.markSheetId);
      await load();
    })().catch(() => undefined);
  }, [load, loadSheet, route.params.markSheetId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="mark-sheet-history-screen"
      title="Mark Sheet History"
    >
      <Feedback />
      {values.length ? (
        values.map(item => (
          <AppCard key={item.id} variant="outlined">
            <AppText variant="subtitle">
              {item.action.replaceAll('_', ' ')}
            </AppText>
            <AppText>{item.description}</AppText>
            <AppText variant="caption">
              Version {item.version} · {item.createdAt}
            </AppText>
            {item.reason ? <AppText>Reason: {item.reason}</AppText> : null}
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="No activity has been recorded."
          title="No history"
        />
      )}
    </Shell>
  );
}

export function ResultProcessingDashboardScreen({
  navigation,
  route,
}: RoleScreenProps<'ResultProcessingDashboard'>) {
  const value = useMarksResultStore(s => s.resultSummary);
  const load = useMarksResultStore(s => s.loadResultSummary);
  const access = useMarksResultAccess({
    ...route.params,
    examStatus: route.params.examStatus ?? 'SCHEDULED',
  });
  useContext(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="result-processing-dashboard-screen"
      title="Result Processing"
    >
      <Feedback />
      {value ? <ResultSummaryCard value={value} /> : <LoadingView />}
      {access.canCalculateResults ? (
        <AppButton
          onPress={() =>
            navigation.navigate(ROUTES.CALCULATE_RESULTS, route.params)
          }
          title="Calculate Results"
        />
      ) : null}
      {access.canViewPublicationHistory ? (
        <AppButton
          onPress={() =>
            navigation.navigate(ROUTES.RESULT_PUBLICATION_HISTORY, route.params)
          }
          title="Publication History"
          variant="outline"
        />
      ) : null}
    </Shell>
  );
}
export function CalculateResultsScreen({
  navigation,
  route,
}: RoleScreenProps<'CalculateResults'>) {
  const [scope, setScope] = useState<ResultCalculationScope>('COMPLETE_EXAM');
  const setDraft = useMarksResultStore(s => s.setCalculationDraft);
  const preview = useMarksResultStore(s => s.previewCalculation);
  const loading = useMarksResultStore(s => s.isPreviewingCalculation);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="calculate-results-screen"
      title="Calculate Results"
    >
      <Feedback />
      <AppText>Select calculation scope</AppText>
      {(
        ['ONE_STUDENT', 'ONE_SECTION', 'ONE_CLASS', 'COMPLETE_EXAM'] as const
      ).map(value => (
        <AppButton
          key={value}
          onPress={() => setScope(value)}
          title={`${scope === value ? '✓ ' : ''}${value.replaceAll('_', ' ')}`}
          variant="outline"
        />
      ))}
      <AppButton
        loading={loading}
        onPress={async () => {
          setDraft({ scope });
          await Promise.resolve();
          if (await preview())
            navigation.navigate(
              ROUTES.RESULT_CALCULATION_PREVIEW,
              route.params,
            );
        }}
        title="Preview Calculation"
      />
    </Shell>
  );
}
export function ResultCalculationPreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ResultCalculationPreview'>) {
  const value = useMarksResultStore(s => s.calculationPreview);
  const calculate = useMarksResultStore(s => s.calculateResults);
  const loading = useMarksResultStore(s => s.isCalculatingResults);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="result-calculation-preview-screen"
      title="Calculation Preview"
    >
      <Feedback />
      {value ? (
        <>
          <Field label="Students" value={value.students} />
          <Field
            label="Locked / Missing sheets"
            value={`${value.lockedMarkSheets} / ${value.missingMarkSheets}`}
          />
          <Field
            label="Pass / Fail / Absent / Incomplete"
            value={`${value.passCount} / ${value.failCount} / ${value.absentCount} / ${value.incompleteCount}`}
          />
          <GradeDistributionCard values={value.gradeDistribution} />
          <MarksValidationSummary
            complete={!value.blockers.length}
            issues={value.blockers}
          />
          <AppButton
            disabled={!!value.blockers.length}
            loading={loading}
            onPress={async () => {
              if (await calculate())
                navigation.navigate(
                  ROUTES.RESULT_CALCULATION_RESULT,
                  route.params,
                );
            }}
            title="Calculate Atomically"
          />
        </>
      ) : (
        <EmptyState
          description="Create a fresh calculation preview."
          title="No preview"
        />
      )}
    </Shell>
  );
}
export function ResultCalculationResultScreen({
  navigation,
  route,
}: RoleScreenProps<'ResultCalculationResult'>) {
  const value = useMarksResultStore(s => s.calculationResult);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="result-calculation-result-screen"
      title="Calculation Result"
    >
      <Feedback />
      {value ? (
        <>
          <AppCard>
            <AppText variant="subtitle">Run {value.run.id}</AppText>
            <AppText>
              {value.run.completedCount} completed · {value.run.failedCount}{' '}
              incomplete
            </AppText>
          </AppCard>
          <GradeDistributionCard
            values={value.overallResults.reduce<Record<string, number>>(
              (all, item) => ({
                ...all,
                [item.grade ?? 'NONE']: (all[item.grade ?? 'NONE'] ?? 0) + 1,
              }),
              {},
            )}
          />
          {value.overallResults.map(item => (
            <AppCard
              key={item.id}
              onPress={() =>
                navigation.navigate(ROUTES.STUDENT_RESULT_DETAILS, {
                  ...route.params,
                  studentId: item.studentId,
                })
              }
              variant="outlined"
            >
              <View style={styles.between}>
                <AppText>{item.studentNameSnapshot}</AppText>
                <ResultOutcomeBadge outcome={item.outcome} />
              </View>
              <AppText>{item.percentage.toFixed(2)}%</AppText>
            </AppCard>
          ))}
        </>
      ) : (
        <EmptyState
          description="No calculation has completed in this session."
          title="No result"
        />
      )}
    </Shell>
  );
}
export function ClassResultsScreen({
  navigation,
  route,
}: RoleScreenProps<'ClassResults'>) {
  const value = useMarksResultStore(s => s.classResults);
  const load = useMarksResultStore(s => s.loadClassResults);
  useContext(route.params);
  useEffect(() => {
    load(route.params.examClassConfigurationId).catch(() => undefined);
  }, [load, route.params.examClassConfigurationId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="class-results-screen"
      title="Class Results"
    >
      {value?.results.length ? (
        value.results.map(item => (
          <AppCard
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.STUDENT_RESULT_DETAILS, {
                ...route.params,
                studentId: item.studentId,
              })
            }
            variant="outlined"
          >
            <View style={styles.between}>
              <AppText>{item.studentNameSnapshot}</AppText>
              <ResultOutcomeBadge outcome={item.outcome} />
            </View>
            <AppText>
              {item.percentage.toFixed(2)}% · Rank {item.rank ?? '—'}
            </AppText>
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="Calculate Results for this Class first."
          title="No Class Results"
        />
      )}
    </Shell>
  );
}
export function SectionResultsScreen({
  navigation,
  route,
}: RoleScreenProps<'SectionResults'>) {
  const value = useMarksResultStore(s => s.sectionResults);
  const load = useMarksResultStore(s => s.loadSectionResults);
  useContext(route.params);
  useEffect(() => {
    load(route.params.sectionId).catch(() => undefined);
  }, [load, route.params.sectionId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="section-results-screen"
      title="Section Results"
    >
      {value?.results.length ? (
        value.results.map(item => (
          <AppCard
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.STUDENT_RESULT_DETAILS, {
                ...route.params,
                studentId: item.studentId,
              })
            }
            variant="outlined"
          >
            <View style={styles.between}>
              <AppText>{item.studentNameSnapshot}</AppText>
              <ResultOutcomeBadge outcome={item.outcome} />
            </View>
            <AppText>{item.percentage.toFixed(2)}%</AppText>
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="Calculate Results for this Section first."
          title="No Section Results"
        />
      )}
    </Shell>
  );
}
export function StudentResultDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'StudentResultDetails'>) {
  const value = useMarksResultStore(s => s.selectedStudentResult);
  const load = useMarksResultStore(s => s.loadStudentResult);
  useContext(route.params);
  useEffect(() => {
    load(route.params.studentId).catch(() => undefined);
  }, [load, route.params.studentId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="student-result-details-screen"
      title="Student Result"
    >
      {value ? (
        <>
          <AppCard>
            <View style={styles.between}>
              <AppText variant="title">
                {value.student.studentNameSnapshot}
              </AppText>
              <ResultOutcomeBadge outcome={value.overallResult.outcome} />
            </View>
            <AppText>
              {value.overallResult.totalMarksObtained}/
              {value.overallResult.totalMaximumMarks} ·{' '}
              {value.overallResult.percentage.toFixed(2)}%
            </AppText>
            <AppText>
              Grade {value.overallResult.grade ?? '—'} · Rank{' '}
              {value.overallResult.rank ?? '—'}
            </AppText>
          </AppCard>
          {value.subjectResults.map(item => (
            <StudentSubjectResultCard key={item.id} value={item} />
          ))}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

export function ResultReviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ResultReview'>) {
  const action = useMarksResultStore(s => s.reviewResults);
  const loading = useMarksResultStore(s => s.isReviewingResults);
  const [remarks, setRemarks] = useState('');
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="result-review-screen"
      title="Review Results"
    >
      <Feedback />
      <AppInput
        label="Review remarks"
        multiline
        onChangeText={setRemarks}
        value={remarks}
      />
      <AppButton
        loading={loading}
        onPress={async () => {
          if (
            await action({
              calculationRunId: route.params.calculationRunId,
              examClassConfigurationId: route.params.examClassConfigurationId,
              remarks,
              reviewScope: route.params.sectionId ? 'SECTION' : 'CLASS',
              sectionId: route.params.sectionId,
            })
          )
            navigation.goBack();
        }}
        title="Mark Results Reviewed"
      />
    </Shell>
  );
}
export function PublishResultsScreen({
  navigation,
  route,
}: RoleScreenProps<'PublishResults'>) {
  const action = useMarksResultStore(s => s.publishResults);
  const loading = useMarksResultStore(s => s.isPublishingResults);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="publish-results-screen"
      title="Publish Results"
    >
      <Feedback />
      <AppText>
        Publishing creates immutable student, subject, grade, enrollment, and
        calculation snapshots. Phase 12 does not expose Parent or Student Result
        screens.
      </AppText>
      <AppButton
        loading={loading}
        onPress={async () => {
          if (
            await action({
              calculationRunId: route.params.calculationRunId,
              examClassConfigurationId: route.params.examClassConfigurationId,
              scope: route.params.sectionId
                ? 'SECTION'
                : route.params.examClassConfigurationId
                ? 'CLASS'
                : 'COMPLETE_EXAM',
              sectionId: route.params.sectionId,
            })
          )
            navigation.goBack();
        }}
        title="Confirm Publication"
      />
    </Shell>
  );
}
export function UnpublishResultsScreen({
  navigation,
  route,
}: RoleScreenProps<'UnpublishResults'>) {
  const action = useMarksResultStore(s => s.unpublishResults);
  const loading = useMarksResultStore(s => s.isUnpublishingResults);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="unpublish-results-screen"
      title="Unpublish Results"
    >
      <Feedback />
      <ReasonAction
        loading={loading}
        onSubmit={async reason => {
          if (await action(route.params.publicationBatchId, reason))
            navigation.goBack();
        }}
        title="Confirm Unpublication"
      />
    </Shell>
  );
}
export function ResultPublicationHistoryScreen({
  navigation,
  route,
}: RoleScreenProps<'ResultPublicationHistory'>) {
  const values = useMarksResultStore(s => s.publicationHistory);
  const load = useMarksResultStore(s => s.loadPublicationHistory);
  const access = useMarksResultAccess({
    ...route.params,
    examStatus: route.params.examStatus ?? 'SCHEDULED',
    hasActivePublication: values.some(item => item.status === 'PUBLISHED'),
  });
  useContext(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="result-publication-history-screen"
      title="Publication History"
    >
      <Feedback />
      {values.length ? (
        values.map(item => (
          <AppCard key={item.id} variant="outlined">
            <View style={styles.between}>
              <AppText variant="subtitle">{item.id}</AppText>
              <ResultPublicationStatusBadge status={item.status} />
            </View>
            <AppText>
              {item.scope} · {item.studentCount} students
            </AppText>
            <AppText variant="caption">
              Run {item.calculationRunId} · {item.publishedAt}
            </AppText>
            {item.unpublicationReason ? (
              <AppText>Reason: {item.unpublicationReason}</AppText>
            ) : null}
            {item.status === 'PUBLISHED' && access.canUnpublishResults ? (
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.UNPUBLISH_RESULTS, {
                    ...route.params,
                    publicationBatchId: item.id,
                  })
                }
                title="Unpublish"
                variant="danger"
              />
            ) : null}
          </AppCard>
        ))
      ) : (
        <EmptyState
          description="No publication batches have been created."
          title="No publication history"
        />
      )}
    </Shell>
  );
}
export function RankListScreen({
  navigation,
  route,
}: RoleScreenProps<'RankList'>) {
  const values = useMarksResultStore(s => s.rankList);
  const load = useMarksResultStore(s => s.loadRankList);
  useContext(route.params);
  useEffect(() => {
    load({
      examClassConfigurationId: route.params.examClassConfigurationId,
      scope: route.params.sectionId ? 'SECTION_RANK' : 'CLASS_RANK',
      sectionId: route.params.sectionId,
    }).catch(() => undefined);
  }, [load, route.params.examClassConfigurationId, route.params.sectionId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="rank-list-screen"
      title="Rank List"
    >
      {values.length ? (
        values.map(item => <RankListItem item={item} key={item.studentId} />)
      ) : (
        <EmptyState
          description="Ranking may be disabled or no passing Results are available."
          title="No ranks"
        />
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  between: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  content: { gap: 12, padding: 16 },
  field: { gap: 2 },
});
