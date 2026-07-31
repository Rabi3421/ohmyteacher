import type {
  AssessmentComponent,
  ExamSetupIssue,
  ExamSubjectPaper,
} from '../models/examination';

export function assessmentComponentTotal(
  components: readonly Pick<AssessmentComponent, 'maximumMarks'>[],
): number {
  return components.reduce(
    (total, component) => total + component.maximumMarks,
    0,
  );
}

export function assessmentComponentPassTotal(
  components: readonly Pick<AssessmentComponent, 'passMarks'>[],
): number {
  return components.reduce(
    (total, component) => total + (component.passMarks ?? 0),
    0,
  );
}

export function validateMarksConfiguration(
  paper: Pick<
    ExamSubjectPaper,
    | 'id'
    | 'totalMaximumMarks'
    | 'totalPassMarks'
    | 'weightagePercent'
    | 'components'
  >,
): ExamSetupIssue[] {
  const issue = (
    code: string,
    message: string,
    field?: string,
  ): ExamSetupIssue => ({
    code,
    field,
    message,
    paperId: paper.id,
    severity: 'BLOCKER',
  });
  const errors: ExamSetupIssue[] = [];
  if (
    !Number.isInteger(paper.totalMaximumMarks) ||
    paper.totalMaximumMarks <= 0
  )
    errors.push(
      issue(
        'INVALID_PAPER_MAXIMUM',
        'Paper maximum marks must be a positive whole number.',
        'totalMaximumMarks',
      ),
    );
  if (
    !Number.isInteger(paper.totalPassMarks) ||
    paper.totalPassMarks < 0 ||
    paper.totalPassMarks > paper.totalMaximumMarks
  )
    errors.push(
      issue(
        'INVALID_PAPER_PASS_MARKS',
        'Paper pass marks must be a whole number between zero and maximum marks.',
        'totalPassMarks',
      ),
    );
  if (
    paper.weightagePercent !== undefined &&
    (!Number.isFinite(paper.weightagePercent) ||
      paper.weightagePercent < 0 ||
      paper.weightagePercent > 100)
  )
    errors.push(
      issue(
        'INVALID_PAPER_WEIGHTAGE',
        'Paper weightage must be between 0 and 100.',
        'weightagePercent',
      ),
    );
  if (paper.components.length === 0)
    errors.push(
      issue(
        'ASSESSMENT_COMPONENT_REQUIRED',
        'Add at least one Assessment Component.',
        'components',
      ),
    );
  const names = new Set<string>();
  const orders = new Set<number>();
  paper.components.forEach(component => {
    const name = component.name.trim().toLowerCase();
    if (!name)
      errors.push(
        issue(
          'COMPONENT_NAME_REQUIRED',
          'Assessment Component name is required.',
          'components',
        ),
      );
    else if (names.has(name))
      errors.push(
        issue(
          'DUPLICATE_COMPONENT_NAME',
          `Component ${component.name} is duplicated.`,
          'components',
        ),
      );
    names.add(name);
    if (
      !Number.isInteger(component.maximumMarks) ||
      component.maximumMarks <= 0
    )
      errors.push(
        issue(
          'INVALID_COMPONENT_MAXIMUM',
          `${
            component.name || 'Component'
          } maximum marks must be a positive whole number.`,
          'components',
        ),
      );
    if (
      component.passMarks !== undefined &&
      (!Number.isInteger(component.passMarks) ||
        component.passMarks < 0 ||
        component.passMarks > component.maximumMarks)
    )
      errors.push(
        issue(
          'INVALID_COMPONENT_PASS_MARKS',
          `${
            component.name || 'Component'
          } pass marks cannot exceed maximum marks.`,
          'components',
        ),
      );
    if (
      !Number.isInteger(component.displayOrder) ||
      component.displayOrder <= 0 ||
      orders.has(component.displayOrder)
    )
      errors.push(
        issue(
          'INVALID_COMPONENT_DISPLAY_ORDER',
          'Component display order must be unique and positive.',
          'components',
        ),
      );
    orders.add(component.displayOrder);
  });
  if (assessmentComponentTotal(paper.components) !== paper.totalMaximumMarks)
    errors.push(
      issue(
        'COMPONENT_TOTAL_MISMATCH',
        'Component maximum marks must equal Paper maximum marks.',
        'components',
      ),
    );
  if (assessmentComponentPassTotal(paper.components) > paper.totalPassMarks)
    errors.push(
      issue(
        'INCOMPATIBLE_COMPONENT_PASS_TOTAL',
        'Required Component pass marks cannot exceed Paper pass marks.',
        'components',
      ),
    );
  return errors;
}
