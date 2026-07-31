import type { RankEntry, StudentOverallResult } from '../models/marksResult';

export function calculateCompetitionRanks(
  results: readonly StudentOverallResult[],
  rankEnabled: boolean,
): StudentOverallResult[] {
  const copied: StudentOverallResult[] = results.map(item => ({
    ...item,
    rank: undefined,
  }));
  if (!rankEnabled) return copied;
  const eligible = copied
    .filter(item => item.outcome === 'PASS')
    .sort(
      (left, right) =>
        right.totalMarksObtained - left.totalMarksObtained ||
        right.percentageBasisPoints - left.percentageBasisPoints ||
        left.studentId.localeCompare(right.studentId),
    );
  eligible.forEach((item, index) => {
    const previous = eligible[index - 1];
    item.rank =
      previous &&
      previous.totalMarksObtained === item.totalMarksObtained &&
      previous.percentageBasisPoints === item.percentageBasisPoints
        ? previous.rank
        : index + 1;
  });
  return copied;
}

export function toRankEntries(
  results: readonly StudentOverallResult[],
): RankEntry[] {
  return [...results]
    .sort(
      (left, right) =>
        (left.rank ?? Number.MAX_SAFE_INTEGER) -
          (right.rank ?? Number.MAX_SAFE_INTEGER) ||
        left.studentId.localeCompare(right.studentId),
    )
    .map(item => ({
      admissionNumber: item.admissionNumberSnapshot,
      outcome: item.outcome,
      percentage: item.percentage,
      rank: item.rank,
      rollNumber: item.rollNumberSnapshot,
      studentId: item.studentId,
      studentName: item.studentNameSnapshot,
      totalMarksObtained: item.totalMarksObtained,
      totalMaximumMarks: item.totalMaximumMarks,
    }));
}
