import type { MessageTemplate } from '../../src/models/communication';
import { INITIAL_MESSAGE_TEMPLATES } from '../../src/services/communication/communicationFixtures';
import {
  extractTemplateVariables,
  formatTemplateCurrency,
  formatTemplateDate,
  renderTemplate,
  snapshotTemplate,
} from '../../src/utils/templateRenderer';

describe('Communication Template renderer', () => {
  const template = INITIAL_MESSAGE_TEMPLATES[2];
  const variables = {
    dueDate: '10 Aug 2026',
    feePeriod: 'August 2026',
    outstandingAmount: '₹800',
    parentName: 'Meera Patel',
    schoolName: 'OhMyTeacher Public School',
    studentName: 'Rahul Patel',
  };

  it('renders registered variables deterministically', () => {
    expect(renderTemplate(template, variables)).toBe(
      renderTemplate(template, variables),
    );
    expect(renderTemplate(template, variables)).toContain('Rahul Patel');
    expect(extractTemplateVariables(template.content)).toEqual(
      expect.arrayContaining(['studentName', 'outstandingAmount', 'dueDate']),
    );
  });

  it('rejects unknown variables and never evaluates expressions', () => {
    expect(() =>
      extractTemplateVariables('Hello {{constructor.constructor}}'),
    ).toThrow();
    expect(() => extractTemplateVariables('Hello {{unknownValue}}')).toThrow(
      'not registered',
    );
    expect(() => extractTemplateVariables('{{7*7}}')).toThrow();
  });

  it('rejects a missing required value while optional values resolve safely', () => {
    expect(() =>
      renderTemplate(template, { ...variables, dueDate: '' }),
    ).toThrow('Required template variable');
    const optional = {
      ...template,
      content: 'Hello {{studentName}} {{schoolPhone}}',
      requiredVariables: [
        'studentName',
      ] as MessageTemplate['requiredVariables'],
    };
    expect(renderTemplate(optional, { studentName: 'Rahul' })).toBe(
      'Hello Rahul ',
    );
  });

  it('formats integer paise and dates without floating-point calculations', () => {
    expect(formatTemplateCurrency(130_050)).toContain('1,300.50');
    expect(formatTemplateDate('2026-08-10')).toContain('10 Aug 2026');
  });

  it('creates an immutable-value Template snapshot payload', () => {
    const snapshot = snapshotTemplate(template, variables);
    expect(snapshot).toMatchObject({
      channel: 'WHATSAPP',
      code: template.code,
      content: template.content,
      language: 'ENGLISH',
    });
    expect(snapshot.variablesUsed.studentName).toBe('Rahul Patel');
  });
});
