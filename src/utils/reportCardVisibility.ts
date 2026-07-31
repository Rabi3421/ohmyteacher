import type { PublishedResultSnapshot } from '../models/marksResult';
import type {
  ReportCard,
  ReportCardVisibilityResult,
} from '../models/reportCard';
import type { ParentStudentLink } from '../models/student';

export function reportCardVisibility(
  card: ReportCard,
  publication?: PublishedResultSnapshot,
): ReportCardVisibilityResult {
  if (card.status !== 'AVAILABLE')
    return {
      reason:
        card.status === 'REVOKED'
          ? 'Report Card was revoked.'
          : 'Report Card is not available.',
      visible: false,
    };
  if (
    !publication ||
    publication.status !== 'PUBLISHED' ||
    publication.publicationBatchId !== card.publicationBatchId
  )
    return {
      reason: 'The related Result publication is not active.',
      visible: false,
    };
  return { visible: true };
}
export function parentOwnsStudent(input: {
  schoolId: string;
  parentMembershipId: string;
  studentId: string;
  links: readonly ParentStudentLink[];
}): boolean {
  return input.links.some(
    item =>
      item.schoolId === input.schoolId &&
      item.parentMembershipId === input.parentMembershipId &&
      item.studentId === input.studentId &&
      item.status === 'ACTIVE',
  );
}
export function studentMembershipOwnsStudent(input: {
  schoolId: string;
  studentMembershipId: string;
  studentId: string;
  memberships: readonly {
    id: string;
    schoolId?: string;
    studentId?: string;
    role: string;
    status: string;
  }[];
}): boolean {
  return input.memberships.some(
    item =>
      item.id === input.studentMembershipId &&
      item.schoolId === input.schoolId &&
      item.studentId === input.studentId &&
      item.role === 'STUDENT' &&
      item.status === 'ACTIVE',
  );
}
export function latestVisibleReportCards(
  cards: readonly ReportCard[],
  publications: readonly PublishedResultSnapshot[],
): ReportCard[] {
  const visible = cards.filter(
    card =>
      reportCardVisibility(
        card,
        publications.find(item => item.id === card.publishedResultSnapshotId),
      ).visible,
  );
  const latest = new Map<string, ReportCard>();
  visible.forEach(card => {
    const key = `${card.studentId}::${card.examId}`;
    const current = latest.get(key);
    if (!current || card.version > current.version) latest.set(key, card);
  });
  return [...latest.values()];
}
