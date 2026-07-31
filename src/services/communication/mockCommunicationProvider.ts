import type { CommunicationProvider } from './communicationProvider';

let sequence = 0;
let nextStatus: 'SENT' | 'DELIVERED' | 'FAILED' | undefined;
export function setNextMockCommunicationProviderStatus(
  status: 'SENT' | 'DELIVERED' | 'FAILED',
): void {
  nextStatus = status;
}
export const mockCommunicationProvider: CommunicationProvider = {
  async getProviderStatus() {
    return {
      label: 'Development mock · no real WhatsApp provider',
      status: 'DEVELOPMENT_MOCK',
    };
  },
  async sendMessage(input) {
    const status = input.simulate ?? nextStatus ?? 'SENT';
    nextStatus = undefined;
    if (status === 'FAILED')
      return {
        failureCode: 'DEVELOPMENT_MOCK_FAILURE',
        failureReason: 'Simulated provider failure. No message was sent.',
        providerStatus: 'DEVELOPMENT_MOCK_FAILED',
        status,
      };
    return {
      providerMessageId: `mock-provider-${++sequence}`,
      providerStatus: `DEVELOPMENT_MOCK_${status}`,
      status,
    };
  },
};
