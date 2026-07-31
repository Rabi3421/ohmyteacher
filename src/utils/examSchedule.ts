import type {
  ExamClassConfiguration,
  ExamScheduleConflict,
  ExamSubjectPaper,
} from '../models/examination';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function calculateScheduleEndTime(
  startTime: string,
  durationMinutes: number,
): string | undefined {
  if (
    !TIME_PATTERN.test(startTime) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0
  )
    return undefined;
  const [hour, minute] = startTime.split(':').map(Number);
  const total = hour * 60 + minute + durationMinutes;
  if (total >= 24 * 60) return undefined;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
    total % 60,
  ).padStart(2, '0')}`;
}

export function isDateInsideRange(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  return DATE_PATTERN.test(date) && date >= startDate && date <= endDate;
}

export function sortScheduledPapers(
  papers: readonly ExamSubjectPaper[],
): ExamSubjectPaper[] {
  return [...papers].sort(
    (left, right) =>
      (left.examDate ?? '9999').localeCompare(right.examDate ?? '9999') ||
      (left.startTime ?? '99:99').localeCompare(right.startTime ?? '99:99') ||
      left.displayOrder - right.displayOrder ||
      left.id.localeCompare(right.id),
  );
}

function overlaps(left: ExamSubjectPaper, right: ExamSubjectPaper): boolean {
  if (
    !left.examDate ||
    left.examDate !== right.examDate ||
    !left.startTime ||
    !right.startTime ||
    !left.durationMinutes ||
    !right.durationMinutes
  )
    return false;
  const leftEnd = calculateScheduleEndTime(
    left.startTime,
    left.durationMinutes,
  );
  const rightEnd = calculateScheduleEndTime(
    right.startTime,
    right.durationMinutes,
  );
  return Boolean(
    leftEnd &&
      rightEnd &&
      left.startTime < rightEnd! &&
      right.startTime < leftEnd!,
  );
}

export function detectScheduleConflicts(input: {
  papers: readonly ExamSubjectPaper[];
  configurations: readonly ExamClassConfiguration[];
  examStartDate: string;
  examEndDate: string;
  sessionStartDate: string;
  sessionEndDate: string;
}): ExamScheduleConflict[] {
  const conflicts: ExamScheduleConflict[] = [];
  const configuration = new Map(
    input.configurations.map(item => [item.id, item]),
  );
  const add = (
    code: ExamScheduleConflict['code'],
    message: string,
    paperIds: string[],
    severity: 'BLOCKER' | 'WARNING' = 'BLOCKER',
    examDate?: string,
  ) =>
    conflicts.push({
      code,
      examDate,
      message,
      paperIds: [...paperIds].sort(),
      severity,
    });
  input.papers.forEach(paper => {
    if (
      !paper.examDate ||
      !paper.startTime ||
      !paper.durationMinutes ||
      !calculateScheduleEndTime(paper.startTime, paper.durationMinutes)
    )
      add(
        'MISSING_SCHEDULE',
        `${paper.subjectNameSnapshot} has no valid schedule.`,
        [paper.id],
        'BLOCKER',
        paper.examDate,
      );
    else {
      if (
        !isDateInsideRange(
          paper.examDate,
          input.examStartDate,
          input.examEndDate,
        )
      )
        add(
          'OUTSIDE_EXAM_DATE_RANGE',
          `${paper.subjectNameSnapshot} is outside the Exam date range.`,
          [paper.id],
          'BLOCKER',
          paper.examDate,
        );
      if (
        !isDateInsideRange(
          paper.examDate,
          input.sessionStartDate,
          input.sessionEndDate,
        )
      )
        add(
          'OUTSIDE_SESSION_RANGE',
          `${paper.subjectNameSnapshot} is outside the Academic Session.`,
          [paper.id],
          'BLOCKER',
          paper.examDate,
        );
    }
  });
  for (let leftIndex = 0; leftIndex < input.papers.length; leftIndex++) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < input.papers.length;
      rightIndex++
    ) {
      const left = input.papers[leftIndex];
      const right = input.papers[rightIndex];
      if (
        left.examClassConfigurationId === right.examClassConfigurationId &&
        left.subjectId === right.subjectId
      )
        add(
          'DUPLICATE_SUBJECT',
          `${left.subjectNameSnapshot} is duplicated for a Class.`,
          [left.id, right.id],
        );
      if (!overlaps(left, right)) continue;
      const leftConfiguration = configuration.get(
        left.examClassConfigurationId,
      );
      const rightConfiguration = configuration.get(
        right.examClassConfigurationId,
      );
      if (left.classId === right.classId)
        add(
          'CLASS_TIME_OVERLAP',
          'Two Papers overlap for the same Class.',
          [left.id, right.id],
          'BLOCKER',
          left.examDate,
        );
      const sharedSections =
        leftConfiguration?.sectionIds.filter(sectionId =>
          rightConfiguration?.sectionIds.includes(sectionId),
        ) ?? [];
      if (sharedSections.length > 0)
        add(
          'SECTION_TIME_OVERLAP',
          'Two Papers overlap for an applicable Section.',
          [left.id, right.id],
          'BLOCKER',
          left.examDate,
        );
      if (
        left.room?.trim() &&
        left.room.trim().toLowerCase() === right.room?.trim().toLowerCase()
      )
        add(
          'ROOM_TIME_OVERLAP',
          `Room ${left.room} is used by overlapping Papers.`,
          [left.id, right.id],
          'WARNING',
          left.examDate,
        );
    }
  }
  return conflicts.sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      left.paperIds.join().localeCompare(right.paperIds.join()),
  );
}
