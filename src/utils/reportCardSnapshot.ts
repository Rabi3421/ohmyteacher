import type {
  ReportCard,
  ReportCardSnapshotInput,
  ReportCardTemplateSnapshot,
} from '../models/reportCard';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function omitKeys<T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> {
  const copy = { ...value };
  keys.forEach(key => delete copy[key]);
  return copy;
}
export function snapshotReportCardTemplate(
  input: ReportCardSnapshotInput['template'],
): ReportCardTemplateSnapshot {
  const value = clone(input);
  const templateId = value.id;
  const templateUpdatedAt = value.updatedAt;
  const configuration = omitKeys(value, [
    'activeUsageCount',
    'createdAt',
    'id',
    'schoolId',
    'updatedAt',
  ]);
  return { ...configuration, templateId, templateUpdatedAt };
}
export function buildReportCardSnapshot(
  input: ReportCardSnapshotInput,
): ReportCard {
  const published = clone(input.publishedResult);
  const calculationVersions = published.subjectResults
    .map(item => item.calculationVersion)
    .concat(published.overallResult.calculationVersion);
  return {
    academicSessionId: published.academicSessionId,
    availableAt: input.generatedAt,
    branchId: published.branchId,
    branchSnapshot: clone(input.branchSnapshot),
    calculationRunId: published.calculationRunId,
    createdAt: input.generatedAt,
    documentStatus: 'PREVIEW_READY',
    documentUrl: `development://report-cards/${input.id}/preview`,
    enrollmentId: published.enrollmentId,
    examId: published.examId,
    examSnapshot: {
      academicSessionName:
        input.academicSessionName ?? published.academicSessionId,
      examTypeName: published.examTypeNameSnapshot,
      name: published.examNameSnapshot,
      termName: published.termNameSnapshot,
    },
    generatedAt: input.generatedAt,
    generatedByName: input.generatedByName,
    generatedByUserId: input.generatedByUserId,
    generationRunId: input.generationRunId,
    gradingSchemeSnapshot: clone(input.gradingSchemeSnapshot),
    id: input.id,
    isDevelopmentDocument: true,
    overallResult: clone(published.overallResult),
    publicationBatchId: published.publicationBatchId,
    publishedResultSnapshotId: published.id,
    reportCardNumber: input.reportCardNumber,
    schoolId: published.schoolId,
    schoolSnapshot: clone(input.schoolSnapshot),
    status: 'AVAILABLE',
    studentId: published.studentId,
    studentSnapshot: {
      admissionNumber: published.overallResult.admissionNumberSnapshot,
      className: published.classNameSnapshot,
      name: published.overallResult.studentNameSnapshot,
      rollNumber: published.rollNumberSnapshot,
      sectionName: published.sectionNameSnapshot,
    },
    subjectResults: clone(published.subjectResults),
    templateId: input.template.id,
    templateSnapshot: snapshotReportCardTemplate(input.template),
    updatedAt: input.generatedAt,
    version: input.version,
    versionReference: {
      calculationRunId: published.calculationRunId,
      publicationBatchId: published.publicationBatchId,
      reportCardVersion: input.version,
      resultCalculationVersion: Math.max(...calculationVersions),
    },
  };
}
