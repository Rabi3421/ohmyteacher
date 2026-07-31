export interface ResultPercentage {
  basisPoints: number;
  percentage: number;
}

export function calculateResultPercentage(
  marksObtained: number,
  maximumMarks: number,
): ResultPercentage | undefined {
  if (
    !Number.isFinite(marksObtained) ||
    !Number.isFinite(maximumMarks) ||
    maximumMarks <= 0
  )
    return undefined;
  const basisPoints = Math.round((marksObtained * 10_000) / maximumMarks);
  return { basisPoints, percentage: basisPoints / 100 };
}

export function averagePercentages(values: readonly number[]): number {
  if (!values.length) return 0;
  return (
    Math.round(
      values.reduce((total, value) => total + value * 100, 0) / values.length,
    ) / 100
  );
}
