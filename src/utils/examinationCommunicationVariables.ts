import type { TemplateVariables } from '../models/communication';
import type { PublishedResultSnapshot } from '../models/marksResult';
import type { ReportCard } from '../models/reportCard';

export function examinationCommunicationVariables(input: {
  result: PublishedResultSnapshot;
  reportCard?: ReportCard;
  schoolName: string;
  branchName: string;
  academicSessionName?: string;
}): TemplateVariables {
  const { result, reportCard } = input;
  return {
    academicSession: input.academicSessionName ?? result.academicSessionId,
    admissionNumber: result.overallResult.admissionNumberSnapshot,
    branchName: input.branchName,
    className: result.classNameSnapshot,
    examName: result.examNameSnapshot,
    examTerm: result.termNameSnapshot,
    examType: result.examTypeNameSnapshot,
    grade: result.overallResult.grade ?? 'Not assigned',
    percentage: `${result.overallResult.percentage.toFixed(2)}%`,
    publishedDate: result.publishedAt.slice(0, 10),
    rank: result.overallResult.rank
      ? String(result.overallResult.rank)
      : 'Not ranked',
    reportCardLink: reportCard?.documentUrl ?? '',
    reportCardNumber: reportCard?.reportCardNumber ?? '',
    resultOutcome: result.overallResult.outcome,
    schoolName: input.schoolName,
    sectionName: result.sectionNameSnapshot,
    studentName: result.overallResult.studentNameSnapshot,
  };
}
