import { Share } from 'react-native';
import type {
  ManualShareService,
  ManualShareTextInput,
} from './manualShareService';

async function share(input: ManualShareTextInput & { documentUri?: string }) {
  try {
    const result = await Share.share({
      message: input.documentUri
        ? `${input.message}\n${input.documentUri}`
        : input.message,
      title: input.title,
    });
    return result.action === Share.dismissedAction
      ? ({ status: 'CANCELLED' } as const)
      : ({
          activityType: result.activityType ?? undefined,
          status: 'HANDED_OFF',
        } as const);
  } catch (error) {
    return {
      failureReason:
        error instanceof Error
          ? error.message
          : 'Device sharing is unavailable.',
      status: 'FAILED' as const,
    };
  }
}
export const nativeManualShareService: ManualShareService = {
  shareReceipt: share,
  shareText: share,
};
