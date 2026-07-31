import type { ApiResponse } from '../../models/common';
import type { ReceiptDocumentResult } from '../../models/collection';
export interface ReceiptDocumentService {
  getDocument(
    schoolId: string,
    receiptId: string,
  ): Promise<ApiResponse<ReceiptDocumentResult>>;
}
