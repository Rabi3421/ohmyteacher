import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AssessmentComponentEditor,
  ExamCard,
  ExamClassConfigurationCard,
  ExaminationContextBar,
  ExamScheduleItem,
  ExamSetupCompletionCard,
  ExamSetupIssueList,
  ExamSetupSummaryCard,
  ExamStatusBadge,
  ExamTermCard,
  ExamTypeCard,
  GradeBandEditor,
  GradingSchemeCard,
  SubjectPaperCard,
} from '../../components/examination/ExaminationComponents';
import { AppButton } from '../../components/common/AppButton';
import { AppCard } from '../../components/common/AppCard';
import { AppHeader } from '../../components/common/AppHeader';
import { AppInput } from '../../components/common/AppInput';
import { AppScreen } from '../../components/common/AppScreen';
import { AppSearchInput } from '../../components/common/AppSearchInput';
import { AppText } from '../../components/common/AppText';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { LoadingView } from '../../components/feedback/LoadingView';
import { ROUTES } from '../../constants/routes';
import { useExaminationAccess } from '../../hooks/useExaminationAccess';
import type {
  AssessmentComponent,
  CreateExamTermInput,
  CreateExamTypeInput,
  GradeBand,
} from '../../models/examination';
import type { RoleScreenProps } from '../../navigation/navigationTypes';
import { useExaminationSetupStore } from '../../store';

type ContextParams = {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  sessionStatus: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
};
type FormNavigation = { goBack: () => void };

function useContext(params: ContextParams) {
  const setContext = useExaminationSetupStore(state => state.setContext);
  useEffect(() => {
    setContext({
      academicSessionId: params.academicSessionId,
      branchId: params.branchId,
      schoolId: params.schoolId,
      sessionStatus: params.sessionStatus,
    });
  }, [
    params.academicSessionId,
    params.branchId,
    params.schoolId,
    params.sessionStatus,
    setContext,
  ]);
}

function Shell({
  children,
  navigation,
  params,
  testID,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  navigation: { goBack: () => void };
  params: ContextParams;
  testID: string;
  title: string;
  subtitle?: string;
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
        <ExaminationContextBar
          branch={params.branchId}
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
  const error = useExaminationSetupStore(state => state.error);
  const success = useExaminationSetupStore(state => state.successMessage);
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

export function ExaminationSetupScreen({
  navigation,
  route,
}: RoleScreenProps<'ExaminationSetup'>) {
  useContext(route.params);
  const summary = useExaminationSetupStore(state => state.summary);
  const loading = useExaminationSetupStore(state => state.isLoadingSummary);
  const load = useExaminationSetupStore(state => state.loadSummary);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.academicSessionId, route.params.branchId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="examination-setup-screen"
      title="Examination Setup"
      subtitle="Terms, grading, papers and schedule"
    >
      <Feedback />
      {loading && !summary ? (
        <LoadingView message="Loading Examination Setup…" />
      ) : null}
      {summary ? (
        <>
          <View style={styles.metrics}>
            <ExamSetupSummaryCard
              label="Active Terms"
              value={summary.activeTerms}
            />
            <ExamSetupSummaryCard
              label="Exam Types"
              value={summary.activeExamTypes}
            />
            <ExamSetupSummaryCard
              label="Grading Schemes"
              value={summary.activeGradingSchemes}
            />
            <ExamSetupSummaryCard
              label="Draft Exams"
              value={summary.draftExams}
            />
            <ExamSetupSummaryCard
              label="Scheduled Exams"
              value={summary.scheduledExams}
            />
            <ExamSetupSummaryCard
              label="Incomplete"
              value={summary.incompleteExams}
            />
            <ExamSetupSummaryCard
              label="Upcoming Papers"
              value={summary.upcomingPapers}
            />
            <ExamSetupSummaryCard
              label="Conflicts"
              value={summary.scheduleConflicts}
            />
          </View>
          <ExamSetupIssueList issues={summary.warnings} />
          <AppButton
            onPress={() => navigation.navigate(ROUTES.EXAMS, route.params)}
            title="Manage Exams"
          />
          {access.canManageExamTerms ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.EXAM_TERMS, route.params)
              }
              title="Manage Terms"
              variant="outline"
            />
          ) : null}
          {access.canManageExamTypes ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.EXAM_TYPES, route.params)
              }
              title="Manage Exam Types"
              variant="outline"
            />
          ) : null}
          {access.canManageGradingSchemes ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.GRADING_SCHEMES, route.params)
              }
              title="Manage Grading Schemes"
              variant="outline"
            />
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}

export function ExamTermsScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamTerms'>) {
  useContext(route.params);
  const terms = useExaminationSetupStore(state => state.terms);
  const query = useExaminationSetupStore(state => state.termQuery);
  const setQuery = useExaminationSetupStore(state => state.setTermQuery);
  const load = useExaminationSetupStore(state => state.loadTerms);
  const loading = useExaminationSetupStore(state => state.isLoadingTerms);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, query.search, route.params.academicSessionId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-terms-screen"
      title="Exam Terms"
    >
      <Feedback />
      <AppSearchInput
        onChangeText={search => setQuery({ search })}
        onClear={() => setQuery({ search: '' })}
        placeholder="Search Terms"
        value={query.search ?? ''}
      />
      {access.canManageExamTerms ? (
        <AppButton
          onPress={() =>
            navigation.navigate(ROUTES.CREATE_EXAM_TERM, route.params)
          }
          title="Create Exam Term"
        />
      ) : null}
      {loading && !terms.items.length ? (
        <LoadingView />
      ) : terms.items.length ? (
        terms.items.map(item => (
          <ExamTermCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.EDIT_EXAM_TERM, {
                ...route.params,
                termId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="Create a Term for this Academic Session."
          title="No Exam Terms"
        />
      )}
    </Shell>
  );
}

const emptyTerm: CreateExamTermInput = {
  code: '',
  displayOrder: 1,
  endDate: '',
  name: '',
  startDate: '',
  status: 'ACTIVE',
};
function ExamTermForm({
  navigation,
  params,
  termId,
}: {
  navigation: FormNavigation;
  params: ContextParams;
  termId?: string;
}) {
  useContext(params);
  const selected = useExaminationSetupStore(state => state.selectedTerm);
  const load = useExaminationSetupStore(state => state.loadTerm);
  const save = useExaminationSetupStore(state => state.saveTerm);
  const saving = useExaminationSetupStore(state => state.isSavingTerm);
  const [draft, setDraft] = useState<CreateExamTermInput>(emptyTerm);
  useEffect(() => {
    if (termId) load(termId).catch(() => undefined);
  }, [load, termId]);
  useEffect(() => {
    if (termId && selected?.id === termId)
      setDraft({
        code: selected.code,
        description: selected.description,
        displayOrder: selected.displayOrder,
        endDate: selected.endDate,
        name: selected.name,
        startDate: selected.startDate,
        status: selected.status,
      });
  }, [selected, termId]);
  return (
    <Shell
      navigation={navigation}
      params={params}
      testID={termId ? 'edit-exam-term-screen' : 'create-exam-term-screen'}
      title={termId ? 'Edit Exam Term' : 'Create Exam Term'}
    >
      <Feedback />
      <AppInput
        label="Name"
        onChangeText={name => setDraft(value => ({ ...value, name }))}
        value={draft.name}
      />
      <AppInput
        autoCapitalize="characters"
        label="Code"
        onChangeText={code => setDraft(value => ({ ...value, code }))}
        value={draft.code}
      />
      <AppInput
        label="Start date (YYYY-MM-DD)"
        onChangeText={startDate => setDraft(value => ({ ...value, startDate }))}
        value={draft.startDate}
      />
      <AppInput
        label="End date (YYYY-MM-DD)"
        onChangeText={endDate => setDraft(value => ({ ...value, endDate }))}
        value={draft.endDate}
      />
      <AppInput
        keyboardType="number-pad"
        label="Display order"
        onChangeText={value =>
          setDraft(current => ({ ...current, displayOrder: Number(value) }))
        }
        value={String(draft.displayOrder)}
      />
      <AppInput
        label="Description"
        multiline
        onChangeText={description =>
          setDraft(value => ({ ...value, description }))
        }
        value={draft.description ?? ''}
      />
      <AppButton
        disabled={params.sessionStatus === 'CLOSED'}
        loading={saving}
        onPress={async () => {
          if (await save(draft, termId)) navigation.goBack();
        }}
        title={termId ? 'Save Term' : 'Create Term'}
      />
    </Shell>
  );
}
export function CreateExamTermScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateExamTerm'>) {
  return <ExamTermForm navigation={navigation} params={route.params} />;
}
export function EditExamTermScreen({
  navigation,
  route,
}: RoleScreenProps<'EditExamTerm'>) {
  return (
    <ExamTermForm
      navigation={navigation}
      params={route.params}
      termId={route.params.termId}
    />
  );
}

export function ExamTypesScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamTypes'>) {
  useContext(route.params);
  const values = useExaminationSetupStore(state => state.examTypes);
  const load = useExaminationSetupStore(state => state.loadExamTypes);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-types-screen"
      title="Exam Types"
    >
      <Feedback />
      {access.canManageExamTypes ? (
        <AppButton
          onPress={() =>
            navigation.navigate(ROUTES.CREATE_EXAM_TYPE, route.params)
          }
          title="Create Exam Type"
        />
      ) : null}
      {values.items.length ? (
        values.items.map(item => (
          <ExamTypeCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_TYPE_DETAILS, {
                ...route.params,
                examTypeId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="School-scoped Exam Types will appear here."
          title="No Exam Types"
        />
      )}
    </Shell>
  );
}

const emptyType: CreateExamTypeInput = {
  code: '',
  displayOrder: 1,
  name: '',
  status: 'ACTIVE',
};
function ExamTypeForm({
  navigation,
  params,
  examTypeId,
}: {
  navigation: FormNavigation;
  params: ContextParams;
  examTypeId?: string;
}) {
  useContext(params);
  const selected = useExaminationSetupStore(state => state.selectedExamType);
  const load = useExaminationSetupStore(state => state.loadExamType);
  const save = useExaminationSetupStore(state => state.saveExamType);
  const saving = useExaminationSetupStore(state => state.isSavingExamType);
  const [draft, setDraft] = useState<CreateExamTypeInput>(emptyType);
  useEffect(() => {
    if (examTypeId) load(examTypeId).catch(() => undefined);
  }, [examTypeId, load]);
  useEffect(() => {
    if (examTypeId && selected?.id === examTypeId)
      setDraft({
        code: selected.code,
        defaultWeightagePercent: selected.defaultWeightagePercent,
        description: selected.description,
        displayOrder: selected.displayOrder,
        name: selected.name,
        status: selected.status,
      });
  }, [examTypeId, selected]);
  return (
    <Shell
      navigation={navigation}
      params={params}
      testID={examTypeId ? 'edit-exam-type-screen' : 'create-exam-type-screen'}
      title={examTypeId ? 'Edit Exam Type' : 'Create Exam Type'}
    >
      <Feedback />
      <AppInput
        label="Name"
        onChangeText={name => setDraft(value => ({ ...value, name }))}
        value={draft.name}
      />
      <AppInput
        autoCapitalize="characters"
        label="Code"
        onChangeText={code => setDraft(value => ({ ...value, code }))}
        value={draft.code}
      />
      <AppInput
        keyboardType="number-pad"
        label="Default weightage %"
        onChangeText={value =>
          setDraft(current => ({
            ...current,
            defaultWeightagePercent: value ? Number(value) : undefined,
          }))
        }
        value={
          draft.defaultWeightagePercent === undefined
            ? ''
            : String(draft.defaultWeightagePercent)
        }
      />
      <AppInput
        keyboardType="number-pad"
        label="Display order"
        onChangeText={value =>
          setDraft(current => ({ ...current, displayOrder: Number(value) }))
        }
        value={String(draft.displayOrder)}
      />
      <AppButton
        disabled={params.sessionStatus === 'CLOSED'}
        loading={saving}
        onPress={async () => {
          if (await save(draft, examTypeId)) navigation.goBack();
        }}
        title={examTypeId ? 'Save Exam Type' : 'Create Exam Type'}
      />
    </Shell>
  );
}
export function CreateExamTypeScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateExamType'>) {
  return <ExamTypeForm navigation={navigation} params={route.params} />;
}
export function EditExamTypeScreen({
  navigation,
  route,
}: RoleScreenProps<'EditExamType'>) {
  return (
    <ExamTypeForm
      navigation={navigation}
      params={route.params}
      examTypeId={route.params.examTypeId}
    />
  );
}
export function ExamTypeDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamTypeDetails'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExamType);
  const load = useExaminationSetupStore(state => state.loadExamType);
  const update = useExaminationSetupStore(state => state.updateExamTypeStatus);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load(route.params.examTypeId).catch(() => undefined);
  }, [load, route.params.examTypeId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-type-details-screen"
      title="Exam Type Details"
    >
      <Feedback />
      {item ? (
        <>
          <ExamTypeCard item={item} />
          <Field label="Description" value={item.description} />
          {access.canManageExamTypes ? (
            <>
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.EDIT_EXAM_TYPE, route.params)
                }
                title="Edit Exam Type"
              />
              <AppButton
                onPress={() =>
                  update(
                    item.id,
                    item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  )
                }
                title={item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                variant="outline"
              />
            </>
          ) : null}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

export function GradingSchemesScreen({
  navigation,
  route,
}: RoleScreenProps<'GradingSchemes'>) {
  useContext(route.params);
  const values = useExaminationSetupStore(state => state.gradingSchemes);
  const load = useExaminationSetupStore(state => state.loadGradingSchemes);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load, route.params.schoolId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="grading-schemes-screen"
      title="Grading Schemes"
    >
      <Feedback />
      {access.canManageGradingSchemes ? (
        <AppButton
          onPress={() =>
            navigation.navigate(ROUTES.CREATE_GRADING_SCHEME, route.params)
          }
          title="Create Grading Scheme"
        />
      ) : null}
      {values.items.length ? (
        values.items.map(item => (
          <GradingSchemeCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.GRADING_SCHEME_DETAILS, {
                ...route.params,
                gradingSchemeId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="Create a reusable School Grading Scheme."
          title="No Grading Schemes"
        />
      )}
    </Shell>
  );
}

const defaultBands: Array<Omit<GradeBand, 'id'> & { id?: string }> = [
  {
    displayOrder: 1,
    grade: 'A',
    gradePoint: 10,
    isPassing: true,
    maximumPercentage: 100,
    minimumPercentage: 40,
  },
  {
    displayOrder: 2,
    grade: 'F',
    gradePoint: 0,
    isPassing: false,
    maximumPercentage: 39.99,
    minimumPercentage: 0,
  },
];
function GradingSchemeForm({
  navigation,
  params,
  gradingSchemeId,
}: {
  navigation: FormNavigation;
  params: ContextParams;
  gradingSchemeId?: string;
}) {
  useContext(params);
  const selected = useExaminationSetupStore(
    state => state.selectedGradingScheme,
  );
  const load = useExaminationSetupStore(state => state.loadGradingScheme);
  const setDraftStore = useExaminationSetupStore(
    state => state.setGradingSchemeDraft,
  );
  const save = useExaminationSetupStore(state => state.saveGradingScheme);
  const saving = useExaminationSetupStore(state => state.isSavingGradingScheme);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [bands, setBands] = useState(defaultBands);
  useEffect(() => {
    if (gradingSchemeId) load(gradingSchemeId).catch(() => undefined);
  }, [gradingSchemeId, load]);
  useEffect(() => {
    if (gradingSchemeId && selected?.id === gradingSchemeId) {
      setName(selected.name);
      setCode(selected.code);
      setBands(selected.bands);
    }
  }, [gradingSchemeId, selected]);
  return (
    <Shell
      navigation={navigation}
      params={params}
      testID={
        gradingSchemeId
          ? 'edit-grading-scheme-screen'
          : 'create-grading-scheme-screen'
      }
      title={gradingSchemeId ? 'Edit Grading Scheme' : 'Create Grading Scheme'}
    >
      <Feedback />
      <AppInput label="Name" onChangeText={setName} value={name} />
      <AppInput
        autoCapitalize="characters"
        label="Code"
        onChangeText={setCode}
        value={code}
      />
      <GradeBandEditor
        bands={bands}
        disabled={params.sessionStatus === 'CLOSED'}
        onChange={setBands}
      />
      <AppButton
        loading={saving}
        onPress={async () => {
          setDraftStore({
            bands,
            code,
            isDefault: gradingSchemeId ? selected?.isDefault ?? false : false,
            name,
            status: gradingSchemeId ? selected?.status ?? 'DRAFT' : 'DRAFT',
          });
          setTimeout(() => {
            save(gradingSchemeId).then(ok => {
              if (ok) navigation.goBack();
            });
          }, 0);
        }}
        title="Save as Draft"
      />
    </Shell>
  );
}
export function CreateGradingSchemeScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateGradingScheme'>) {
  return <GradingSchemeForm navigation={navigation} params={route.params} />;
}
export function EditGradingSchemeScreen({
  navigation,
  route,
}: RoleScreenProps<'EditGradingScheme'>) {
  return (
    <GradingSchemeForm
      gradingSchemeId={route.params.gradingSchemeId}
      navigation={navigation}
      params={route.params}
    />
  );
}
export function GradingSchemeDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'GradingSchemeDetails'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedGradingScheme);
  const load = useExaminationSetupStore(state => state.loadGradingScheme);
  const update = useExaminationSetupStore(
    state => state.updateGradingSchemeStatus,
  );
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load(route.params.gradingSchemeId).catch(() => undefined);
  }, [load, route.params.gradingSchemeId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="grading-scheme-details-screen"
      title="Grading Scheme Details"
    >
      <Feedback />
      {item ? (
        <>
          <GradingSchemeCard item={item} />
          {item.bands.map(band => (
            <AppCard key={band.id} variant="outlined">
              <AppText variant="heading3">{band.grade}</AppText>
              <AppText>
                {band.minimumPercentage}%–{band.maximumPercentage}% ·{' '}
                {band.isPassing ? 'Passing' : 'Failing'}
              </AppText>
            </AppCard>
          ))}
          {access.canManageGradingSchemes ? (
            <>
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.EDIT_GRADING_SCHEME, route.params)
                }
                title="Edit Scheme"
              />
              <AppButton
                onPress={() =>
                  update(
                    item.id,
                    item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  )
                }
                title={item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                variant="outline"
              />
            </>
          ) : null}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

export function ExamsScreen({ navigation, route }: RoleScreenProps<'Exams'>) {
  useContext(route.params);
  const values = useExaminationSetupStore(state => state.exams);
  const query = useExaminationSetupStore(state => state.examQuery);
  const setQuery = useExaminationSetupStore(state => state.setExamQuery);
  const load = useExaminationSetupStore(state => state.loadExams);
  const access = useExaminationAccess(route.params);
  useEffect(() => {
    load().catch(() => undefined);
  }, [
    load,
    query.search,
    route.params.academicSessionId,
    route.params.branchId,
  ]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exams-screen"
      title="Exams"
    >
      <Feedback />
      <AppSearchInput
        onChangeText={search => setQuery({ search })}
        onClear={() => setQuery({ search: '' })}
        placeholder="Search Exams"
        value={query.search ?? ''}
      />
      {access.canCreateExam ? (
        <AppButton
          onPress={() => navigation.navigate(ROUTES.CREATE_EXAM, route.params)}
          title="Create Exam"
        />
      ) : null}
      {values.items.length ? (
        values.items.map(item => (
          <ExamCard
            item={item}
            key={item.id}
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_DETAILS, {
                ...route.params,
                examId: item.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="Create a Draft Exam for this Branch and Session."
          title="No Exams"
        />
      )}
    </Shell>
  );
}

function ExamForm({
  navigation,
  params,
  examId,
}: {
  navigation: FormNavigation;
  params: ContextParams;
  examId?: string;
}) {
  useContext(params);
  const selected = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const setDraftStore = useExaminationSetupStore(state => state.setExamDraft);
  const save = useExaminationSetupStore(state => state.saveExam);
  const saving = useExaminationSetupStore(state => state.isSavingExam);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({
    name: '',
    code: '',
    termId: '',
    examTypeId: '',
    startDate: '',
    endDate: '',
    description: '',
    defaultWeightagePercent: '',
  });
  useEffect(() => {
    if (examId) load(examId).catch(() => undefined);
  }, [examId, load]);
  useEffect(() => {
    if (examId && selected?.id === examId)
      setDraft({
        code: selected.code,
        defaultWeightagePercent:
          selected.defaultWeightagePercent === undefined
            ? ''
            : String(selected.defaultWeightagePercent),
        description: selected.description ?? '',
        endDate: selected.endDate,
        examTypeId: selected.examTypeId,
        name: selected.name,
        startDate: selected.startDate,
        termId: selected.termId,
      });
  }, [examId, selected]);
  const labels = [
    'Basic Information',
    'Classes and Sections',
    'Grading and Pass Policy',
    'Subject Papers',
    'Schedule',
    'Review and Save',
  ];
  return (
    <Shell
      navigation={navigation}
      params={params}
      testID={examId ? 'edit-exam-screen' : 'create-exam-screen'}
      title={examId ? 'Edit Exam' : 'Create Exam'}
      subtitle={`Step ${step} of 6 · ${labels[step - 1]}`}
    >
      <Feedback />
      {step === 1 ? (
        <>
          <AppInput
            label="Name"
            onChangeText={name => setDraft(value => ({ ...value, name }))}
            value={draft.name}
          />
          <AppInput
            autoCapitalize="characters"
            label="Code"
            onChangeText={code => setDraft(value => ({ ...value, code }))}
            value={draft.code}
          />
          <AppInput
            label="Exam Term ID"
            onChangeText={termId => setDraft(value => ({ ...value, termId }))}
            value={draft.termId}
          />
          <AppInput
            label="Exam Type ID"
            onChangeText={examTypeId =>
              setDraft(value => ({ ...value, examTypeId }))
            }
            value={draft.examTypeId}
          />
          <AppInput
            label="Start date (YYYY-MM-DD)"
            onChangeText={startDate =>
              setDraft(value => ({ ...value, startDate }))
            }
            value={draft.startDate}
          />
          <AppInput
            label="End date (YYYY-MM-DD)"
            onChangeText={endDate => setDraft(value => ({ ...value, endDate }))}
            value={draft.endDate}
          />
        </>
      ) : (
        <AppCard variant="outlined">
          <AppText variant="heading3">{labels[step - 1]}</AppText>
          <AppText>
            {step === 6
              ? 'Review the local draft, then save it atomically as Draft.'
              : 'This step is available in the focused management screen after the Draft Exam is saved.'}
          </AppText>
        </AppCard>
      )}
      <View style={styles.row}>
        {step > 1 ? (
          <AppButton
            onPress={() => setStep(value => value - 1)}
            title="Back"
            variant="outline"
          />
        ) : null}
        {step < 6 ? (
          <AppButton onPress={() => setStep(value => value + 1)} title="Next" />
        ) : (
          <AppButton
            loading={saving}
            onPress={async () => {
              setDraftStore({
                academicSessionId: params.academicSessionId,
                branchId: params.branchId,
                code: draft.code,
                defaultWeightagePercent: draft.defaultWeightagePercent
                  ? Number(draft.defaultWeightagePercent)
                  : undefined,
                description: draft.description,
                endDate: draft.endDate,
                examTypeId: draft.examTypeId,
                name: draft.name,
                startDate: draft.startDate,
                termId: draft.termId,
              });
              setTimeout(() => {
                save(examId).then(ok => {
                  if (ok) navigation.goBack();
                });
              }, 0);
            }}
            title="Save as Draft"
          />
        )}
      </View>
    </Shell>
  );
}
export function CreateExamScreen({
  navigation,
  route,
}: RoleScreenProps<'CreateExam'>) {
  return <ExamForm navigation={navigation} params={route.params} />;
}
export function EditExamScreen({
  navigation,
  route,
}: RoleScreenProps<'EditExam'>) {
  return (
    <ExamForm
      examId={route.params.examId}
      navigation={navigation}
      params={route.params}
    />
  );
}

export function ExamDetailsScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamDetails'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const access = useExaminationAccess({
    ...route.params,
    examStatus: item?.status,
  });
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-details-screen"
      title="Exam Details"
    >
      <Feedback />
      {item ? (
        <>
          <ExamCard item={item} />
          <Field label="Branch" value={item.branchName} />
          <Field label="Academic Session" value={item.academicSessionName} />
          <ExamSetupCompletionCard value={item.setupValidation} />
          <ExamSetupIssueList
            issues={[
              ...item.setupValidation.blockers,
              ...item.setupValidation.warnings,
            ]}
          />
          {access.canEditExam ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.EDIT_EXAM, route.params)
              }
              title="Edit Exam"
            />
          ) : null}
          <AppButton
            onPress={() =>
              navigation.navigate(
                ROUTES.EXAM_CLASS_CONFIGURATIONS,
                route.params,
              )
            }
            title="Classes and Sections"
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_SCHEDULE, route.params)
            }
            title="Exam Schedule"
            variant="outline"
          />
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_SETUP_REVIEW, route.params)
            }
            title="Review Setup"
            variant="outline"
          />
          {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(item.status) ? (
            <>
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.MARKS_DASHBOARD, {
                    ...route.params,
                    examStatus: item.status,
                  })
                }
                title="Marks and Results"
                variant="outline"
              />
              <AppButton
                onPress={() =>
                  navigation.navigate(ROUTES.REPORT_CARD_DASHBOARD, {
                    ...route.params,
                    examStatus: item.status,
                  })
                }
                title="Report Cards"
                variant="outline"
              />
            </>
          ) : null}
          {access.canCopyExam ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.COPY_EXAM, route.params)
              }
              title="Copy Exam"
              variant="outline"
            />
          ) : null}
          {access.canCancelExam ? (
            <AppButton
              onPress={() =>
                navigation.navigate(ROUTES.CANCEL_EXAM, route.params)
              }
              title="Cancel Exam"
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

export function ExamClassConfigurationsScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamClassConfigurations'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-class-configurations-screen"
      title="Classes and Sections"
    >
      <Feedback />
      <AppButton
        disabled={item?.status !== 'DRAFT'}
        onPress={() =>
          navigation.navigate(ROUTES.EXAM_CLASS_CONFIGURATION, route.params)
        }
        title="Add Class Configuration"
      />
      {item?.classConfigurations.length ? (
        item.classConfigurations.map(config => (
          <ExamClassConfigurationCard
            item={config}
            key={config.id}
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_CLASS_CONFIGURATION, {
                ...route.params,
                examClassConfigurationId: config.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="Add an active Class and applicable Sections."
          title="No Class Configurations"
        />
      )}
    </Shell>
  );
}

export function ExamClassConfigurationScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamClassConfiguration'>) {
  useContext(route.params);
  const selectedExam = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const save = useExaminationSetupStore(state => state.saveClassConfigurations);
  const saving = useExaminationSetupStore(
    state => state.isSavingClassConfigurations,
  );
  const existing = selectedExam?.classConfigurations.find(
    item => item.id === route.params.examClassConfigurationId,
  );
  const [classId, setClassId] = useState('');
  const [sectionIds, setSectionIds] = useState('');
  const [gradingSchemeId, setGradingSchemeId] = useState('');
  useEffect(() => {
    if (!selectedExam || selectedExam.id !== route.params.examId)
      load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId, selectedExam]);
  useEffect(() => {
    if (existing) {
      setClassId(existing.classId);
      setSectionIds(existing.sectionIds.join(','));
      setGradingSchemeId(existing.gradingSchemeId);
    }
  }, [existing]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-class-configuration-screen"
      title="Class Configuration"
    >
      <Feedback />
      <AppInput label="Class ID" onChangeText={setClassId} value={classId} />
      <AppInput
        helperText="Comma-separated active Section IDs"
        label="Section IDs"
        onChangeText={setSectionIds}
        value={sectionIds}
      />
      <AppInput
        label="Active Grading Scheme ID"
        onChangeText={setGradingSchemeId}
        value={gradingSchemeId}
      />
      <AppButton
        loading={saving}
        onPress={async () => {
          const current =
            selectedExam?.classConfigurations
              .filter(item => item.id !== existing?.id)
              .map(item => ({
                classId: item.classId,
                gradingSchemeId: item.gradingSchemeId,
                id: item.id,
                includeOptionalSubjectsInTotal:
                  item.includeOptionalSubjectsInTotal,
                overallPassPercentage: item.overallPassPercentage,
                rankEnabled: item.rankEnabled,
                requirePassInEverySubject: item.requirePassInEverySubject,
                sectionApplicability: item.sectionApplicability,
                sectionIds: item.sectionIds,
              })) ?? [];
          const ok = await save({
            configurations: [
              ...current,
              {
                classId,
                gradingSchemeId,
                id: existing?.id,
                includeOptionalSubjectsInTotal: true,
                overallPassPercentage: 40,
                rankEnabled: false,
                requirePassInEverySubject: true,
                sectionApplicability: 'SELECTED_SECTIONS',
                sectionIds: sectionIds
                  .split(',')
                  .map(value => value.trim())
                  .filter(Boolean),
              },
            ],
          });
          if (ok) navigation.goBack();
        }}
        title="Save Class Configuration"
      />
    </Shell>
  );
}

export function ExamSubjectPapersScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamSubjectPapers'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  const values =
    item?.subjectPapers.filter(
      paper =>
        paper.examClassConfigurationId ===
        route.params.examClassConfigurationId,
    ) ?? [];
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-subject-papers-screen"
      title="Subject Papers"
    >
      <Feedback />
      <AppButton
        disabled={item?.status !== 'DRAFT'}
        onPress={() =>
          navigation.navigate(ROUTES.EXAM_SUBJECT_PAPER, route.params)
        }
        title="Add Subject Paper"
      />
      {values.length ? (
        values.map(paper => (
          <SubjectPaperCard
            item={paper}
            key={paper.id}
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_SUBJECT_PAPER, {
                ...route.params,
                subjectPaperId: paper.id,
              })
            }
          />
        ))
      ) : (
        <EmptyState
          description="Only active Subjects assigned to this Class are eligible."
          title="No Subject Papers"
        />
      )}
    </Shell>
  );
}

const defaultComponents: Array<
  Omit<AssessmentComponent, 'id'> & { id?: string }
> = [
  {
    displayOrder: 1,
    marksEntryRequired: true,
    maximumMarks: 100,
    name: 'Theory',
    passMarks: 40,
    type: 'THEORY',
  },
];
export function ExamSubjectPaperScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamSubjectPaper'>) {
  useContext(route.params);
  const selectedExam = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const save = useExaminationSetupStore(state => state.saveSubjectPapers);
  const saving = useExaminationSetupStore(state => state.isSavingSubjectPapers);
  const existing = selectedExam?.subjectPapers.find(
    item => item.id === route.params.subjectPaperId,
  );
  const [subjectId, setSubjectId] = useState('');
  const [maximum, setMaximum] = useState('100');
  const [pass, setPass] = useState('40');
  const [components, setComponents] = useState(defaultComponents);
  useEffect(() => {
    if (!selectedExam || selectedExam.id !== route.params.examId)
      load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId, selectedExam]);
  useEffect(() => {
    if (existing) {
      setSubjectId(existing.subjectId);
      setMaximum(String(existing.totalMaximumMarks));
      setPass(String(existing.totalPassMarks));
      setComponents(existing.components);
    }
  }, [existing]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-subject-paper-screen"
      title="Subject Paper"
    >
      <Feedback />
      <AppInput
        label="Assigned Subject ID"
        onChangeText={setSubjectId}
        value={subjectId}
      />
      <AppInput
        keyboardType="number-pad"
        label="Maximum marks"
        onChangeText={setMaximum}
        value={maximum}
      />
      <AppInput
        keyboardType="number-pad"
        label="Pass marks"
        onChangeText={setPass}
        value={pass}
      />
      <AssessmentComponentEditor
        components={components}
        onChange={setComponents}
      />
      <AppButton
        loading={saving}
        onPress={async () => {
          const current =
            selectedExam?.subjectPapers
              .filter(
                item =>
                  item.examClassConfigurationId ===
                    route.params.examClassConfigurationId &&
                  item.id !== existing?.id,
              )
              .map(item => ({
                components: item.components,
                displayOrder: item.displayOrder,
                durationMinutes: item.durationMinutes,
                examDate: item.examDate,
                id: item.id,
                room: item.room,
                startTime: item.startTime,
                subjectId: item.subjectId,
                totalMaximumMarks: item.totalMaximumMarks,
                totalPassMarks: item.totalPassMarks,
                weightagePercent: item.weightagePercent,
              })) ?? [];
          const ok = await save(route.params.examClassConfigurationId, {
            papers: [
              ...current,
              {
                components,
                displayOrder: existing?.displayOrder ?? current.length + 1,
                durationMinutes: existing?.durationMinutes,
                examDate: existing?.examDate,
                id: existing?.id,
                room: existing?.room,
                startTime: existing?.startTime,
                subjectId,
                totalMaximumMarks: Number(maximum),
                totalPassMarks: Number(pass),
                weightagePercent: existing?.weightagePercent,
              },
            ],
          });
          if (ok) navigation.goBack();
        }}
        title="Save Subject Paper"
      />
    </Shell>
  );
}

export function ExamScheduleScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamSchedule'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const save = useExaminationSetupStore(state => state.saveSchedule);
  const saving = useExaminationSetupStore(state => state.isSavingSchedule);
  const [paperId, setPaperId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDuration] = useState('120');
  const [room, setRoom] = useState('');
  useEffect(() => {
    if (route.params.examId) load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  useEffect(() => {
    if (!paperId && item?.subjectPapers[0]) {
      const first = item.subjectPapers[0];
      setPaperId(first.id);
      setExamDate(first.examDate ?? '');
      setStartTime(first.startTime ?? '09:00');
      setDuration(String(first.durationMinutes ?? 120));
      setRoom(first.room ?? '');
    }
  }, [item, paperId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-schedule-screen"
      title="Exam Schedule"
    >
      <Feedback />
      {item ? (
        <>
          <AppCard variant="outlined">
            <AppText variant="heading3">Schedule a Subject Paper</AppText>
            <AppInput
              label="Subject Paper ID"
              onChangeText={setPaperId}
              value={paperId}
            />
            <AppInput
              label="Exam date (YYYY-MM-DD)"
              onChangeText={setExamDate}
              value={examDate}
            />
            <AppInput
              label="Start time (HH:mm)"
              onChangeText={setStartTime}
              value={startTime}
            />
            <AppInput
              keyboardType="number-pad"
              label="Duration in minutes"
              onChangeText={setDuration}
              value={durationMinutes}
            />
            <AppInput
              label="Room (optional)"
              onChangeText={setRoom}
              value={room}
            />
            <AppButton
              disabled={item.status !== 'DRAFT'}
              loading={saving}
              onPress={() =>
                save({
                  schedules: [
                    {
                      durationMinutes: Number(durationMinutes),
                      examDate,
                      paperId,
                      room,
                      startTime,
                    },
                  ],
                })
              }
              title="Save Paper Schedule"
            />
          </AppCard>
          {item.subjectPapers.map(paper => (
            <ExamScheduleItem item={paper} key={paper.id} />
          ))}
          <AppButton
            onPress={() =>
              navigation.navigate(ROUTES.EXAM_SCHEDULE_PREVIEW, route.params)
            }
            title="Conflict Preview"
          />
        </>
      ) : (
        <EmptyState
          description="Open an Exam to manage its schedule."
          title="No Exam Selected"
        />
      )}
    </Shell>
  );
}
export function ExamSchedulePreviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamSchedulePreview'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-schedule-preview-screen"
      title="Schedule Conflict Preview"
    >
      <Feedback />
      {item ? (
        <>
          <ExamSetupIssueList
            emptyLabel="No schedule conflicts."
            issues={item.scheduleConflicts}
          />
          {item.subjectPapers.map(paper => (
            <ExamScheduleItem item={paper} key={paper.id} />
          ))}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

export function ExamSetupReviewScreen({
  navigation,
  route,
}: RoleScreenProps<'ExamSetupReview'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const validate = useExaminationSetupStore(state => state.validateSetup);
  const schedule = useExaminationSetupStore(state => state.scheduleExam);
  const returnDraft = useExaminationSetupStore(state => state.returnToDraft);
  const validating = useExaminationSetupStore(state => state.isValidatingSetup);
  const selectedExamId = item?.id;
  const access = useExaminationAccess({
    ...route.params,
    examStatus: item?.status,
  });
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  useEffect(() => {
    if (selectedExamId) validate().catch(() => undefined);
  }, [selectedExamId, validate]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="exam-setup-review-screen"
      title="Exam Setup Review"
    >
      <Feedback />
      {item ? (
        <>
          <ExamSetupCompletionCard value={item.setupValidation} />
          <Field label="Classes" value={item.classConfigurationCount} />
          <Field label="Subject Papers" value={item.subjectPaperCount} />
          <ExamSetupIssueList
            issues={[
              ...item.setupValidation.blockers,
              ...item.setupValidation.warnings,
            ]}
          />
          {access.canScheduleExam ? (
            <AppButton
              disabled={!item.setupValidation.isComplete}
              loading={validating}
              onPress={schedule}
              title="Confirm and Schedule Exam"
            />
          ) : null}
          {access.canReturnExamToDraft ? (
            <AppButton
              onPress={returnDraft}
              title="Return to Draft"
              variant="outline"
            />
          ) : null}
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

export function CopyExamScreen({
  navigation,
  route,
}: RoleScreenProps<'CopyExam'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const preview = useExaminationSetupStore(state => state.previewCopy);
  const commit = useExaminationSetupStore(state => state.copyExam);
  const value = useExaminationSetupStore(state => state.copyPreview);
  const [destinationBranchId, setBranch] = useState(route.params.branchId);
  const [destinationAcademicSessionId, setSession] = useState(
    route.params.academicSessionId,
  );
  const [destinationTermId, setTerm] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  useEffect(() => {
    if (item) {
      setName(`${item.name} Copy`);
      setCode(`${item.code}-COPY`);
    }
  }, [item]);
  const input = useMemo(
    () => ({
      destinationAcademicSessionId,
      destinationBranchId,
      destinationTermId,
    }),
    [destinationAcademicSessionId, destinationBranchId, destinationTermId],
  );
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="copy-exam-screen"
      title="Copy Exam"
    >
      <Feedback />
      <AppInput
        label="Destination Branch ID"
        onChangeText={setBranch}
        value={destinationBranchId}
      />
      <AppInput
        label="Destination Session ID"
        onChangeText={setSession}
        value={destinationAcademicSessionId}
      />
      <AppInput
        label="Destination Term ID"
        onChangeText={setTerm}
        value={destinationTermId}
      />
      <AppInput label="New Exam name" onChangeText={setName} value={name} />
      <AppInput label="New Exam code" onChangeText={setCode} value={code} />
      <AppButton
        onPress={() => preview(input)}
        title="Preview Copy"
        variant="outline"
      />
      {value ? (
        <>
          <Field label="Matched Classes" value={value.matchedClassCount} />
          <Field label="Matched Subjects" value={value.matchedSubjectCount} />
          <ExamSetupIssueList issues={value.warnings} />
          <AppButton
            onPress={async () => {
              if (await commit({ ...input, code, name })) navigation.goBack();
            }}
            title="Copy as Draft"
          />
        </>
      ) : null}
    </Shell>
  );
}
export function CancelExamScreen({
  navigation,
  route,
}: RoleScreenProps<'CancelExam'>) {
  useContext(route.params);
  const item = useExaminationSetupStore(state => state.selectedExam);
  const load = useExaminationSetupStore(state => state.loadExam);
  const cancel = useExaminationSetupStore(state => state.cancelExam);
  const cancelling = useExaminationSetupStore(state => state.isCancellingExam);
  const [reason, setReason] = useState('');
  useEffect(() => {
    load(route.params.examId).catch(() => undefined);
  }, [load, route.params.examId]);
  return (
    <Shell
      navigation={navigation}
      params={route.params}
      testID="cancel-exam-screen"
      title="Cancel Exam"
    >
      <Feedback />
      {item ? (
        <>
          <ExamStatusBadge value={item.status} />
          <AppText>
            Cancellation preserves all Class, Section, Subject Paper, and
            schedule snapshots.
          </AppText>
          <AppInput
            label="Cancellation reason"
            multiline
            onChangeText={setReason}
            value={reason}
          />
          <AppButton
            disabled={!reason.trim()}
            loading={cancelling}
            onPress={async () => {
              if (await cancel(reason)) navigation.goBack();
            }}
            title="Cancel Exam"
            variant="danger"
          />
        </>
      ) : (
        <LoadingView />
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  field: { gap: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
});
