import { redactSensitiveData } from '../../src/services/api/apiLogger';

describe('safe API logging', () => {
  it('redacts sensitive keys, bearer values, and sensitive query values', () => {
    expect(
      redactSensitiveData({
        Authorization: 'Bearer access-value',
        nested: {
          otp: '123456',
          url: 'https://example.invalid?phone=9999999999&view=list',
        },
        ordinary: 'safe',
        refresh_token: 'refresh-value',
      }),
    ).toEqual({
      Authorization: '[REDACTED]',
      nested: {
        otp: '[REDACTED]',
        url: 'https://example.invalid?phone=[REDACTED]&view=list',
      },
      ordinary: 'safe',
      refresh_token: '[REDACTED]',
    });
  });

  it('redacts student and guardian PII fields from diagnostics', () => {
    expect(
      redactSensitiveData({
        admission_number: 'ADM-2026-0001',
        address: 'Synthetic address',
        date_of_birth: '2016-02-03',
        name: 'Test Student',
        parent_email: 'parent@example.test',
        parent_phone_number: '9000000001',
        roll_number: '7',
      }),
    ).toEqual({
      admission_number: '[REDACTED]',
      address: '[REDACTED]',
      date_of_birth: '[REDACTED]',
      name: '[REDACTED]',
      parent_email: '[REDACTED]',
      parent_phone_number: '[REDACTED]',
      roll_number: '[REDACTED]',
    });
  });
});
