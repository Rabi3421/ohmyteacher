import { ApiClientError } from '../../src/services/api/apiError';
import {
  mockCommunicationService,
  resetMockCommunicationData,
} from '../../src/services/communication/mockCommunicationService';
import { setNextMockCommunicationProviderStatus } from '../../src/services/communication/mockCommunicationProvider';
import { publishedResultRepository } from '../../src/services/marksResult/publishedResultRepository';
import {
  resetMockReportCardRepository,
  reportCardRepository,
} from '../../src/services/reportCard/reportCardRepository';

const school = 'school-omt';
const resultId =
  'published-result-publication-batch-phase13-active-student-rahul';
const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as ApiClientError).code;
  }
};

describe('Report Card communication extension', () => {
  beforeEach(() => {
    resetMockReportCardRepository();
    resetMockCommunicationData();
  });

  it('renders Result variables and snapshots a manual Report Card handoff', async () => {
    const resultPreview = (
      await mockCommunicationService.previewResultCommunication(school, {
        communicationType: 'RESULT_PUBLISHED',
        mode: 'MANUAL_SHARE',
        publishedResultSnapshotId: resultId,
      })
    ).data;
    expect(resultPreview.renderedContent).toContain('Term 1 Unit Test');
    expect(resultPreview.variables.percentage).toBe('84.00%');
    const shared = (
      await mockCommunicationService.shareReportCard(
        school,
        'report-card-rahul-v2',
        {
          initiatedByName: 'Admin',
          initiatedByUserId: 'admin',
          mode: 'MANUAL_SHARE',
        },
      )
    ).data;
    expect(shared.status).toBe('HANDED_OFF');
    expect(shared.reportCardId).toBe('report-card-rahul-v2');
    expect(shared.templateSnapshot.variablesUsed.reportCardNumber).toBe(
      'RC/MAIN/2026-27/UNIT/000002',
    );
  });

  it('records development provider failure, retries, and filters examination history', async () => {
    setNextMockCommunicationProviderStatus('FAILED');
    const preview = (
      await mockCommunicationService.previewResultCommunication(school, {
        communicationType: 'RESULT_PUBLISHED',
        mode: 'PROVIDER_SEND',
        publishedResultSnapshotId: resultId,
      })
    ).data;
    const failed = (
      await mockCommunicationService.sendResultCommunication(school, {
        initiatedByName: 'Admin',
        initiatedByUserId: 'admin',
        previewId: preview.previewId,
      })
    ).data;
    expect(failed.status).toBe('FAILED');
    const retry = (
      await mockCommunicationService.retryCommunication(school, failed.id)
    ).data;
    expect(retry.status).toBe('SENT');
    const history = (
      await mockCommunicationService.getExaminationCommunicationHistory(
        school,
        { publishedResultSnapshotId: resultId },
      )
    ).data;
    expect(history.items).toHaveLength(2);
  });

  it('blocks sharing when a card is revoked or its Result is unpublished', async () => {
    expect(
      await code(
        mockCommunicationService.shareReportCard(
          school,
          'report-card-rahul-v1',
          {
            initiatedByName: 'Admin',
            initiatedByUserId: 'admin',
            mode: 'MANUAL_SHARE',
          },
        ),
      ),
    ).toBe('PUBLISHED_RESULT_INACTIVE');
    publishedResultRepository.updatePublicationStatus(
      'publication-batch-phase13-active',
      'UNPUBLISHED',
    );
    expect(
      await code(
        mockCommunicationService.shareReportCard(
          school,
          'report-card-rahul-v2',
          {
            initiatedByName: 'Admin',
            initiatedByUserId: 'admin',
            mode: 'MANUAL_SHARE',
          },
        ),
      ),
    ).toBe('PUBLISHED_RESULT_INACTIVE');
    expect(
      reportCardRepository
        .cards()
        .find(item => item.id === 'report-card-rahul-v2'),
    ).toBeDefined();
  });
});
