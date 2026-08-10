import { LiveCurrentStudentService } from '../../src/services/student/liveCurrentStudentService';

const dto = {
  address: '', admission_date: '2026-04-01', admission_number: 'ADM-2026-0001', branch: 11,
  created_at: '2026-04-01T00:00:00Z', date_of_birth: null, gender: '', id: 31, name: 'Test Student',
  parent_email: '', parent_name: 'Test Parent', parent_phone_number: '9000000001', roll_number: '', school_class: 21, section: 41, status: 'active',
};

describe('live current student service', () => {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  const service = new LiveCurrentStudentService(client as never);

  beforeEach(() => jest.clearAllMocks());

  it('uses only confirmed list query keys', async () => {
    client.get.mockResolvedValue({ success: true, students: [dto] });
    await service.getStudents({ classId: '21', search: 'Test', status: 'active' });
    expect(client.get).toHaveBeenCalledWith('/students/', { query: { q: 'Test', school_class: 21, status: 'active' } });
  });

  it('loads a branch-scoped student detail', async () => {
    client.get.mockResolvedValue({ success: true, student: dto });
    await service.getStudent('31');
    expect(client.get).toHaveBeenCalledWith('/students/31/');
  });

  it('posts aggregate admission once', async () => {
    client.post.mockResolvedValue({ success: true, student: dto });
    await service.createAdmission({ classId: '21', name: 'Test Student', parentPhoneNumber: '9000000001', sectionId: '41' });
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith('/students/', expect.objectContaining({ parent_phone_number: '9000000001', school_class: 21, section: 41 }));
  });

  it('coalesces concurrent aggregate admission submissions', async () => {
    client.post.mockResolvedValue({ success: true, student: dto });
    const input = { classId: '21', name: 'Test Student', parentPhoneNumber: '9000000001', sectionId: '41' };
    await Promise.all([service.createAdmission(input), service.createAdmission(input)]);
    expect(client.post).toHaveBeenCalledTimes(1);
  });

  it('patches editable fields without parent login phone', async () => {
    client.patch.mockResolvedValue({ success: true, student: dto });
    await service.updateStudent('31', { name: 'Changed' });
    expect(client.patch).toHaveBeenCalledWith('/students/31/', { name: 'Changed' });
  });

  it.each(['active', 'inactive', 'transferred', 'dropped', 'passed_out'] as const)('sends exact lifecycle status %s', async status => {
    client.patch.mockResolvedValue({ success: true, student: { ...dto, status } });
    await service.updateStatus('31', status);
    expect(client.patch).toHaveBeenCalledWith('/students/31/status/', { status });
  });

  it('loads children from the only confirmed self-service URL', async () => {
    client.get.mockResolvedValue({ success: true, students: [dto] });
    await service.getMyChildren();
    expect(client.get).toHaveBeenCalledWith('/my-children/');
  });
});
