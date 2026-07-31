import type { ReceiptDocumentService } from './receiptDocumentService';
export const mockReceiptDocumentService: ReceiptDocumentService = {
  async getDocument(_schoolId, receiptId) {
    return {
      data: {
        developmentUri: `development://receipts/${receiptId}/preview`,
        message:
          'Development preview metadata only; authoritative PDF is backend-generated.',
        receiptId,
        status: 'PREVIEW_READY',
      },
      message: 'Receipt preview metadata ready.',
      success: true,
    };
  },
};
