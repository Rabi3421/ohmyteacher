export interface ManualShareTextInput {
  message: string;
  recipientMobile?: string;
  title?: string;
}
export interface ManualShareReceiptInput extends ManualShareTextInput {
  documentUri: string;
}
export type ManualShareResult =
  | { status: 'HANDED_OFF'; activityType?: string }
  | { status: 'CANCELLED' }
  | { status: 'FAILED'; failureReason: string };
export interface ManualShareService {
  shareText(input: ManualShareTextInput): Promise<ManualShareResult>;
  shareReceipt(input: ManualShareReceiptInput): Promise<ManualShareResult>;
}
