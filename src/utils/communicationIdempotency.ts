export function communicationIdempotencyKey(
  ...parts: Array<string | number>
): string {
  return parts.map(part => String(part).trim().toLowerCase()).join('::');
}

export function reminderIdempotencyKey(input: {
  ruleId: string;
  feeDueId: string;
  scheduledDate: string;
  occurrenceNumber: number;
}): string {
  return communicationIdempotencyKey(
    input.ruleId,
    input.feeDueId,
    input.scheduledDate.slice(0, 10),
    input.occurrenceNumber,
  );
}
