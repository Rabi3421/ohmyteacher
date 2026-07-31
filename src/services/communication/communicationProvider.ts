import type {
  CommunicationStatus,
  CommunicationType,
} from '../../models/communication';

export interface ProviderSendInput {
  channel: 'WHATSAPP';
  communicationType: CommunicationType;
  idempotencyKey: string;
  recipientMobile: string;
  renderedContent: string;
  simulate?: 'SENT' | 'DELIVERED' | 'FAILED';
}
export interface ProviderSendResult {
  providerMessageId?: string;
  providerStatus: string;
  status: Extract<CommunicationStatus, 'SENT' | 'DELIVERED' | 'FAILED'>;
  failureCode?: string;
  failureReason?: string;
}
export interface ProviderStatusResult {
  status: 'DEVELOPMENT_MOCK' | 'AVAILABLE' | 'UNAVAILABLE';
  label: string;
}
export interface CommunicationProvider {
  sendMessage(input: ProviderSendInput): Promise<ProviderSendResult>;
  getProviderStatus(): Promise<ProviderStatusResult>;
}
