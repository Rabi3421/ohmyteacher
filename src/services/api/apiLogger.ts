import type { ApiLogEntry, ApiLogger } from './apiTypes';

const SENSITIVE_KEY =
  /authorization|token|secret|password|otp|phone|mobile|email|address|date[-_]?of[-_]?birth|birth|(?:^|_)name$|admission[-_]?number|roll[-_]?number|cookie|api[-_]?key/i;

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[^\s,]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:token|otp|phone|mobile|api_key)=)[^&]+/gi, '$1[REDACTED]');
}

export function redactSensitiveData(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (value instanceof Headers) {
    const safe: Record<string, string> = {};
    value.forEach((headerValue, key) => {
      safe[key] = SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactString(headerValue);
    });
    return safe;
  }
  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return '[FORM_DATA]';
  }
  if (Array.isArray(value)) {
    return value.map(item => redactSensitiveData(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key)
        ? '[REDACTED]'
        : redactSensitiveData(item, seen),
    ]),
  );
}

export function createDevelopmentApiLogger(enabled: boolean): ApiLogger | undefined {
  if (!enabled) return undefined;

  return (entry: ApiLogEntry) => {
    console.debug(`[API] ${entry.message}`, redactSensitiveData(entry.data));
  };
}
