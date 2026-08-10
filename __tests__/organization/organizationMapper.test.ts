import { ApiClientError } from '../../src/services/api/apiError';
import {
  mapCreateOrganizationBranchRequest,
  mapCurrentSchoolUpdateRequest,
  mapOrganizationBranchStatus,
  mapOrganizationBranchStatusRequest,
  mapOrganizationFieldErrors,
  mapUpdateOrganizationBranchRequest,
  parseOrganizationBranch,
  parseOrganizationBranchList,
} from '../../src/services/organization/organizationMapper';

const branch = {
  address: '1 School Road',
  code: 'SCH11-MAIN',
  created_at: '2026-08-01T10:00:00Z',
  email: 'branch@example.com',
  id: 21,
  is_active: true,
  name: 'Main Branch',
  phone: '9876543210',
  school: 11,
};

describe('current organization mappers', () => {
  it('maps the current unpaginated branch envelope', () => {
    expect(parseOrganizationBranchList({ branches: [branch], success: true })).toEqual({
      items: [
        {
          address: '1 School Road',
          code: 'SCH11-MAIN',
          createdAt: '2026-08-01T10:00:00Z',
          email: 'branch@example.com',
          id: '21',
          name: 'Main Branch',
          phone: '9876543210',
          schoolId: '11',
          status: 'ACTIVE',
        },
      ],
      pagination: null,
      totalItems: 1,
    });
  });

  it('accepts only a future standard paginated envelope at the mapper boundary', () => {
    expect(
      parseOrganizationBranchList({
        count: 40,
        next: 'https://example.invalid/branches/?page=2',
        previous: null,
        results: [branch],
        success: true,
      }),
    ).toMatchObject({
      pagination: {
        count: 40,
        next: 'https://example.invalid/branches/?page=2',
        previous: null,
      },
      totalItems: 40,
    });
  });

  it('maps branch detail without mock-only fields', () => {
    expect(parseOrganizationBranch({ branch, success: true })).toMatchObject({
      id: '21',
      schoolId: '11',
      status: 'ACTIVE',
    });
  });

  it.each([
    { id: '21' },
    { school: null },
    { is_active: 'true' },
    { code: null },
  ])('rejects malformed branch data', override => {
    expect(() =>
      parseOrganizationBranch({ branch: { ...branch, ...override }, success: true }),
    ).toThrow(ApiClientError);
  });

  it('never treats an unknown status as active', () => {
    expect(() => mapOrganizationBranchStatus('ACTIVE')).toThrow(ApiClientError);
  });

  it('maps supported school fields and omits read-only values', () => {
    expect(
      mapCurrentSchoolUpdateRequest({
        address: ' New address ',
        email: ' school@example.com ',
        upiId: 'school@bank ',
      }),
    ).toEqual({
      address: 'New address',
      email: 'school@example.com',
      upi_id: 'school@bank',
    });
  });

  it('maps exact branch create and changed-field update bodies', () => {
    expect(
      mapCreateOrganizationBranchRequest({
        address: ' Address ',
        email: '',
        name: ' Branch ',
        phone: '',
      }),
    ).toEqual({ address: 'Address', email: '', name: 'Branch', phone: '' });
    expect(mapUpdateOrganizationBranchRequest({ email: ' next@example.com ' })).toEqual({
      email: 'next@example.com',
    });
  });

  it.each([
    ['ACTIVE', true],
    ['INACTIVE', false],
  ] as const)('maps %s as a real JSON boolean', (status, isActive) => {
    expect(mapOrganizationBranchStatusRequest(status)).toEqual({
      is_active: isActive,
    });
  });

  it('maps backend field errors to frontend names', () => {
    expect(
      mapOrganizationFieldErrors({ name: 'Required', upi_id: 'Invalid' }),
    ).toEqual({ name: 'Required', upiId: 'Invalid' });
  });
});
