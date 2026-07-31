import type {
  ManualShareService,
  ManualShareResult,
} from './manualShareService';

let nextResult: ManualShareResult = { status: 'HANDED_OFF' };
export function setNextMockManualShareResult(value: ManualShareResult): void {
  nextResult = value;
}
async function result(): Promise<ManualShareResult> {
  const value = nextResult;
  nextResult = { status: 'HANDED_OFF' };
  return value;
}
export const mockManualShareService: ManualShareService = {
  shareReceipt: result,
  shareText: result,
};
