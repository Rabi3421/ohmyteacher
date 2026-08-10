import { LiveAcademicService } from '../../src/services/academic/apiAcademicService';

const context = { academicSessionId: '41', branchId: '21', schoolId: '11' };
const schoolClass = { branch: 21, created_at: '2026-08-01T10:00:00Z', display_order: 1, id: 51, is_active: true, name: 'Class 1', session: 41 };
const section = { capacity: 40, created_at: '2026-08-01T10:00:00Z', id: 61, is_active: true, name: 'A', school_class: 51 };
const subject = { code: 'MAT', created_at: '2026-08-01T10:00:00Z', id: 71, is_active: true, name: 'Mathematics', school: 11 };
const assignment = { created_at: '2026-08-01T10:00:00Z', id: 81, school_class: 51, subject: 71, teacher: 31 };

function setup() {
  const client = { delete: jest.fn(), get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  const staffUsers = { listStaff: jest.fn().mockResolvedValue({ data: { items: [31, 32].map(id => ({ branch: { id: '21' }, id: String(id), joinedAt: '2026-08-01T10:00:00Z', mobile: `90000000${id}`, name: `Teacher ${id}`, role: 'TEACHER', schoolId: '11', status: 'ACTIVE' })), pagination: null, totalItems: 2 }, message: 'ok', success: true }) };
  return { client, service: new LiveAcademicService(client, staffUsers) };
}

function listReads(client: ReturnType<typeof setup>['client']) {
  client.get.mockImplementation((path: string) => {
    if (path === '/classes/') return Promise.resolve({ classes: [schoolClass, { ...schoolClass, id: 52, session: 42 }], success: true });
    if (path === '/sections/') return Promise.resolve({ sections: [section], success: true });
    if (path === '/subjects/') return Promise.resolve({ subjects: [subject], success: true });
    if (path === '/class-subject-teacher/') return Promise.resolve({ assignments: [assignment], success: true });
    return Promise.resolve({ class: schoolClass, success: true });
  });
}

describe('LiveAcademicService', () => {
  it('filters the unpaginated class endpoint by live branch and session', async () => {
    const { client, service } = setup();
    listReads(client);
    const response = await service.getClasses(context);
    expect(client.get).toHaveBeenCalledWith('/classes/', { query: { branch: 21 } });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items[0]).toMatchObject({ activeSectionCount: 1, assignedSubjectCount: 1, id: '51' });
  });

  it('creates a class with only confirmed ownership and writable fields', async () => {
    const { client, service } = setup();
    client.post.mockResolvedValue({ class: schoolClass, success: true });
    await service.createClass(context, { code: 'IGNORED', displayOrder: 1, name: ' Class 1 ', status: 'INACTIVE' });
    expect(client.post).toHaveBeenCalledWith('/classes/', { branch: 21, display_order: 1, name: 'Class 1', session: 41 });
  });

  it('uses confirmed section filters and status endpoint', async () => {
    const { client, service } = setup();
    client.get.mockImplementation((path: string) => path.startsWith('/classes/') ? Promise.resolve({ class: schoolClass, success: true }) : path === '/sections/' ? Promise.resolve({ sections: [section], success: true }) : path.startsWith('/sections/') ? Promise.resolve({ section, success: true }) : Promise.resolve({ assignments: [assignment], success: true }));
    client.patch.mockResolvedValue({ section: { ...section, is_active: false }, success: true });
    const response = await service.getSections(context, '51');
    expect(response.data.items[0].capacity).toBe(40);
    await service.updateSectionStatus(context, '51', '61', 'INACTIVE');
    expect(client.patch).toHaveBeenCalledWith('/sections/61/status/', { is_active: false });
  });

  it('maps the school-wide subject catalog and client-side search', async () => {
    const { client, service } = setup();
    listReads(client);
    const response = await service.getSubjects('11', { search: 'math' });
    expect(response.data.items[0]).toMatchObject({ activeAssignmentCount: 1, code: 'MAT', id: '71' });
  });

  it('reconciles teacher assignment replacement through delete then create', async () => {
    const { client, service } = setup();
    client.get.mockImplementation((path: string) => {
      if (path.startsWith('/classes/')) return Promise.resolve({ class: schoolClass, success: true });
      if (path === '/sections/') return Promise.resolve({ sections: [section], success: true });
      if (path === '/subjects/') return Promise.resolve({ subjects: [subject], success: true });
      return Promise.resolve({ assignments: [assignment], success: true });
    });
    client.delete.mockResolvedValue({ message: 'Teacher unassigned.', success: true });
    client.post.mockResolvedValue({ assignment: { ...assignment, id: 82, teacher: 32 }, success: true });
    await service.updateClassSubjectAssignments(context, '51', { assignments: [{ subjectId: '71', teacherId: '32' }] });
    expect(client.delete).toHaveBeenCalledWith('/class-subject-teacher/81/');
    expect(client.post).toHaveBeenCalledWith('/class-subject-teacher/', { school_class: 51, subject: 71, teacher: 32 });
  });

  it('rejects mock IDs before any live mutation', async () => {
    const { client, service } = setup();
    await expect(service.createClass({ ...context, branchId: 'branch-mock' }, { code: '', displayOrder: 1, name: 'Class 1', status: 'ACTIVE' })).rejects.toMatchObject({ code: 'INVALID_ACADEMIC_INPUT' });
    expect(client.post).not.toHaveBeenCalled();
  });

  it('rejects cross-context class detail', async () => {
    const { client, service } = setup();
    client.get.mockImplementation((path: string) => path.startsWith('/classes/') ? Promise.resolve({ class: { ...schoolClass, branch: 22 }, success: true }) : path === '/sections/' ? Promise.resolve({ sections: [], success: true }) : Promise.resolve({ assignments: [], success: true }));
    await expect(service.getClass(context, '51')).rejects.toMatchObject({ code: 'ACADEMIC_CONTEXT_MISMATCH' });
  });
});
