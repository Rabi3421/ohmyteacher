import { LiveAcademicSessionService } from '../../src/services/academic/liveAcademicSessionService';

const session = {
  created_at: '2026-08-01T10:00:00Z',
  end_date: '2027-03-31',
  id: 41,
  is_active: false,
  name: '2026-27',
  school: 11,
  start_date: '2026-04-01',
};

function setup() {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  return { client, service: new LiveAcademicSessionService(client) };
}

describe('LiveAcademicSessionService', () => {
  it('loads the authenticated school session envelope', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ sessions: [session], success: true });
    const response = await service.getAcademicSessions('11');
    expect(client.get).toHaveBeenCalledWith('/sessions/');
    expect(response.data[0]).toMatchObject({ id: '41', schoolId: '11', status: 'UPCOMING' });
  });

  it('creates only writable fields and optionally activates explicitly', async () => {
    const { client, service } = setup();
    client.post.mockResolvedValue({ session, success: true });
    client.patch.mockResolvedValue({ session: { ...session, is_active: true }, success: true });
    await service.createAcademicSession('11', { endDate: '2027-03-31', name: ' 2026-27 ', startDate: '2026-04-01', status: 'ACTIVE' });
    expect(client.post).toHaveBeenCalledWith('/sessions/', { end_date: '2027-03-31', name: '2026-27', start_date: '2026-04-01' });
    expect(client.patch).toHaveBeenCalledWith('/sessions/41/activate/', {});
  });

  it('patches the confirmed detail and activates with a follow-up list refresh', async () => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({ session: { ...session, is_active: true }, success: true });
    client.get.mockResolvedValue({ sessions: [{ ...session, is_active: true }], success: true });
    await service.updateAcademicSession('11', '41', { endDate: '2027-03-30', name: '2026-27 revised', startDate: '2026-04-01' });
    expect(client.patch).toHaveBeenNthCalledWith(1, '/sessions/41/', { end_date: '2027-03-30', name: '2026-27 revised', start_date: '2026-04-01' });
    const activated = await service.activateAcademicSession('11', '41');
    expect(activated.data[0].status).toBe('ACTIVE');
  });

  it('rejects cross-school and malformed identities without fallback', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ sessions: [session], success: true });
    await expect(service.getAcademicSessions('12')).rejects.toMatchObject({ code: 'ACADEMIC_SCHOOL_MISMATCH' });
    client.get.mockResolvedValue({ sessions: [{ ...session, id: 'mock-id' }], success: true });
    await expect(service.getAcademicSessions('11')).rejects.toMatchObject({ code: 'MALFORMED_ACADEMIC_RESPONSE' });
  });

  it('keeps close explicitly unsupported because Django has no close endpoint', async () => {
    const { service } = setup();
    await expect(service.closeAcademicSession()).rejects.toMatchObject({ code: 'BACKEND_OPERATION_UNSUPPORTED' });
  });
});
