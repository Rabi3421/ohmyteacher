import { ApiClientError } from '../api/apiError';
import type { ReceiptDocumentService } from './receiptDocumentService';
export const apiReceiptDocumentService: ReceiptDocumentService = {
  async getDocument() {
    throw new ApiClientError({
      code: 'RECEIPT_DOCUMENT_API_UNAVAILABLE',
      message: 'Receipt document API is not configured.',
      status: 503,
    });
  },
};
