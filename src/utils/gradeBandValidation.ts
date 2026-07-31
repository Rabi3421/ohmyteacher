import type { GradeBand, GradingScheme } from '../models/examination';

export interface GradeBandValidationError {
  code: string;
  message: string;
  bandId?: string;
}

const BOUNDARY_TOLERANCE = 0.011;

export function sortGradeBands<
  T extends Pick<GradeBand, 'minimumPercentage' | 'displayOrder'>,
>(bands: readonly T[]): T[] {
  return [...bands].sort(
    (left, right) =>
      left.minimumPercentage - right.minimumPercentage ||
      left.displayOrder - right.displayOrder,
  );
}

export function validateGradeBands(
  bands: readonly GradeBand[],
): GradeBandValidationError[] {
  if (bands.length === 0)
    return [
      { code: 'GRADE_BANDS_REQUIRED', message: 'Add at least one Grade Band.' },
    ];
  const errors: GradeBandValidationError[] = [];
  const labels = new Set<string>();
  const displayOrders = new Set<number>();
  for (const band of bands) {
    const label = band.grade.trim().toUpperCase();
    if (!label)
      errors.push({
        bandId: band.id,
        code: 'GRADE_REQUIRED',
        message: 'Grade label is required.',
      });
    else if (labels.has(label))
      errors.push({
        bandId: band.id,
        code: 'DUPLICATE_GRADE',
        message: `Grade ${band.grade} is duplicated.`,
      });
    labels.add(label);
    if (
      !Number.isFinite(band.minimumPercentage) ||
      !Number.isFinite(band.maximumPercentage) ||
      band.minimumPercentage < 0 ||
      band.maximumPercentage > 100
    )
      errors.push({
        bandId: band.id,
        code: 'GRADE_RANGE_OUT_OF_BOUNDS',
        message: 'Grade percentages must stay between 0 and 100.',
      });
    if (band.minimumPercentage > band.maximumPercentage)
      errors.push({
        bandId: band.id,
        code: 'INVALID_GRADE_RANGE',
        message: 'Minimum percentage cannot exceed maximum percentage.',
      });
    if (
      band.gradePoint !== undefined &&
      (!Number.isFinite(band.gradePoint) || band.gradePoint < 0)
    )
      errors.push({
        bandId: band.id,
        code: 'INVALID_GRADE_POINT',
        message: 'Grade Point must be zero or positive.',
      });
    if (
      !Number.isInteger(band.displayOrder) ||
      band.displayOrder <= 0 ||
      displayOrders.has(band.displayOrder)
    )
      errors.push({
        bandId: band.id,
        code: 'INVALID_GRADE_DISPLAY_ORDER',
        message: 'Grade Band display order must be unique and positive.',
      });
    displayOrders.add(band.displayOrder);
  }
  const sorted = sortGradeBands(bands);
  if (sorted[0]?.minimumPercentage !== 0)
    errors.push({
      code: 'GRADE_RANGE_START_GAP',
      message: 'Grade Bands must start at 0 percent.',
    });
  if (sorted.at(-1)?.maximumPercentage !== 100)
    errors.push({
      code: 'GRADE_RANGE_END_GAP',
      message: 'Grade Bands must end at 100 percent.',
    });
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (current.minimumPercentage <= previous.maximumPercentage)
      errors.push({
        bandId: current.id,
        code: 'OVERLAPPING_GRADE_BANDS',
        message: `${previous.grade} and ${current.grade} overlap.`,
      });
    else if (
      current.minimumPercentage - previous.maximumPercentage >
      BOUNDARY_TOLERANCE
    )
      errors.push({
        bandId: current.id,
        code: 'GAP_IN_GRADE_BANDS',
        message: `There is a gap before ${current.grade}.`,
      });
  }
  if (!bands.some(band => band.isPassing))
    errors.push({
      code: 'PASSING_GRADE_REQUIRED',
      message: 'At least one passing Grade Band is required.',
    });
  if (!bands.some(band => !band.isPassing))
    errors.push({
      code: 'FAILING_GRADE_REQUIRED',
      message: 'At least one failing Grade Band is required.',
    });
  return errors;
}

export function findGradeBand(
  bands: readonly GradeBand[],
  percentage: number,
): GradeBand | undefined {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    return undefined;
  return sortGradeBands(bands).find(
    band =>
      percentage >= band.minimumPercentage &&
      percentage <= band.maximumPercentage + Number.EPSILON,
  );
}

export function validateDefaultGradingSchemeUniqueness(
  schemes: readonly GradingScheme[],
  candidate: Pick<GradingScheme, 'id' | 'isDefault' | 'status'>,
): boolean {
  if (!candidate.isDefault || candidate.status !== 'ACTIVE') return true;
  return !schemes.some(
    scheme =>
      scheme.id !== candidate.id &&
      scheme.isDefault &&
      scheme.status === 'ACTIVE',
  );
}
