import {
  createUnsupportedOperationError,
  normalizeApiError,
} from '../../src/services/api/apiError';

describe('API error normalization', () => {
  it('maps Django serializer validation fields and non-field errors', () => {
    const error = normalizeApiError(400, {
      error_code: 'VALIDATION_ERROR',
      errors: {
        name: ['Required.', 'Too short.'],
        non_field_errors: ['The combination already exists.'],
      },
      message: 'Invalid data',
      success: false,
    });

    expect(error.kind).toBe('validation');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fieldErrors).toEqual({ name: 'Required. Too short.' });
    expect(error.nonFieldErrors).toEqual([
      'The combination already exists.',
    ]);
  });

  it.each([
    [401, 'authentication'],
    [403, 'permission'],
    [404, 'not-found'],
    [409, 'conflict'],
    [500, 'server'],
  ] as const)('maps status %s to %s', (status, kind) => {
    expect(normalizeApiError(status, { detail: 'Failure' }).kind).toBe(kind);
  });

  it('represents unsupported backend operations as a typed error', () => {
    const error = createUnsupportedOperationError('reports', 'export');
    expect(error.kind).toBe('unsupported');
    expect(error.code).toBe('BACKEND_OPERATION_UNSUPPORTED');
  });

  it('never exposes raw HTML or traceback-like text responses', () => {
    const error = normalizeApiError(
      500,
      '<html><body>internal traceback and secrets</body></html>',
    );
    expect(error.message).toBe('Request failed (500).');
    expect(error.message).not.toContain('traceback');
  });
});
