import type { AcademicContext } from '../../src/models/academic';
import {
  mockAcademicService,
  resetMockAcademicData,
} from '../../src/services/academic/mockAcademicService';

const context: AcademicContext = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
};
const closedContext: AcademicContext = {
  ...context,
  academicSessionId: 'session-school-omt-closed',
};

async function finish<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockAcademicData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mock academic service', () => {
  it('lists, searches, filters, sorts, and paginates classes', async () => {
    const page = await finish(
      mockAcademicService.getClasses(context, { page: 1, pageSize: 3 }),
    );
    expect(page.data.items).toHaveLength(3);
    expect(page.data.totalItems).toBe(13);
    expect(page.data.items.map(item => item.displayOrder)).toEqual([1, 2, 3]);

    const search = await finish(
      mockAcademicService.getClasses(context, { search: 'C10' }),
    );
    expect(search.data.items[0].name).toBe('Class 10');

    const inactive = await finish(
      mockAcademicService.getClasses(context, { status: 'INACTIVE' }),
    );
    expect(inactive.data.items).toHaveLength(1);
  });

  it('creates and updates a normalized context-scoped class', async () => {
    const created = await finish(
      mockAcademicService.createClass(context, {
        code: 'c11',
        displayOrder: 14,
        name: ' Class 11 ',
        status: 'ACTIVE',
      }),
    );
    expect(created.data).toMatchObject({
      ...context,
      code: 'C11',
      name: 'Class 11',
    });
    const updated = await finish(
      mockAcademicService.updateClass(context, created.data.id, {
        code: 'C11',
        displayOrder: 15,
        name: 'Senior Class 11',
        status: 'ACTIVE',
      }),
    );
    expect(updated.data.displayOrder).toBe(15);
  });

  it('rejects duplicate class names and codes in the same context', async () => {
    const duplicate = mockAcademicService.createClass(context, {
      code: 'OTHER',
      displayOrder: 14,
      name: 'class 1',
      status: 'ACTIVE',
    });
    await expect(finish(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_CLASS',
      status: 409,
    });
  });

  it('protects class reads from cross-school and cross-session IDs', async () => {
    const crossSchool = mockAcademicService.getClass(
      context,
      'class-greenfield-c01',
    );
    await expect(finish(crossSchool)).rejects.toMatchObject({
      code: 'CLASS_NOT_FOUND',
    });

    const crossSession = mockAcademicService.getClass(
      context,
      'class-omt-next-c01',
    );
    await expect(finish(crossSession)).rejects.toMatchObject({
      code: 'CLASS_NOT_FOUND',
    });
  });

  it('makes closed sessions strictly read-only', async () => {
    const list = await finish(mockAcademicService.getClasses(closedContext));
    expect(list.data.items).toHaveLength(1);
    const mutation = mockAcademicService.createClass(closedContext, {
      code: 'NEW',
      displayOrder: 20,
      name: 'New Class',
      status: 'ACTIVE',
    });
    await expect(finish(mutation)).rejects.toMatchObject({
      code: 'ACADEMIC_SESSION_CLOSED',
    });
  });

  it('blocks class deactivation while active dependencies exist', async () => {
    const mutation = mockAcademicService.updateClassStatus(
      context,
      'class-omt-c01',
      'INACTIVE',
    );
    await expect(finish(mutation)).rejects.toMatchObject({
      code: 'CLASS_HAS_ACTIVE_DEPENDENCIES',
    });
  });

  it('creates, updates, filters, and deactivates sections', async () => {
    const created = await finish(
      mockAcademicService.createSection(context, 'class-omt-c09', {
        capacity: 45,
        code: 'B',
        displayOrder: 2,
        name: 'Section B',
        status: 'ACTIVE',
      }),
    );
    expect(created.data.capacity).toBe(45);
    const updated = await finish(
      mockAcademicService.updateSection(
        context,
        'class-omt-c09',
        created.data.id,
        {
          capacity: 48,
          code: 'B',
          displayOrder: 2,
          name: 'Beta',
          status: 'ACTIVE',
        },
      ),
    );
    expect(updated.data.name).toBe('Beta');
    await finish(
      mockAcademicService.updateSectionStatus(
        context,
        'class-omt-c09',
        created.data.id,
        'INACTIVE',
      ),
    );
    const inactive = await finish(
      mockAcademicService.getSections(context, 'class-omt-c09', {
        status: 'INACTIVE',
      }),
    );
    expect(inactive.data.items.map(item => item.id)).toContain(created.data.id);
  });

  it('rejects duplicate sections and sections on inactive classes', async () => {
    const duplicate = mockAcademicService.createSection(
      context,
      'class-omt-c01',
      {
        code: 'A2',
        displayOrder: 3,
        name: 'section a',
        status: 'ACTIVE',
      },
    );
    await expect(finish(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_SECTION',
    });

    const inactive = mockAcademicService.createSection(
      context,
      'class-omt-c10',
      {
        code: 'A',
        displayOrder: 1,
        name: 'Section A',
        status: 'ACTIVE',
      },
    );
    await expect(finish(inactive)).rejects.toMatchObject({
      code: 'CLASS_INACTIVE',
    });
  });

  it('keeps the subject catalog school-scoped', async () => {
    const omt = await finish(mockAcademicService.getSubjects('school-omt'));
    const greenfield = await finish(
      mockAcademicService.getSubjects('school-greenfield'),
    );
    expect(omt.data.totalItems).toBe(8);
    expect(greenfield.data.items.map(item => item.id)).toEqual([
      'subject-greenfield-eng',
    ]);
  });

  it('creates, updates, and validates unique subjects', async () => {
    const created = await finish(
      mockAcademicService.createSubject('school-omt', {
        code: 'geo',
        displayOrder: 9,
        name: 'Geography',
        shortName: 'Geo',
        status: 'ACTIVE',
        type: 'ELECTIVE',
      }),
    );
    expect(created.data.code).toBe('GEO');
    const updated = await finish(
      mockAcademicService.updateSubject('school-omt', created.data.id, {
        code: 'GEO',
        displayOrder: 10,
        name: 'Advanced Geography',
        status: 'ACTIVE',
        type: 'OPTIONAL',
      }),
    );
    expect(updated.data.type).toBe('OPTIONAL');

    const duplicate = mockAcademicService.createSubject('school-omt', {
      code: 'eng',
      displayOrder: 11,
      name: 'Another English',
      status: 'ACTIVE',
      type: 'CORE',
    });
    await expect(finish(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_SUBJECT',
    });
  });

  it('protects subjects with active assignments from deactivation', async () => {
    const mutation = mockAcademicService.updateSubjectStatus(
      'school-omt',
      'subject-omt-eng',
      'INACTIVE',
    );
    await expect(finish(mutation)).rejects.toMatchObject({
      code: 'SUBJECT_HAS_ACTIVE_ASSIGNMENTS',
    });
  });

  it('soft-removes and reactivates class-subject assignments', async () => {
    const initial = await finish(
      mockAcademicService.getClassSubjectAssignments(
        context,
        'class-omt-c01',
      ),
    );
    expect(initial.data.filter(item => item.status === 'ACTIVE')).toHaveLength(
      5,
    );
    const retainedId = initial.data[0].id;
    const reduced = await finish(
      mockAcademicService.updateClassSubjectAssignments(
        context,
        'class-omt-c01',
        { subjectIds: ['subject-omt-eng'] },
      ),
    );
    expect(reduced.data.find(item => item.id === retainedId)?.status).toBe(
      'ACTIVE',
    );
    expect(reduced.data.filter(item => item.status === 'INACTIVE')).toHaveLength(
      4,
    );

    const restored = await finish(
      mockAcademicService.updateClassSubjectAssignments(
        context,
        'class-omt-c01',
        { subjectIds: ['subject-omt-eng', 'subject-omt-math'] },
      ),
    );
    expect(
      restored.data.find(item => item.subjectId === 'subject-omt-math')
        ?.status,
    ).toBe('ACTIVE');
  });

  it('rejects duplicate, inactive, and cross-school subject assignments', async () => {
    const duplicate = mockAcademicService.updateClassSubjectAssignments(
      context,
      'class-omt-c02',
      { subjectIds: ['subject-omt-eng', 'subject-omt-eng'] },
    );
    await expect(finish(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_SUBJECT_ASSIGNMENT',
    });

    const inactive = mockAcademicService.updateClassSubjectAssignments(
      context,
      'class-omt-c02',
      { subjectIds: ['subject-omt-mus'] },
    );
    await expect(finish(inactive)).rejects.toMatchObject({
      code: 'SUBJECT_INACTIVE',
    });

    const foreign = mockAcademicService.updateClassSubjectAssignments(
      context,
      'class-omt-c02',
      { subjectIds: ['subject-greenfield-eng'] },
    );
    await expect(finish(foreign)).rejects.toMatchObject({
      code: 'SUBJECT_NOT_FOUND',
    });
  });

  it('rejects invalid branch and academic-session context combinations', async () => {
    const invalidBranch = mockAcademicService.getClasses({
      ...context,
      branchId: 'branch-greenfield-puri',
    });
    await expect(finish(invalidBranch)).rejects.toMatchObject({
      code: 'ACADEMIC_CONTEXT_MISMATCH',
    });

    const invalidSession = mockAcademicService.getClasses({
      ...context,
      academicSessionId: 'session-school-greenfield-current',
    });
    await expect(finish(invalidSession)).rejects.toMatchObject({
      code: 'ACADEMIC_CONTEXT_MISMATCH',
    });
  });

  it('returns a context-specific setup summary', async () => {
    const summary = await finish(mockAcademicService.getSetupSummary(context));
    expect(summary.data).toMatchObject({
      activeClasses: 12,
      activeSubjects: 7,
      classesWithoutSections: 3,
      totalClasses: 13,
    });
    expect(summary.data.unassignedClasses).toBe(2);
  });
});
