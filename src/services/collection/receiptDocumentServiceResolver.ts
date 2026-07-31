import { env } from '../../config/env';
import { apiReceiptDocumentService } from './apiReceiptDocumentService';
import { mockReceiptDocumentService } from './mockReceiptDocumentService';
export const receiptDocumentService =
  env.dataSource === 'api'
    ? apiReceiptDocumentService
    : mockReceiptDocumentService;
