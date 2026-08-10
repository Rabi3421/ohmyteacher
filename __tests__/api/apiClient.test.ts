import { ApiClient } from '../../src/services/api/apiClient';
import { ApiClientError } from '../../src/services/api/apiError';
import type {
  ApiTokenStore,
  RefreshedTokenPair,
} from '../../src/services/api/apiTypes';

function response(status: number, body?: unknown): Response {
  return {
    blob: jest.fn(async () => new Blob()),
    headers: new Headers({ 'content-type': 'application/json' }),
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn(async () =>
      body === undefined ? '' : JSON.stringify(body),
    ),
  } as unknown as Response;
}

function createTokenStore(
  initialAccess: string | null = 'old-access',
  initialRefresh: string | null = 'refresh-token',
): ApiTokenStore & { saved: RefreshedTokenPair[]; clearTokens: jest.Mock } {
  let access = initialAccess;
  let refresh = initialRefresh;
  const saved: RefreshedTokenPair[] = [];
  return {
    clearTokens: jest.fn(async () => {
      access = null;
      refresh = null;
    }),
    getAccessToken: jest.fn(async () => access),
    getRefreshToken: jest.fn(async () => refresh),
    saveTokens: jest.fn(async tokens => {
      saved.push(tokens);
      access = tokens.accessToken;
      refresh = tokens.refreshToken;
    }),
    saved,
  };
}

function client(
  tokenStore = createTokenStore(),
  onSessionExpired = jest.fn(),
  fetchImpl: typeof fetch = jest.fn(async () => response(200)),
): ApiClient {
  return new ApiClient({
    baseUrl: 'http://example.invalid/api/',
    fetchImpl,
    onSessionExpired,
    timeoutMs: 1_000,
    tokenStore,
  });
}

describe('ApiClient', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('serializes query values and attaches the Bearer token', async () => {
    const fetchMock = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        response(200, { ok: true }),
    );

    await client(
      createTokenStore(),
      jest.fn(),
      fetchMock as typeof fetch,
    ).get('/students/', {
      query: { active: true, branch: 2, status: ['active', 'inactive'] },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://example.invalid/api/students/?active=true&branch=2&status=active&status=inactive',
    );
    expect((init?.headers as Headers).get('Authorization')).toBe(
      'Bearer old-access',
    );
  });

  it('omits credentials for unauthenticated requests', async () => {
    const fetchMock = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        response(200, { success: true }),
    );

    await client(
      createTokenStore(),
      jest.fn(),
      fetchMock as typeof fetch,
    ).post('/auth/send-otp/', { phone_number: 'redacted' }, { auth: 'none' });

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.has('Authorization')).toBe(false);
  });

  it('refreshes once, saves rotated tokens, and retries the request', async () => {
    const tokenStore = createTokenStore();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response(401, { detail: 'expired' }))
      .mockResolvedValueOnce(
        response(200, { access: 'new-access', refresh: 'new-refresh' }),
      )
      .mockResolvedValueOnce(response(200, { success: true }));

    await expect(
      client(tokenStore, jest.fn(), fetchMock as typeof fetch).get('/school/'),
    ).resolves.toEqual({
      success: true,
    });
    expect(tokenStore.saved).toEqual([
      { accessToken: 'new-access', refreshToken: 'new-refresh' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('coordinates simultaneous 401 responses through one refresh', async () => {
    const tokenStore = createTokenStore();
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>(resolve => {
      releaseRefresh = resolve;
    });
    let refreshCalls = 0;
    const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith('/auth/refresh/')) {
        refreshCalls += 1;
        await refreshGate;
        return response(200, { access: 'new-access', refresh: 'new-refresh' });
      }
      const authorization = (init?.headers as Headers).get('Authorization');
      return authorization === 'Bearer new-access'
        ? response(200, { success: true })
        : response(401, { detail: 'expired' });
    });

    const first = client(tokenStore, jest.fn(), fetchMock as typeof fetch);
    const requests = [first.get('/school/'), first.get('/branches/')];
    await Promise.resolve();
    await Promise.resolve();
    releaseRefresh?.();

    await expect(Promise.all(requests)).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(refreshCalls).toBe(1);
  });

  it('clears the session and emits expiry when refresh fails', async () => {
    const tokenStore = createTokenStore();
    const onSessionExpired = jest.fn();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response(401, { detail: 'expired' }))
      .mockResolvedValueOnce(
        response(401, { error_code: 'INVALID_REFRESH_TOKEN' }),
      );

    await expect(
      client(
        tokenStore,
        onSessionExpired,
        fetchMock as typeof fetch,
      ).get('/school/'),
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      kind: 'authentication',
    });
    expect(tokenStore.clearTokens).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not enter a refresh loop when the retried request returns 401', async () => {
    const tokenStore = createTokenStore();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response(401, { detail: 'expired' }))
      .mockResolvedValueOnce(
        response(200, { access: 'new-access', refresh: 'new-refresh' }),
      )
      .mockResolvedValueOnce(response(401, { detail: 'still unauthorized' }));

    await expect(
      client(tokenStore, jest.fn(), fetchMock as typeof fetch).get('/school/'),
    ).rejects.toMatchObject({
      kind: 'authentication',
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('maps network failures and timeouts', async () => {
    const networkFetch = jest.fn(async () => {
      throw new Error('offline');
    });
    await expect(
      client(
        createTokenStore(),
        jest.fn(),
        networkFetch as typeof fetch,
      ).get('/school/'),
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      kind: 'network',
    });

    jest.useFakeTimers();
    const timeoutFetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    const request = client(
      createTokenStore(),
      jest.fn(),
      timeoutFetch as typeof fetch,
    ).get('/school/', { timeoutMs: 10 });
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(11);
    await expect(request).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      kind: 'timeout',
    });
  });

  it('normalizes backend permission, not-found, and server errors', async () => {
    const cases = [
      [403, 'permission'],
      [404, 'not-found'],
      [500, 'server'],
    ] as const;

    for (const [status, kind] of cases) {
      const fetchMock = jest.fn(async () =>
        response(status, { message: 'Failure' }),
      );
      try {
        await client(
          createTokenStore(),
          jest.fn(),
          fetchMock as typeof fetch,
        ).get('/resource/');
        throw new Error('Expected request to fail.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError);
        expect(error).toMatchObject({ kind, status });
      }
    }
  });
});
