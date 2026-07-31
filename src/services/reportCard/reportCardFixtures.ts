import type {
  PublishedResultSnapshot,
  PublishedSubjectResultSnapshot,
} from '../../models/marksResult';
import type {
  ReportCard,
  ReportCardGenerationRun,
  ReportCardTemplate,
} from '../../models/reportCard';
import { INITIAL_GRADING_SCHEMES } from '../examinationSetup/examinationSetupFixtures';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import { buildReportCardSnapshot } from '../../utils/reportCardSnapshot';

export const REPORT_CARD_FIXTURE_CLOCK = '2026-08-25T10:00:00.000Z';
const schoolId = 'school-omt';
const branchId = 'branch-main';
const sessionId = 'session-school-omt-current';
const examId = 'exam-omt-scheduled';
const bands = INITIAL_GRADING_SCHEMES[0].bands;
const studentIds = [
  'student-rahul',
  'student-isha',
  'student-aarav',
  'student-arjun',
  'student-reyansh',
];

function published(
  studentId: string,
  index: number,
  status: PublishedResultSnapshot['status'] = 'PUBLISHED',
  batchId = 'publication-batch-phase13-active',
): PublishedResultSnapshot {
  const profile = INITIAL_STUDENT_PROFILES.find(item => item.id === studentId)!;
  const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
    item =>
      item.studentId === studentId && item.academicSessionId === sessionId,
  )!;
  const marks = 84 - index * 5;
  const percentage = marks;
  const subject: PublishedSubjectResultSnapshot = {
    academicSessionId: sessionId,
    attendanceStatus: 'PRESENT',
    branchId,
    calculationVersion: batchId.includes('old') ? 1 : 2,
    componentResults: [
      {
        assessmentComponentId: 'component-theory',
        componentNameSnapshot: 'Theory',
        componentTypeSnapshot: 'THEORY',
        marksEntryRequiredSnapshot: true,
        marksObtained: marks - 10,
        maximumMarksSnapshot: 80,
        outcome: 'PASS',
        passMarksSnapshot: 32,
      },
      {
        assessmentComponentId: 'component-oral',
        componentNameSnapshot: 'Oral',
        componentTypeSnapshot: 'ORAL',
        marksEntryRequiredSnapshot: true,
        marksObtained: 10,
        maximumMarksSnapshot: 20,
        outcome: 'PASS',
        passMarksSnapshot: 8,
      },
    ],
    enrollmentId: enrollment.id,
    examClassConfigurationId: `report-config-${enrollment.classId}`,
    examId,
    grade: percentage >= 80 ? 'A' : 'B',
    gradePoint: percentage >= 80 ? 9 : 8,
    id: `published-subject-${batchId}-${studentId}`,
    marksObtained: marks,
    maximumMarks: 100,
    outcome: 'PASS',
    passMarks: 40,
    percentage,
    percentageBasisPoints: percentage * 100,
    schoolId,
    sectionId: enrollment.sectionId,
    studentId,
    subjectCodeSnapshot: 'MAT',
    subjectId: 'subject-mathematics',
    subjectNameSnapshot: 'Mathematics',
    subjectPaperId: 'paper-scheduled-math',
    subjectTypeSnapshot: 'CORE',
  };
  return {
    academicSessionId: sessionId,
    branchId,
    classNameSnapshot: enrollment.classId
      .replace('class-omt-', 'Class ')
      .toUpperCase(),
    enrollmentId: enrollment.id,
    examId,
    examNameSnapshot: 'Term 1 Unit Test',
    examTypeNameSnapshot: 'Unit Test',
    id: `published-result-${batchId}-${studentId}`,
    overallResult: {
      absentSubjectCount: 0,
      academicSessionId: sessionId,
      admissionNumberSnapshot: profile.admissionNumber,
      branchId,
      calculationVersion: subject.calculationVersion,
      classNameSnapshot: enrollment.classId
        .replace('class-omt-', 'Class ')
        .toUpperCase(),
      enrollmentId: enrollment.id,
      examClassConfigurationId: subject.examClassConfigurationId,
      examId,
      exemptSubjectCount: 0,
      failedSubjectCount: 0,
      grade: subject.grade,
      gradeBandSnapshot: bands.find(item => item.grade === subject.grade),
      gradePoint: subject.gradePoint,
      id: `published-overall-${batchId}-${studentId}`,
      outcome: 'PASS',
      passedSubjectCount: 1,
      percentage,
      percentageBasisPoints: percentage * 100,
      publishedAt: REPORT_CARD_FIXTURE_CLOCK,
      rank: index + 1,
      resultStatus: 'PUBLISHED',
      rollNumberSnapshot: enrollment.rollNumber,
      schoolId,
      sectionId: enrollment.sectionId,
      sectionNameSnapshot: 'Section A',
      studentId,
      studentNameSnapshot: profile.fullName,
      totalMarksObtained: marks,
      totalMaximumMarks: 100,
    },
    calculationRunId: `calculation-run-${batchId}`,
    publicationBatchId: batchId,
    publishedAt: REPORT_CARD_FIXTURE_CLOCK,
    publishedByName: 'Ananya Sharma',
    publishedByUserId: 'user-school-admin',
    rollNumberSnapshot: enrollment.rollNumber,
    schoolId,
    sectionNameSnapshot: 'Section A',
    status,
    studentId,
    subjectResults: [subject],
    termNameSnapshot: 'Term 1',
  };
}

export const INITIAL_PUBLISHED_RESULT_SNAPSHOTS: PublishedResultSnapshot[] = [
  ...studentIds.map((id, index) => published(id, index)),
  published('student-rahul', 0, 'UNPUBLISHED', 'publication-batch-phase13-old'),
];

const templateBase = {
  description: 'Release 1 standard academic Report Card.',
  footerText: 'This is a system-generated academic record.',
  layoutType: 'STANDARD' as const,
  parentSignatureLabel: 'Parent / Guardian',
  principalSignatureLabel: 'Principal',
  schoolAuthoritySignatureLabel: 'School Authority',
  showBranchAddress: true,
  showComponentMarks: true,
  showGenerationMetadata: true,
  showGradeLegend: true,
  showOverallGrade: true,
  showOverallOutcome: true,
  showOverallPercentage: true,
  showRank: true,
  showSchoolLogo: true,
  showStudentPhoto: false,
  showSubjectGrade: true,
  showSubjectOutcome: true,
  showSubjectPercentage: true,
  subtitle: 'Academic Performance',
  title: 'Report Card',
};
export const INITIAL_REPORT_CARD_TEMPLATES: ReportCardTemplate[] = [
  {
    ...templateBase,
    activeUsageCount: 3,
    code: 'STANDARD',
    createdAt: REPORT_CARD_FIXTURE_CLOCK,
    id: 'report-template-standard',
    isDefault: true,
    name: 'Standard Report Card',
    schoolId,
    status: 'ACTIVE',
    updatedAt: REPORT_CARD_FIXTURE_CLOCK,
  },
  {
    ...templateBase,
    activeUsageCount: 0,
    code: 'COMPACT_DRAFT',
    createdAt: REPORT_CARD_FIXTURE_CLOCK,
    id: 'report-template-draft',
    isDefault: false,
    layoutType: 'COMPACT',
    name: 'Compact Draft',
    schoolId,
    status: 'DRAFT',
    updatedAt: REPORT_CARD_FIXTURE_CLOCK,
  },
  {
    ...templateBase,
    activeUsageCount: 1,
    code: 'LEGACY',
    createdAt: REPORT_CARD_FIXTURE_CLOCK,
    id: 'report-template-inactive',
    isDefault: false,
    name: 'Legacy Template',
    schoolId,
    status: 'INACTIVE',
    updatedAt: REPORT_CARD_FIXTURE_CLOCK,
  },
];

const school = INITIAL_SCHOOLS.find(item => item.id === schoolId)!;
const branch = INITIAL_BRANCHES.find(item => item.id === branchId)!;
const session = INITIAL_ACADEMIC_SESSIONS.find(item => item.id === sessionId)!;
const address = (value: typeof school.address) =>
  [value.line1, value.city, value.state, value.pinCode, value.country]
    .filter(Boolean)
    .join(', ');
const snapshotContext = {
  branchSnapshot: {
    address: address(branch.address),
    code: branch.code,
    name: branch.name,
  },
  gradingSchemeSnapshot: {
    bands,
    code: INITIAL_GRADING_SCHEMES[0].code,
    name: INITIAL_GRADING_SCHEMES[0].name,
  },
  schoolSnapshot: {
    address: address(school.address),
    code: school.code,
    email: school.email,
    logoUrl: school.logoUrl,
    name: school.name,
    phone: school.mobile,
  },
};
function cardFor(
  result: PublishedResultSnapshot,
  id: string,
  number: string,
  version: number,
  status: ReportCard['status'],
): ReportCard {
  const value = buildReportCardSnapshot({
    ...snapshotContext,
    academicSessionName: session.name,
    generatedAt: REPORT_CARD_FIXTURE_CLOCK,
    generatedByName: 'Ananya Sharma',
    generatedByUserId: 'user-school-admin',
    generationRunId: 'report-run-fixture',
    id,
    publishedResult: result,
    reportCardNumber: number,
    template: INITIAL_REPORT_CARD_TEMPLATES[0],
    version,
  });
  return {
    ...value,
    status,
    ...(status === 'AVAILABLE'
      ? { documentStatus: 'DOCUMENT_READY' as const }
      : {}),
    ...(status === 'REVOKED'
      ? {
          revocationReason: 'Superseded by corrected publication.',
          revokedAt: REPORT_CARD_FIXTURE_CLOCK,
          revokedByName: 'Ananya Sharma',
          revokedByUserId: 'user-school-admin',
        }
      : {}),
    ...(status === 'FAILED'
      ? { documentStatus: 'DOCUMENT_FAILED' as const, documentUrl: undefined }
      : {}),
  };
}
const activeRahul = INITIAL_PUBLISHED_RESULT_SNAPSHOTS[0];
const activeIsha = INITIAL_PUBLISHED_RESULT_SNAPSHOTS[1];
const activeAarav = INITIAL_PUBLISHED_RESULT_SNAPSHOTS[2];
const activeArjun = INITIAL_PUBLISHED_RESULT_SNAPSHOTS[3];
const oldRahul = INITIAL_PUBLISHED_RESULT_SNAPSHOTS.at(-1)!;
export const INITIAL_REPORT_CARDS: ReportCard[] = [
  cardFor(
    oldRahul,
    'report-card-rahul-v1',
    'RC/MAIN/2026-27/UNIT/000001',
    1,
    'REVOKED',
  ),
  cardFor(
    activeRahul,
    'report-card-rahul-v2',
    'RC/MAIN/2026-27/UNIT/000002',
    2,
    'AVAILABLE',
  ),
  cardFor(
    activeArjun,
    'report-card-arjun-v1',
    'RC/MAIN/2026-27/UNIT/000003',
    1,
    'AVAILABLE',
  ),
  cardFor(
    activeIsha,
    'report-card-isha-generated',
    'RC/MAIN/2026-27/UNIT/000004',
    1,
    'GENERATED',
  ),
  cardFor(
    activeAarav,
    'report-card-aarav-failed',
    'RC/MAIN/2026-27/UNIT/000005',
    1,
    'FAILED',
  ),
];
export const INITIAL_REPORT_CARD_RUNS: ReportCardGenerationRun[] = [
  {
    academicSessionId: sessionId,
    branchId,
    classConfigurationIds: [],
    completedAt: REPORT_CARD_FIXTURE_CLOCK,
    createdAt: REPORT_CARD_FIXTURE_CLOCK,
    examId,
    existingCount: 0,
    failedCount: 0,
    generatedCount: 3,
    id: 'report-run-fixture',
    publicationBatchId: 'publication-batch-phase13-active',
    requestedAt: REPORT_CARD_FIXTURE_CLOCK,
    requestedByName: 'Ananya Sharma',
    requestedByUserId: 'user-school-admin',
    schoolId,
    scope: 'COMPLETE_EXAM',
    sectionIds: [],
    skippedCount: 0,
    status: 'COMPLETED',
    studentIds: ['student-rahul', 'student-arjun'],
    templateId: 'report-template-standard',
    totalCandidates: 3,
  },
];
export const REPORT_CARD_SCENARIOS = {
  activePublicationBatchId: 'publication-batch-phase13-active',
  activeTemplateId: 'report-template-standard',
  availableParentCardId: 'report-card-rahul-v2',
  availableStudentCardId: 'report-card-arjun-v1',
  closedSessionId: 'session-school-omt-closed',
  crossSchoolId: 'school-greenfield',
  draftTemplateId: 'report-template-draft',
  expiredPreview: 'REPORT_CARD_PREVIEW_EXPIRED',
  parentMembershipId: 'membership-parent',
  studentMembershipId: 'membership-student',
} as const;
