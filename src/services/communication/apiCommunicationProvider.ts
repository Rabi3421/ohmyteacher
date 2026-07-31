import { ApiClientError } from '../api/apiError';
import type { CommunicationProvider } from './communicationProvider';

export const apiCommunicationProvider: CommunicationProvider = {
  async getProviderStatus() {
    return { label: 'Provider status unavailable', status: 'UNAVAILABLE' };
  },
  async sendMessage() {
    throw new ApiClientError({
      code: 'COMMUNICATION_PROVIDER_UNAVAILABLE',
      message: 'The backend WhatsApp provider is not configured.',
      status: 503,
    });
  },
};
