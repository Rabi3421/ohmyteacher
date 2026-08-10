import {
  mapAdmissionRequest,
  mapCurrentStudentFieldErrors,
  mapStudentUpdateRequest,
  parseCurrentStudent,
  parseCurrentStudentList,
  parseMyChildren,
  studentRequestId,
} from '../../src/services/student/currentStudentMapper';

const dto = {
  address: 'Synthetic address',
  admission_date: '2026-04-01',
  admission_number: 'ADM-2026-0001',
  branch: 11,
  created_at: '2026-04-01T00:00:00Z',
  date_of_birth: '2016-02-03',
  gender: 'female',
  id: 31,
  name: 'Test Student',
  parent_email: 'parent@example.test',
  parent_name: 'Test Parent',
  parent_phone_number: '9000000001',
  roll_number: '7',
  school_class: 21,
  section: 41,
  status: 'active',
};

describe('current student mapper', () => {
  it('maps the exact student envelope and IDs', () => {
    expect(parseCurrentStudent({ success: true, student: dto })).toMatchObject({
      branchId: '11', classId: '21', id: '31', sectionId: '41', status: 'active',
    });
  });

  it('maps the student list envelope', () => {
    expect(parseCurrentStudentList({ success: true, students: [dto] })).toHaveLength(1);
  });

  it('uses the same confirmed shape for My Children', () => {
    expect(parseMyChildren({ success: true, students: [dto] })[0]?.parentPhoneNumber).toBe('9000000001');
  });

  it('preserves nullable date of birth and blank optional strings', () => {
    expect(parseCurrentStudent({ success: true, student: { ...dto, date_of_birth: null, gender: '', parent_email: '', roll_number: '' } })).toMatchObject({ dateOfBirth: null, gender: '', parentEmail: '', rollNumber: '' });
  });

  it('rejects unknown backend statuses', () => {
    expect(() => parseCurrentStudent({ success: true, student: { ...dto, status: 'withdrawn' } })).toThrow('unknown student status');
  });

  it('rejects malformed envelopes', () => {
    expect(() => parseCurrentStudentList({ students: [dto] })).toThrow('invalid student students response');
  });

  it('maps only confirmed admission fields', () => {
    expect(mapAdmissionRequest({ classId: '21', sectionId: '41', name: ' Test Student ', parentPhoneNumber: ' 9000000001 ', dateOfBirth: null })).toEqual({
      address: undefined,
      date_of_birth: null,
      gender: undefined,
      name: 'Test Student',
      parent_email: undefined,
      parent_name: undefined,
      parent_phone_number: '9000000001',
      roll_number: undefined,
      school_class: 21,
      section: 41,
    });
  });

  it('never maps parent phone into PATCH updates', () => {
    expect(mapStudentUpdateRequest({ name: 'Changed', sectionId: '42' })).toEqual({ name: 'Changed', section: 42 });
  });

  it('rejects non-backend IDs before a request', () => {
    expect(() => studentRequestId('student-demo', 'studentId')).toThrow('studentId is invalid');
  });

  it('maps Django field errors onto form field names', () => {
    expect(mapCurrentStudentFieldErrors({ parent_phone_number: 'Invalid.', school_class: 'Mismatch.' })).toEqual({ classId: 'Mismatch.', parentPhoneNumber: 'Invalid.' });
  });
});
