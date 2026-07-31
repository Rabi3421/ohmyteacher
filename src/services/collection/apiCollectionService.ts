import { ApiClientError } from '../api/apiError';
import type { CollectionService } from './collectionService';
const unavailable = (): never => {
  throw new ApiClientError({
    code: 'COLLECTION_API_UNAVAILABLE',
    message: 'Collection API mode is not configured.',
    status: 503,
  });
};
export const apiCollectionService: CollectionService = {
  applyAdvanceCredit: async () => unavailable(),
  getCollectableStudentDues: async () => unavailable(),
  getCollectionDashboard: async () => unavailable(),
  getDailyCollection: async () => unavailable(),
  getParentReceipt: async () => unavailable(),
  getParentReceipts: async () => unavailable(),
  getPayment: async () => unavailable(),
  getPayments: async () => unavailable(),
  getReceipt: async () => unavailable(),
  getReceiptDocument: async () => unavailable(),
  getReceipts: async () => unavailable(),
  getStudentAdvanceCredits: async () => unavailable(),
  getStudentLedger: async () => unavailable(),
  getStudentSelfReceipt: async () => unavailable(),
  getStudentSelfReceipts: async () => unavailable(),
  postPayment: async () => unavailable(),
  previewAdvanceApplication: async () => unavailable(),
  previewPaymentAllocation: async () => unavailable(),
  reversePayment: async () => unavailable(),
};
