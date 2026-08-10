import {
  API_PREFIX,
  createApiConfiguration,
  normalizeBaseUrl,
} from '../../src/config/apiConfig';

describe('API configuration', () => {
  it('selects the Android emulator URL', () => {
    expect(
      createApiConfiguration({
        environment: 'development',
        platform: 'android',
      }).baseUrl,
    ).toBe(`http://10.0.2.2:8000${API_PREFIX}`);
  });

  it('selects the iOS simulator URL', () => {
    expect(
      createApiConfiguration({
        environment: 'development',
        platform: 'ios',
      }).baseUrl,
    ).toBe(`http://127.0.0.1:8000${API_PREFIX}`);
  });

  it('supports explicit physical-device, remote, and test URLs', () => {
    expect(
      createApiConfiguration({
        environment: 'development',
        physicalDeviceBaseUrl: `http://192.168.1.20:8000${API_PREFIX}/`,
        platform: 'android',
        target: 'physical-device',
      }).baseUrl,
    ).toBe(`http://192.168.1.20:8000${API_PREFIX}`);
    expect(
      createApiConfiguration({
        environment: 'staging',
        platform: 'ios',
        remoteBaseUrl: `https://example.invalid${API_PREFIX}`,
        target: 'remote',
      }).target,
    ).toBe('remote');
    expect(
      createApiConfiguration({ environment: 'test', platform: 'android' })
        .target,
    ).toBe('test');
  });

  it('normalizes trailing slashes and rejects invalid configuration', () => {
    expect(normalizeBaseUrl(' https://example.invalid/api/// ')).toBe(
      'https://example.invalid/api',
    );
    expect(() => normalizeBaseUrl('example.invalid/api')).toThrow();
    expect(() =>
      createApiConfiguration({
        environment: 'production',
        platform: 'android',
        target: 'physical-device',
      }),
    ).toThrow('API URL is required');
  });
});
