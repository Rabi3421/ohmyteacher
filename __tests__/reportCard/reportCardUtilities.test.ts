import {
  INITIAL_REPORT_CARD_TEMPLATES,
  INITIAL_PUBLISHED_RESULT_SNAPSHOTS,
  INITIAL_REPORT_CARDS,
} from '../../src/services/reportCard/reportCardFixtures';
import {
  buildReportCardSnapshot,
  snapshotReportCardTemplate,
} from '../../src/utils/reportCardSnapshot';
import {
  deriveReportCardVersion,
  formatReportCardNumber,
  reportCardDocumentFilename,
  reportCardGenerationIdentity,
} from '../../src/utils/reportCardGeneration';
import {
  latestVisibleReportCards,
  reportCardVisibility,
} from '../../src/utils/reportCardVisibility';
import {
  normalizeReportCardTemplateCode,
  validateReportCardTemplate,
} from '../../src/utils/reportCardTemplateValidation';
import {
  redactPublishedResult,
  redactReportCardForSelfService,
} from '../../src/utils/reportCardRedaction';

describe('Report Card pure utilities', () => {
  it('validates required and unique Template fields and normalizes code', () => {
    const source = INITIAL_REPORT_CARD_TEMPLATES[0];
    const input = { ...source, code: ' standard ', name: '', title: '' };
    const result = validateReportCardTemplate(
      input,
      INITIAL_REPORT_CARD_TEMPLATES,
    );
    expect(result.fieldErrors).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      title: expect.any(String),
    });
    expect(normalizeReportCardTemplateCode(' Annual report 2026 ')).toBe(
      'ANNUAL_REPORT_2026',
    );
  });

  it('snapshots Template configuration without mutable entity metadata', () => {
    const snapshot = snapshotReportCardTemplate(
      INITIAL_REPORT_CARD_TEMPLATES[0],
    );
    expect(snapshot.templateId).toBe('report-template-standard');
    expect(snapshot.principalSignatureLabel).toBe('Principal');
    expect(snapshot.showRank).toBe(true);
    expect(snapshot).not.toHaveProperty('schoolId');
    expect(snapshot).not.toHaveProperty('activeUsageCount');
  });

  it('builds deeply independent Result snapshots', () => {
    const result = JSON.parse(
      JSON.stringify(INITIAL_PUBLISHED_RESULT_SNAPSHOTS[0]),
    ) as (typeof INITIAL_PUBLISHED_RESULT_SNAPSHOTS)[number];
    const template = JSON.parse(
      JSON.stringify(INITIAL_REPORT_CARD_TEMPLATES[0]),
    ) as (typeof INITIAL_REPORT_CARD_TEMPLATES)[number];
    const card = buildReportCardSnapshot({
      branchSnapshot: { address: 'Address', code: 'MAIN', name: 'Main Branch' },
      generatedAt: '2026-08-26T00:00:00.000Z',
      generatedByName: 'Admin',
      generatedByUserId: 'actor',
      generationRunId: 'run',
      gradingSchemeSnapshot: { bands: [], code: 'DEFAULT', name: 'Default' },
      id: 'snapshot-test',
      publishedResult: result,
      reportCardNumber: 'RC/MAIN/2026-27/UNIT/999999',
      schoolSnapshot: { address: 'Address', code: 'OMT001', name: 'School' },
      template,
      version: 3,
    });
    result.overallResult.percentage = 1;
    template.title = 'Changed';
    expect(card.overallResult.percentage).not.toBe(1);
    expect(card.templateSnapshot.title).toBe('Report Card');
    expect(card.versionReference.reportCardVersion).toBe(3);
  });

  it('derives versions, deterministic identities, numbers and filenames', () => {
    expect(deriveReportCardVersion(INITIAL_REPORT_CARDS, 'student-rahul')).toBe(
      3,
    );
    expect(
      reportCardGenerationIdentity('batch', 'student', 'template', 2),
    ).toBe('batch::student::template::2');
    expect(
      formatReportCardNumber({
        branchCode: 'main',
        examCode: 'annual',
        sequence: 1,
        sessionLabel: '2026-27',
      }),
    ).toBe('RC/MAIN/2026-27/ANNUAL/000001');
    expect(reportCardDocumentFilename('RC/MAIN/1', 'Rahul Patel')).toBe(
      'rc-main-1-rahul-patel.pdf',
    );
  });

  it('shows only latest active available versions and redacts internal IDs', () => {
    const active = INITIAL_PUBLISHED_RESULT_SNAPSHOTS.find(
      item => item.studentId === 'student-rahul' && item.status === 'PUBLISHED',
    )!;
    const available = INITIAL_REPORT_CARDS.find(
      item => item.id === 'report-card-rahul-v2',
    )!;
    expect(reportCardVisibility(available, active)).toEqual({ visible: true });
    expect(
      latestVisibleReportCards(
        INITIAL_REPORT_CARDS,
        INITIAL_PUBLISHED_RESULT_SNAPSHOTS,
      ).map(item => item.id),
    ).toEqual(
      expect.arrayContaining(['report-card-rahul-v2', 'report-card-arjun-v1']),
    );
    const safeCard = redactReportCardForSelfService(available);
    expect(safeCard).not.toHaveProperty('generatedByUserId');
    expect(safeCard).not.toHaveProperty('calculationRunId');
    const safeResult = redactPublishedResult(active, available, '2026-27');
    expect(safeResult.summary.academicSessionName).toBe('2026-27');
    expect(safeResult.overallResult).not.toHaveProperty('reviewedAt');
  });
});
