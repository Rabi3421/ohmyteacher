import type {
  AcademicClass,
  ClassSubjectAssignment,
  Subject,
} from '../models/academic';

export interface ExamCopyMatch {
  classIdBySourceClassId: Record<string, string>;
  subjectIdBySourceSubjectId: Record<string, string>;
  omittedClassCodes: string[];
  omittedSubjectCodes: string[];
}

export function matchExamCopyEntities(input: {
  sourceClasses: readonly AcademicClass[];
  destinationClasses: readonly AcademicClass[];
  sourceSubjects: readonly Subject[];
  destinationSubjects: readonly Subject[];
  destinationAssignments: readonly ClassSubjectAssignment[];
}): ExamCopyMatch {
  const classIdBySourceClassId: Record<string, string> = {};
  const subjectIdBySourceSubjectId: Record<string, string> = {};
  const omittedClassCodes: string[] = [];
  const omittedSubjectCodes: string[] = [];
  input.sourceClasses.forEach(source => {
    const destination = input.destinationClasses.find(
      item =>
        item.status === 'ACTIVE' &&
        item.code.toUpperCase() === source.code.toUpperCase(),
    );
    if (destination) classIdBySourceClassId[source.id] = destination.id;
    else omittedClassCodes.push(source.code);
  });
  input.sourceSubjects.forEach(source => {
    const destination = input.destinationSubjects.find(
      item =>
        item.status === 'ACTIVE' &&
        (item.id === source.id ||
          item.code.toUpperCase() === source.code.toUpperCase()),
    );
    const assigned =
      destination &&
      input.destinationAssignments.some(
        item => item.subjectId === destination.id && item.status === 'ACTIVE',
      );
    if (destination && assigned)
      subjectIdBySourceSubjectId[source.id] = destination.id;
    else omittedSubjectCodes.push(source.code);
  });
  return {
    classIdBySourceClassId,
    omittedClassCodes: [...new Set(omittedClassCodes)].sort(),
    omittedSubjectCodes: [...new Set(omittedSubjectCodes)].sort(),
    subjectIdBySourceSubjectId,
  };
}
