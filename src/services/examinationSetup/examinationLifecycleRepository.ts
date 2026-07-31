import type { ExamStatus } from '../../models/examination';

const lifecycle = new Map<string, ExamStatus>();

export function getExamLifecycleStatus(
  examId: string,
  fallback: ExamStatus,
): ExamStatus {
  return lifecycle.get(examId) ?? fallback;
}

export function setExamLifecycleStatus(
  examId: string,
  status: ExamStatus,
): void {
  lifecycle.set(examId, status);
}

export function clearExamLifecycleStatus(examId?: string): void {
  if (examId) lifecycle.delete(examId);
  else lifecycle.clear();
}
