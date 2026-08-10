import { selectRepository } from '../integration/integrationMode';
import { apiReceiptDocumentService } from './apiReceiptDocumentService';
import { mockReceiptDocumentService } from './mockReceiptDocumentService';
export const receiptDocumentService = selectRepository({
  live: apiReceiptDocumentService,
  mock: mockReceiptDocumentService,
  module: 'receipt-documents',
  unsupported: apiReceiptDocumentService,
});
